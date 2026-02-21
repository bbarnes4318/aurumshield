---
description: How to deploy AurumShield to production (AWS ECS via GitHub Actions CI/CD)
---

# AurumShield Production Deployment Workflow

// turbo-all

## Architecture Overview

- **App**: Next.js 16 (standalone output) in Docker container
- **Hosting**: AWS ECS Fargate (2 tasks, zero-downtime rolling deploys)
- **Container Registry**: AWS ECR (`974789824146.dkr.ecr.us-east-2.amazonaws.com/aurumshield-app`)
- **Load Balancer**: ALB with HTTPS (ACM cert) + HTTP→HTTPS redirect
- **Domain**: `aurumshield.vip` (Route 53, nameservers at GoDaddy)
- **Database**: RDS PostgreSQL 15 (private subnets)
- **CI/CD**: GitHub Actions with OIDC auth (no static keys)
- **Terraform State**: Local at `infrastructure/terraform/terraform.tfstate`
- **IaC Directory**: `infrastructure/terraform/`

## Key Resources

| Resource            | Value                                                            |
| ------------------- | ---------------------------------------------------------------- |
| Live URL            | `https://aurumshield.vip`                                        |
| Health endpoint     | `https://aurumshield.vip/health`                                 |
| AWS Region          | `us-east-2`                                                      |
| ECS Cluster         | `aurumshield-cluster`                                            |
| ECS Service         | `aurumshield-app`                                                |
| ECR Repo            | `974789824146.dkr.ecr.us-east-2.amazonaws.com/aurumshield-app`   |
| GitHub Repo         | `bbarnes4318/aurumshield`                                        |
| GitHub Actions Role | `arn:aws:iam::974789824146:role/aurumshield-github-actions-role` |
| ALB DNS             | `aurumshield-alb-479450326.us-east-2.elb.amazonaws.com`          |
| Route 53 Zone ID    | `Z008104115PTCAFPA62JY`                                          |

---

## ⚠️ CRITICAL RULES — DO NOT VIOLATE ⚠️

These rules exist because violations caused 22+ consecutive deploy failures.

### 1. Dockerfile MUST have `ENV HOSTNAME=0.0.0.0`

```dockerfile
ENV HOSTNAME=0.0.0.0
```

**Why**: Next.js standalone `server.js` binds to the container's internal hostname (e.g. `ip-10-0-4-113.us-east-2.compute.internal`) by default. The ECS health check targets `http://localhost:3000/health`. Without `HOSTNAME=0.0.0.0`, the server does NOT listen on localhost, health checks fail, tasks get killed in a loop.

### 2. ECS service MUST NOT have circuit breaker enabled

**DO NOT** add `deployment_circuit_breaker` with `enable = true` to `ecs.tf`. The circuit breaker falsely marks healthy deployments as FAILED and creates an unrecoverable state.

### 3. ECS service `deployment_minimum_healthy_percent` MUST be `100`

This ensures ECS launches all new tasks BEFORE draining old ones, resulting in fast, clean rollover.

### 4. CI/CD stability check MUST NOT require `deployments == 1`

The stability check in `deploy.yml` checks ONLY `PRIMARY running == desired`. It does NOT wait for old deployments to drain. Old deployments can take 15+ minutes to drain due to ALB deregistration delays. The deploy is successful when the new tasks are up.

### 5. OIDC trust policy MUST use wildcard `*` for repo sub

```hcl
StringLike = {
  "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
}
```

Deploys trigger on tag pushes (`v*`), not branch pushes. The wildcard matches both.

### 6. ECS service MUST have `lifecycle { ignore_changes = [task_definition] }`

CI/CD manages task definitions. Without this, `terraform apply` reverts to the stale task def in the `.tf` file.

### 7. PowerShell uses `;` not `&&`

All commands in this workflow use `;` to chain.

---

## CI/CD Triggers

The GitHub Actions deploy workflow (`.github/workflows/deploy.yml`) fires on:

1. **Push a version tag** (`v*`) — e.g. `git tag v1.2.0; git push origin v1.2.0`
2. **Manual dispatch** — from GitHub Actions UI (Actions tab → Deploy to AWS ECS → Run workflow)

It does NOT fire on regular pushes to `main`.

---

## Standard App Deployment (Code Changes Only)

### Step 1: Ensure the build passes locally

```
npm run build
```

If the build fails, fix all errors before proceeding. Do NOT deploy broken code.

### Step 2: Stage all changes

```
git add -A 2>&1; git reset HEAD infrastructure/terraform/tfplan infrastructure/terraform/terraform.tfstate infrastructure/terraform/.terraform 2>$null; git diff --cached --stat 2>&1
```

Always exclude: `tfplan`, `terraform.tfstate`, `.terraform/` directory.

### Step 3: Commit with a descriptive message

```
$ErrorActionPreference='SilentlyContinue'; git commit -m "COMMIT_MESSAGE_HERE" 2>&1; $ErrorActionPreference='Continue'
```

### Step 4: Push to main

```
$ErrorActionPreference='SilentlyContinue'; git push origin main 2>&1; $ErrorActionPreference='Continue'
```

### Step 5: Tag with a version number to trigger CI/CD deploy

First, check the latest tag:

```
git tag --sort=-v:refname | Select-Object -First 5
```

Then tag and push (replace `vX.Y.Z` with the next version):

```
$ErrorActionPreference='SilentlyContinue'; git tag vX.Y.Z 2>&1; git push origin vX.Y.Z 2>&1; $ErrorActionPreference='Continue'
```

### Step 6: Monitor the GitHub Actions pipeline

```
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User"); gh run list --limit 3 --workflow deploy.yml 2>&1
```

Or check: `https://github.com/bbarnes4318/aurumshield/actions`

### Step 7: Verify health

```
python -c "import urllib.request; r=urllib.request.urlopen('https://aurumshield.vip/health'); print(r.read().decode())"
```

Expected output: `{"status":"healthy","timestamp":"..."}`

---

## Infrastructure Changes (Terraform)

### Step 1: Validate

```
& "$env:USERPROFILE\tools\terraform\terraform.exe" validate 2>&1
```

### Step 2: Plan

```
& "$env:USERPROFILE\tools\terraform\terraform.exe" plan 2>&1
```

**CRITICAL**: If a security group shows `forces replacement`, STOP. SG replacement fails due to ALB dependency.

### Step 3: Apply

```
& "$env:USERPROFILE\tools\terraform\terraform.exe" apply "-auto-approve" 2>&1
```

### Step 4: If app code also changed, follow Standard App Deployment above.

---

## Diagnostics & Troubleshooting

### Check ECS service status

```
$env:PYTHONIOENCODING='utf-8'; python -m awscli ecs describe-services --cluster aurumshield-cluster --services aurumshield-app --query "services[0].{desired:desiredCount,running:runningCount,deployments:deployments[*].{status:status,running:runningCount,desired:desiredCount}}" --output json --region us-east-2 2>&1
```

### Check target health (ALB → ECS)

```
$env:PYTHONIOENCODING='utf-8'; python -m awscli elbv2 describe-target-health --target-group-arn (python -m awscli elbv2 describe-target-groups --names aurumshield-tg --query "TargetGroups[0].TargetGroupArn" --output text --region us-east-2 2>$null) --region us-east-2 --query "TargetHealthDescriptions[*].{Target:Target.Id,Health:TargetHealth.State}" --output json 2>&1
```

### Check ECS service events (last 10)

```
$env:PYTHONIOENCODING='utf-8'; python -m awscli ecs describe-services --cluster aurumshield-cluster --services aurumshield-app --query "services[0].events[0:10].[createdAt,message]" --output text --region us-east-2 2>&1
```

### View container logs (latest task)

```
$env:PYTHONIOENCODING='utf-8'; $streams = (python -m awscli logs describe-log-streams --log-group-name "/ecs/aurumshield-app" --order-by LastEventTime --descending --max-items 1 --query "logStreams[0].logStreamName" --output text --region us-east-2 2>$null); if ($streams -and $streams -ne "None") { python -m awscli logs get-log-events --log-group-name "/ecs/aurumshield-app" --log-stream-name $streams --limit 50 --query "events[*].[timestamp,message]" --output json --region us-east-2 2>&1 } else { Write-Output "No log streams found" }
```

### Force a new ECS deployment (without rebuilding image)

```
python -m awscli ecs update-service --cluster aurumshield-cluster --service aurumshield-app --force-new-deployment --region us-east-2 2>&1
```

---

## Critical File Reference

| File                              | Purpose            | Key Config                                                                                          |
| --------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------- |
| `Dockerfile`                      | Docker image build | `ENV HOSTNAME=0.0.0.0` — MUST exist                                                                 |
| `.github/workflows/deploy.yml`    | CI/CD pipeline     | BuildKit layer caching (`type=gha`), checks `PRIMARY running==desired` (NOT deployments==1)         |
| `infrastructure/terraform/ecs.tf` | ECS service config | `minimumHealthyPercent=100`, NO circuit breaker, `lifecycle { ignore_changes = [task_definition] }` |
| `infrastructure/terraform/iam.tf` | OIDC trust policy  | `sub = "repo:bbarnes4318/aurumshield:*"` (wildcard)                                                 |
| `next.config.ts`                  | Next.js config     | `output: "standalone"` — required for Docker                                                        |
| `src/app/health/route.ts`         | Health endpoint    | Returns `{"status":"healthy"}` on GET                                                               |

## ECS Deployment Configuration (Current)

| Setting                              | Value    | Rationale                                     |
| ------------------------------------ | -------- | --------------------------------------------- |
| `desired_count`                      | 2        | Two tasks for availability                    |
| `deployment_minimum_healthy_percent` | 100      | All new tasks start before old drain          |
| `deployment_maximum_percent`         | 200      | Allows 4 tasks during rollover                |
| `deployment_circuit_breaker`         | DISABLED | Was causing false failures on healthy deploys |
| `healthCheck.startPeriod`            | 120s     | 2 min before health checks count              |
| `healthCheck.interval`               | 30s      | Polls every 30s                               |
| `healthCheck.retries`                | 3        | 3 failures = unhealthy                        |

---

## Environment Notes

- **Docker**: NOT installed on the local Windows machine. All Docker builds happen in GitHub Actions (Ubuntu runner).
- **Terraform**: Located at `$env:USERPROFILE\tools\terraform\terraform.exe`
- **AWS CLI**: Invoked via `python -m awscli` (installed as Python package). ALWAYS set `$env:PYTHONIOENCODING='utf-8'` before any AWS CLI call.
- **GitHub CLI**: Installed via winget (`gh`), requires separate authentication
- **Git**: Authenticated via Windows Credential Manager (manager helper)
- **PowerShell**: Does NOT support `&&` operator. Use `;` to chain commands.

---

## GoDaddy DNS Configuration (Reference)

Domain: `aurumshield.vip`
Nameservers (custom, pointing to AWS Route 53):

1. `ns-1787.awsdns-31.co.uk`
2. `ns-380.awsdns-47.com`
3. `ns-744.awsdns-29.net`
4. `ns-1218.awsdns-24.org`

DO NOT change these back to GoDaddy defaults or the domain, SSL, and DNS will break.
