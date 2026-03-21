# AWS ECS Blue/Green Deployment — Infrastructure Playbook

> **Purpose**: Step-by-step instructions for a DevOps operator to provision the AWS infrastructure required for CodeDeploy Blue/Green ECS deployments. These are **one-time** manual setup steps that cannot be automated via the CI/CD pipeline.

> [!CAUTION]
> Do NOT proceed until you have a working rolling-update deployment. This guide converts an existing ECS service to Blue/Green. If the service doesn't exist yet, create it first using standard ECS Fargate setup.

---

## Prerequisites

| Resource | Current Value |
|---|---|
| AWS Region | `us-east-2` |
| ECS Cluster | `aurumshield-cluster` |
| ECS Service | `aurumshield-app` |
| ECR Repository | `aurumshield-app` |
| ALB Name | *(your existing ALB)* |
| Production Listener | Port 443 (HTTPS) |
| Existing Target Group | `aurumshield-tg-blue` (or rename your current TG) |

---

## Step 1: Create the Green Target Group

The Blue/Green model requires **two** Target Groups. Your existing TG becomes "Blue" (production). You must create a second "Green" TG for the replacement task set.

```bash
aws elbv2 create-target-group \
  --name aurumshield-tg-green \
  --protocol HTTP \
  --port 3000 \
  --vpc-id <YOUR_VPC_ID> \
  --target-type ip \
  --health-check-path "/" \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region us-east-2
```

**Record the Green Target Group ARN** — you'll need it in Step 3.

> [!IMPORTANT]
> The Green TG must have **identical** settings to the Blue TG: same VPC, same protocol (HTTP), same port (3000), same health check path. Only the name differs.

---

## Step 2: Add Test Listener (Optional but Recommended)

A test listener lets you validate the Green deployment before cutting production traffic. Add a listener on port **8443** (or any unused port):

```bash
aws elbv2 create-listener \
  --load-balancer-arn <YOUR_ALB_ARN> \
  --protocol HTTP \
  --port 8443 \
  --default-actions Type=forward,TargetGroupArn=<GREEN_TG_ARN> \
  --region us-east-2
```

This is optional — if omitted, CodeDeploy will cut traffic immediately without a test phase.

---

## Step 3: Create the CodeDeploy Application

```bash
aws deploy create-application \
  --application-name aurumshield-bluegreen \
  --compute-platform ECS \
  --region us-east-2
```

---

## Step 4: Create the IAM Service Role for CodeDeploy

CodeDeploy needs an IAM role with ECS and ELB permissions.

### 4a. Create the trust policy file

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codedeploy.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Save as `codedeploy-trust-policy.json`.

### 4b. Create the role

```bash
aws iam create-role \
  --role-name AurumShieldCodeDeployRole \
  --assume-role-policy-document file://codedeploy-trust-policy.json

aws iam attach-role-policy \
  --role-name AurumShieldCodeDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS
```

**Record the Role ARN**: `arn:aws:iam::<ACCOUNT_ID>:role/AurumShieldCodeDeployRole`

---

## Step 5: Create the CodeDeploy Deployment Group

This is the critical step that wires everything together.

```bash
aws deploy create-deployment-group \
  --application-name aurumshield-bluegreen \
  --deployment-group-name aurumshield-bluegreen-dg \
  --service-role-arn arn:aws:iam::<ACCOUNT_ID>:role/AurumShieldCodeDeployRole \
  --deployment-config-name CodeDeployDefault.ECSAllAtOnce \
  --ecs-services clusterName=aurumshield-cluster,serviceName=aurumshield-app \
  --load-balancer-info "targetGroupPairInfoList=[{targetGroups=[{name=aurumshield-tg-blue},{name=aurumshield-tg-green}],prodTrafficRoute={listenerArns=[<PROD_LISTENER_ARN>]}}]" \
  --blue-green-deployment-configuration "terminateBlueInstancesOnDeploymentSuccess={action=TERMINATE,terminationWaitTimeInMinutes=5},deploymentReadyOption={actionOnTimeout=CONTINUE_DEPLOYMENT,waitTimeInMinutes=0}" \
  --auto-rollback-configuration "enabled=true,events=[DEPLOYMENT_FAILURE,DEPLOYMENT_STOP_ON_REQUEST]" \
  --region us-east-2
```

### Parameter Breakdown

| Parameter | Value | Purpose |
|---|---|---|
| `deployment-config-name` | `CodeDeployDefault.ECSAllAtOnce` | Atomic cutover (no canary) |
| `terminationWaitTimeInMinutes` | `5` | Blue instances drain for 5 min after cutover |
| `actionOnTimeout` | `CONTINUE_DEPLOYMENT` | Auto-cutover without manual approval |
| `waitTimeInMinutes` | `0` | No wait before traffic shift (set >0 for manual approval window) |
| `auto-rollback` | `DEPLOYMENT_FAILURE` | Auto-rollback on failure |

> [!WARNING]
> If you want a **manual approval step** before traffic cutover, set `actionOnTimeout=STOP_DEPLOYMENT` and `waitTimeInMinutes=60`. This gives you 60 minutes to validate the Green environment via the test listener before approving.

---

## Step 6: Modify the ECS Service Deployment Controller

Your existing ECS service uses the `ECS` (rolling update) deployment controller. You **cannot** change this in-place — you must recreate the service.

### 6a. Export the current service configuration

```bash
aws ecs describe-services \
  --cluster aurumshield-cluster \
  --services aurumshield-app \
  --region us-east-2 \
  --query 'services[0]' \
  --output json > current-service.json
```

### 6b. Delete the existing service

```bash
aws ecs update-service \
  --cluster aurumshield-cluster \
  --service aurumshield-app \
  --desired-count 0 \
  --region us-east-2

# Wait for tasks to drain, then:
aws ecs delete-service \
  --cluster aurumshield-cluster \
  --service aurumshield-app \
  --region us-east-2
```

> [!CAUTION]
> This causes **downtime**. Schedule this during a maintenance window. The service will be unavailable from the moment you delete it until the new service is created and healthy.

### 6c. Recreate with CODE_DEPLOY controller

```bash
aws ecs create-service \
  --cluster aurumshield-cluster \
  --service-name aurumshield-app \
  --task-definition aurumshield-app \
  --desired-count 1 \
  --deployment-controller type=CODE_DEPLOY \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<SUBNET_1>,<SUBNET_2>],securityGroups=[<SG_ID>],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=<BLUE_TG_ARN>,containerName=aurumshield-app,containerPort=3000" \
  --region us-east-2
```

---

## Step 7: Update GitHub Actions OIDC Role Permissions

The GitHub Actions IAM role needs additional permissions for CodeDeploy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codedeploy:CreateDeployment",
        "codedeploy:GetDeployment",
        "codedeploy:GetDeploymentConfig",
        "codedeploy:RegisterApplicationRevision"
      ],
      "Resource": [
        "arn:aws:codedeploy:us-east-2:<ACCOUNT_ID>:application:aurumshield-bluegreen",
        "arn:aws:codedeploy:us-east-2:<ACCOUNT_ID>:deploymentgroup:aurumshield-bluegreen/aurumshield-bluegreen-dg",
        "arn:aws:codedeploy:us-east-2:<ACCOUNT_ID>:deploymentconfig:*"
      ]
    }
  ]
}
```

Attach this as an inline policy to your existing GitHub Actions OIDC role.

---

## Step 8: Validate

1. Push a new tag (`v1.x.x`) to trigger the pipeline
2. In the AWS Console, go to **CodeDeploy → Deployments**
3. Verify the deployment creates a Green task set
4. Verify traffic cuts over atomically
5. Verify the Blue task set terminates after the 5-minute drain

---

## Rollback

If a deployment fails, CodeDeploy automatically rolls back (per the `auto-rollback-configuration`). To manually roll back:

```bash
aws deploy stop-deployment \
  --deployment-id <DEPLOYMENT_ID> \
  --auto-rollback-enabled \
  --region us-east-2
```

This will reroute traffic back to the Blue (original) task set.
