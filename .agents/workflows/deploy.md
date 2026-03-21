---
description: How to deploy AurumShield to production (AWS ECS via GitHub Actions CI/CD)
---

// turbo-all

## Deploy to Production

1. Stage all changes:
```
git add -A
```

2. Commit with a descriptive message:
```
git commit -m "<your commit message>"
```

3. Get the latest tag and bump the patch version:
```powershell
$latest = git tag --sort=-version:refname | Select-Object -First 1; $parts = $latest.TrimStart('v').Split('.'); $parts[2] = [int]$parts[2] + 1; $newTag = "v$($parts -join '.')"; git tag $newTag; Write-Host "Tagged: $newTag"
```

4. Push to main with tags (triggers the GitHub Actions CI/CD pipeline):
```
git push origin main --tags
```

The pipeline (`.github/workflows/deploy.yml`) will:
- Build the Docker image with `.env.production` baked in
- Push to ECR (`974789824146.dkr.ecr.us-east-2.amazonaws.com/aurumshield`)
- Register a new ECS task definition revision (container health check auto-stripped)
- Trigger an **AWS CodeDeploy Blue/Green deployment** (`aurumshield-bluegreen` / `aurumshield-bluegreen-dg`)
- Spin up replacement tasks on the Green target group
- Atomically cut ALB traffic from Blue → Green once health checks pass
- Poll for completion (up to 30 minutes)

### Key Infrastructure Details
- **Cluster**: `aurumshield-cluster`
- **Service**: `aurumshield-app` (CODE_DEPLOY deployment controller)
- **Blue TG**: `aurumshield-tg` (port 443)
- **Green TG**: `aurumshield-tg-green` (port 443)
- **CodeDeploy App**: `aurumshield-bluegreen`
- **Deployment Group**: `aurumshield-bluegreen-dg`
- **IAM Role**: `AurumShieldCodeDeployRole`
- **Region**: `us-east-2`

### If a Deployment Fails
The container health check has been removed from the ECS task definition to prevent startup 503s from killing tasks (the `/health` endpoint does a deep DB check). The ALB target group health check is the sole arbiter of task health.

If a deployment still fails, check:
1. ECS events: `aws ecs describe-services --cluster aurumshield-cluster --services aurumshield-app --region us-east-2 --query "services[0].events[:5]"`
2. Stopped task reason: `aws ecs list-tasks --cluster aurumshield-cluster --desired-status STOPPED --region us-east-2` then `aws ecs describe-tasks --cluster aurumshield-cluster --tasks <arn> --region us-east-2`
3. CodeDeploy status: `aws deploy get-deployment --deployment-id <id> --region us-east-2`

Full setup playbook: `docs/blue-green-setup.md`
