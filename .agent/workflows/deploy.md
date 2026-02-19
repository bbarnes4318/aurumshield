---
description: How to deploy AurumShield to production (AWS ECS via GitHub Actions CI/CD)
---

# AurumShield Production Deployment Workflow

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

## CI/CD Triggers

The GitHub Actions deploy workflow (`.github/workflows/deploy.yml`) fires on:

1. **Push a version tag** (`v*`) — e.g. `git tag v1.2.0 && git push origin v1.2.0`
2. **Manual dispatch** — from GitHub Actions UI (Actions tab → Deploy to AWS ECS → Run workflow)

It does NOT fire on regular pushes to `main`. This is intentional to prevent deploy storms.

---

## Standard App Deployment (Code Changes Only)

Use this when you've made changes to application code (pages, components, libs, styles).

### Step 1: Ensure the build passes locally

// turbo

```
cd c:\Users\jimbo\OneDrive\Desktop\gold && npx next build 2>&1 | Select-Object -Last 20
```

If the build fails, fix all errors before proceeding. Do NOT deploy broken code.

### Step 2: Stage all changes

// turbo

```
cd c:\Users\jimbo\OneDrive\Desktop\gold && git add -A 2>&1; git reset HEAD infrastructure/terraform/tfplan infrastructure/terraform/terraform.tfstate infrastructure/terraform/.terraform 2>$null; git diff --cached --stat 2>&1
```

Always exclude: `tfplan`, `terraform.tfstate`, `.terraform/` directory.

### Step 3: Commit with a descriptive message

```
cd c:\Users\jimbo\OneDrive\Desktop\gold && $ErrorActionPreference='SilentlyContinue'; git commit -m "COMMIT_MESSAGE_HERE" 2>&1; $ErrorActionPreference='Continue'
```

### Step 4: Push to main

```
cd c:\Users\jimbo\OneDrive\Desktop\gold && $ErrorActionPreference='SilentlyContinue'; git push origin main 2>&1; $ErrorActionPreference='Continue'
```

### Step 5: Tag with a version number to trigger CI/CD deploy

```
cd c:\Users\jimbo\OneDrive\Desktop\gold && $ErrorActionPreference='SilentlyContinue'; git tag vX.Y.Z 2>&1; git push origin vX.Y.Z 2>&1; $ErrorActionPreference='Continue'
```

Use semantic versioning. Check the latest tag first:
// turbo

```
cd c:\Users\jimbo\OneDrive\Desktop\gold && git tag --sort=-v:refname | Select-Object -First 5
```

Then increment accordingly (patch for fixes, minor for features, major for breaking changes).

### Step 6: Monitor the GitHub Actions pipeline

// turbo

```
cd c:\Users\jimbo\OneDrive\Desktop\gold && $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User"); gh run list --limit 3 --workflow deploy.yml 2>&1
```

If `gh` is not authenticated, check the pipeline at: `https://github.com/bbarnes4318/aurumshield/actions`

### Step 7: Wait for ECS rollout and verify health

Wait ~3-5 minutes for Docker build + ECR push + ECS rolling update.
// turbo

```
Start-Sleep -Seconds 180; python -m awscli elbv2 describe-target-health --target-group-arn (python -m awscli elbv2 describe-target-groups --names aurumshield-tg --query "TargetGroups[0].TargetGroupArn" --output text --region us-east-2 2>$null) --region us-east-2 --query "TargetHealthDescriptions[*].{Target:Target.Id,Health:TargetHealth.State}" 2>&1
```

Expected: At least 2 targets with `Health: healthy`. During rollout you may see some `draining` (old) and `initial` (new) — that's normal.

### Step 8: Verify the live site

// turbo

```
python -c "import urllib.request; r=urllib.request.urlopen('https://aurumshield.vip/health'); print(r.read().decode())"
```

Expected output: `{"status":"healthy","timestamp":"..."}`

---

## Infrastructure Changes (Terraform)

Use this when modifying anything in `infrastructure/terraform/`.

### Step 1: Validate the Terraform config

// turbo

```
cd c:\Users\jimbo\OneDrive\Desktop\gold\infrastructure\terraform && & "$env:USERPROFILE\tools\terraform\terraform.exe" validate 2>&1
```

### Step 2: Plan to preview changes

```
cd c:\Users\jimbo\OneDrive\Desktop\gold\infrastructure\terraform && & "$env:USERPROFILE\tools\terraform\terraform.exe" plan 2>&1
```

Review the plan carefully. Pay attention to any `destroy` or `replace` actions — these can cause downtime.

**CRITICAL**: If a security group shows `forces replacement`, revert the change that caused it. SG replacement fails because the ALB depends on it. Only add new SG rules as separate resources.

### Step 3: Apply the changes

```
cd c:\Users\jimbo\OneDrive\Desktop\gold\infrastructure\terraform && & "$env:USERPROFILE\tools\terraform\terraform.exe" apply "-auto-approve" 2>&1
```

### Step 4: If infrastructure changes also include app code changes, follow the Standard App Deployment steps above to commit, push, tag, and deploy.

---

## Diagnostics & Troubleshooting

### Check ECS service status

// turbo

```
python -m awscli ecs describe-services --cluster aurumshield-cluster --services aurumshield-app --query "services[0].{status:status,desired:desiredCount,running:runningCount,pending:pendingCount}" --region us-east-2 2>&1
```

### Check target health (ALB → ECS)

// turbo

```
python -m awscli elbv2 describe-target-health --target-group-arn (python -m awscli elbv2 describe-target-groups --names aurumshield-tg --query "TargetGroups[0].TargetGroupArn" --output text --region us-east-2 2>$null) --region us-east-2 --query "TargetHealthDescriptions[*].{Target:Target.Id,Health:TargetHealth.State,Reason:TargetHealth.Reason}" 2>&1
```

### Check ECS service events (last 10)

// turbo

```
python -m awscli ecs describe-services --cluster aurumshield-cluster --services aurumshield-app --query "services[0].events[0:10].[createdAt,message]" --region us-east-2 2>&1
```

### View container logs (latest task)

// turbo

```
$stream = (python -m awscli logs describe-log-streams --log-group-name "/ecs/aurumshield-app" --order-by LastEventTime --descending --max-items 1 --query "logStreams[0].logStreamName" --output text --region us-east-2 2>$null); python -m awscli logs get-log-events --log-group-name "/ecs/aurumshield-app" --log-stream-name $stream --limit 50 --query "events[*].message" --region us-east-2 2>&1
```

### Check running tasks

// turbo

```
$tasks = (python -m awscli ecs list-tasks --cluster aurumshield-cluster --service-name aurumshield-app --query "taskArns" --output text --region us-east-2 2>$null); python -m awscli ecs describe-tasks --cluster aurumshield-cluster --tasks $tasks --query "tasks[*].{taskId:taskArn,status:lastStatus,health:healthStatus,started:startedAt}" --region us-east-2 2>&1
```

### Check stopped tasks (crash debugging)

// turbo

```
$tasks = (python -m awscli ecs list-tasks --cluster aurumshield-cluster --service-name aurumshield-app --desired-status STOPPED --query "taskArns[0:3]" --output text --region us-east-2 2>$null); if ($tasks -ne "None") { python -m awscli ecs describe-tasks --cluster aurumshield-cluster --tasks $tasks --query "tasks[*].{taskId:taskArn,stopCode:stopCode,reason:stoppedReason,exitCode:containers[0].exitCode}" --region us-east-2 2>&1 } else { Write-Output "No stopped tasks found" }
```

### Force a new ECS deployment (without rebuilding image)

```
python -m awscli ecs update-service --cluster aurumshield-cluster --service aurumshield-app --force-new-deployment --region us-east-2 2>&1
```

---

## Common Issues & Solutions

### 503 Service Temporarily Unavailable

- **Cause**: No healthy targets behind ALB. Usually during deploy rollover.
- **Check**: Target health (see diagnostics above)
- **Fix**: Wait 2-3 minutes for new tasks to pass health checks. If persistent, check container logs for crashes.

### Security Group "forces replacement" error

- **Cause**: Changing the `description` field on an SG triggers destroy+recreate, which fails due to ALB dependency.
- **Fix**: NEVER change the `description` of `aws_security_group.alb`. Add new rules as separate `aws_vpc_security_group_ingress_rule` resources instead.

### ACM certificate validation stuck

- **Cause**: Domain nameservers not pointing to Route 53.
- **Fix**: Verify GoDaddy nameservers are set to the 4 AWS Route 53 NS records.
- **Check**: `python -m awscli route53 get-hosted-zone --id Z008104115PTCAFPA62JY --query "DelegationSet.NameServers" --region us-east-2 2>&1`

### Container health check failing

- **Cause**: App not responding on `/health` within the startPeriod (120s).
- **Fix**: Check container logs. The health check uses: `node -e "const http=require('http'); http.get('http://localhost:3000/health', (r) => { process.exit(r.statusCode===200?0:1) }).on('error', () => process.exit(1))"`

### Docker build fails in CI/CD

- **Cause**: Missing dependencies, TypeScript errors, or broken imports.
- **Fix**: Always run `npx next build` locally before tagging a release.

---

## Environment Notes

- **Docker**: NOT installed on the local Windows machine. All Docker builds happen in GitHub Actions (Ubuntu runner).
- **Terraform**: Located at `$env:USERPROFILE\tools\terraform\terraform.exe`
- **AWS CLI**: Invoked via `python -m awscli` (installed as Python package)
- **GitHub CLI**: Installed via winget (`gh`), requires separate authentication
- **Git**: Authenticated via Windows Credential Manager (manager helper)
- **No pager needed**: AWS CLI runs with `--output text` or `--query` for clean output

---

## GoDaddy DNS Configuration (Reference)

Domain: `aurumshield.vip`
Nameservers (custom, pointing to AWS Route 53):

1. `ns-1787.awsdns-31.co.uk`
2. `ns-380.awsdns-47.com`
3. `ns-744.awsdns-29.net`
4. `ns-1218.awsdns-24.org`

DO NOT change these back to GoDaddy defaults or the domain, SSL, and DNS will break.
