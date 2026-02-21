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

These rules exist because violations caused 19 consecutive deploy failures. Read them before touching ANY deploy-related config.

### 1. Dockerfile MUST have `HOSTNAME=0.0.0.0`

The `Dockerfile` production runner stage MUST contain:

```dockerfile
ENV HOSTNAME=0.0.0.0
```

**Why**: Next.js standalone `server.js` binds to the container's internal hostname (e.g. `ip-10-0-4-113.us-east-2.compute.internal`) by default. The ECS container health check hits `http://localhost:3000/health`. Without `HOSTNAME=0.0.0.0`, the server does NOT listen on `127.0.0.1`/`localhost`, so the health check is refused, the task is killed, and the deploy loops forever.

**If you remove this line, EVERY deploy will fail with "failed container health checks".**

### 2. ECS Deployment Circuit Breaker MUST be enabled

In `infrastructure/terraform/ecs.tf`, the `aws_ecs_service` MUST have:

```hcl
deployment_circuit_breaker {
  enable   = true
  rollback = true
}
```

**Why**: Without this, a failed deployment keeps cycling unhealthy tasks forever. Each new deploy stacks another deployment on top. With 3+ stale deployments, the service can never stabilize and the CI/CD check times out every time.

### 3. OIDC trust policy MUST use wildcard for repo sub

In `infrastructure/terraform/iam.tf`, the GitHub Actions OIDC condition MUST be:

```hcl
StringLike = {
  "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
}
```

**Why**: CI/CD triggers on tag pushes (`v*`). A tag push produces a sub like `repo:bbarnes4318/aurumshield:ref:refs/tags/v1.13.0`. If the trust policy is locked to `ref:refs/heads/main`, ALL tag-based deploys will fail at OIDC auth. The wildcard `:*` matches both branches and tags.

### 4. CI/CD stabilization checks rolloutState, NOT deployment count

The `.github/workflows/deploy.yml` stability check polls `rolloutState`:

- `COMPLETED` → success (exit 0)
- `FAILED` → circuit breaker triggered rollback (exit 1)
- `IN_PROGRESS` → keep polling

**Why**: The old check waited for `deployments == 1` (only PRIMARY left). With stale deployments from previous failures, there can be 3+ deployments draining simultaneously. Deployment count never reaches 1 within the timeout, so every deploy is reported as failed even when the app is healthy.

### 5. ECS service has `lifecycle { ignore_changes = [task_definition] }`

In `infrastructure/terraform/ecs.tf`:

```hcl
lifecycle {
  ignore_changes = [task_definition]
}
```

**Why**: CI/CD creates new task definition revisions and updates the service. If Terraform also manages `task_definition`, running `terraform apply` will revert the service to the stale revision in the `.tf` file, undoing the CI/CD deploy and potentially causing downtime.

### 6. PowerShell does NOT support `&&` — use `;` instead

All commands in this workflow use `;` to chain, not `&&`. PowerShell treats `&&` as a parse error.

---

## CI/CD Triggers

The GitHub Actions deploy workflow (`.github/workflows/deploy.yml`) fires on:

1. **Push a version tag** (`v*`) — e.g. `git tag v1.2.0; git push origin v1.2.0`
2. **Manual dispatch** — from GitHub Actions UI (Actions tab → Deploy to AWS ECS → Run workflow)

It does NOT fire on regular pushes to `main`. This is intentional to prevent deploy storms.

---

## Standard App Deployment (Code Changes Only)

Use this when you've made changes to application code (pages, components, libs, styles).

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

Use semantic versioning: patch for fixes, minor for features, major for breaking changes.

### Step 6: Monitor the GitHub Actions pipeline

```
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User"); gh run list --limit 3 --workflow deploy.yml 2>&1
```

If `gh` is not authenticated, check the pipeline at: `https://github.com/bbarnes4318/aurumshield/actions`

### Step 7: Wait for ECS rollout and verify health

Wait ~5-7 minutes for Docker build + ECR push + ECS rolling update.

```
Start-Sleep -Seconds 300; $env:PYTHONIOENCODING='utf-8'; python -m awscli ecs describe-services --cluster aurumshield-cluster --services aurumshield-app --query "services[0].{desired:desiredCount,running:runningCount,deployments:deployments[*].{status:status,rollout:rolloutState,running:runningCount,desired:desiredCount}}" --output json --region us-east-2 2>&1
```

**Expected**: PRIMARY rollout = `COMPLETED` or `IN_PROGRESS` with running == desired.
**If `FAILED`**: Circuit breaker triggered auto-rollback. Check container logs (see diagnostics).

Then check ALB target health:

```
$env:PYTHONIOENCODING='utf-8'; python -m awscli elbv2 describe-target-health --target-group-arn (python -m awscli elbv2 describe-target-groups --names aurumshield-tg --query "TargetGroups[0].TargetGroupArn" --output text --region us-east-2 2>$null) --region us-east-2 --query "TargetHealthDescriptions[*].{Target:Target.Id,Health:TargetHealth.State}" --output json 2>&1
```

Expected: At least 2 targets with `Health: healthy`. During rollout you may see `draining` (old) and `initial` (new) — that's normal.

### Step 8: Verify the live site

```
python -c "import urllib.request; r=urllib.request.urlopen('https://aurumshield.vip/health'); print(r.read().decode())"
```

Expected output: `{"status":"healthy","timestamp":"..."}`

---

## Infrastructure Changes (Terraform)

Use this when modifying anything in `infrastructure/terraform/`.

### Step 1: Validate the Terraform config

```
& "$env:USERPROFILE\tools\terraform\terraform.exe" validate 2>&1
```

### Step 2: Plan to preview changes

```
& "$env:USERPROFILE\tools\terraform\terraform.exe" plan 2>&1
```

Review the plan carefully. Pay attention to any `destroy` or `replace` actions — these can cause downtime.

**CRITICAL**: If a security group shows `forces replacement`, revert the change that caused it. SG replacement fails because the ALB depends on it. Only add new SG rules as separate `aws_vpc_security_group_ingress_rule` resources instead.

**CRITICAL**: If the OIDC trust policy `StringLike.sub` is being changed to anything other than `repo:bbarnes4318/aurumshield:*`, STOP. This will break tag-based deploys. See Critical Rule #3 above.

### Step 3: Apply the changes

```
& "$env:USERPROFILE\tools\terraform\terraform.exe" apply "-auto-approve" 2>&1
```

### Step 4: If infrastructure changes also include app code changes, follow the Standard App Deployment steps above to commit, push, tag, and deploy.

---

## Diagnostics & Troubleshooting

### Check ECS service status + deployment rollout state

```
$env:PYTHONIOENCODING='utf-8'; python -m awscli ecs describe-services --cluster aurumshield-cluster --services aurumshield-app --query "services[0].{status:status,desired:desiredCount,running:runningCount,pending:pendingCount,deployments:deployments[*].{status:status,rollout:rolloutState,running:runningCount,desired:desiredCount}}" --output json --region us-east-2 2>&1
```

### Check target health (ALB → ECS)

```
$env:PYTHONIOENCODING='utf-8'; python -m awscli elbv2 describe-target-health --target-group-arn (python -m awscli elbv2 describe-target-groups --names aurumshield-tg --query "TargetGroups[0].TargetGroupArn" --output text --region us-east-2 2>$null) --region us-east-2 --query "TargetHealthDescriptions[*].{Target:Target.Id,Health:TargetHealth.State,Reason:TargetHealth.Reason}" --output json 2>&1
```

### Check ECS service events (last 10)

```
$env:PYTHONIOENCODING='utf-8'; python -m awscli ecs describe-services --cluster aurumshield-cluster --services aurumshield-app --query "services[0].events[0:10].[createdAt,message]" --output text --region us-east-2 2>&1
```

### View container logs (latest task)

```
$env:PYTHONIOENCODING='utf-8'; $streams = (python -m awscli logs describe-log-streams --log-group-name "/ecs/aurumshield-app" --order-by LastEventTime --descending --max-items 1 --query "logStreams[0].logStreamName" --output text --region us-east-2 2>$null); if ($streams -and $streams -ne "None") { python -m awscli logs get-log-events --log-group-name "/ecs/aurumshield-app" --log-stream-name $streams --limit 50 --query "events[*].[timestamp,message]" --output json --region us-east-2 2>&1 } else { Write-Output "No log streams found" }
```

**Note**: Container logs may contain Unicode characters (▲, ✓) that cause `'charmap' codec` errors. Always set `$env:PYTHONIOENCODING='utf-8'` before AWS CLI calls. Use `--output json` or `--output text` to avoid rendering issues.

### Check running tasks

```
$env:PYTHONIOENCODING='utf-8'; $taskArns = (python -m awscli ecs list-tasks --cluster aurumshield-cluster --service-name aurumshield-app --query "taskArns" --output json --region us-east-2 2>$null); python -m awscli ecs describe-tasks --cluster aurumshield-cluster --tasks $taskArns --query "tasks[*].{taskId:taskArn,status:lastStatus,health:healthStatus,started:startedAt}" --output json --region us-east-2 2>&1
```

### Check stopped tasks (crash debugging)

```
$env:PYTHONIOENCODING='utf-8'; $taskArns = (python -m awscli ecs list-tasks --cluster aurumshield-cluster --service-name aurumshield-app --desired-status STOPPED --query "taskArns[0:3]" --output json --region us-east-2 2>$null); $parsed = $taskArns | ConvertFrom-Json; if ($parsed.Count -gt 0) { python -m awscli ecs describe-tasks --cluster aurumshield-cluster --tasks $taskArns --query "tasks[*].{stopCode:stopCode,reason:stoppedReason,exitCode:containers[0].exitCode,health:healthStatus}" --output json --region us-east-2 2>&1 } else { Write-Output "No stopped tasks found" }
```

### Force a new ECS deployment (without rebuilding image)

```
python -m awscli ecs update-service --cluster aurumshield-cluster --service aurumshield-app --force-new-deployment --region us-east-2 2>&1
```

---

## Common Issues & Solutions

### Container health check failing (tasks killed in loop)

- **Symptom**: Tasks start, show `Ready in Xms` in logs, then get killed for "failed container health checks"
- **Root Cause**: `HOSTNAME=0.0.0.0` missing from Dockerfile. Next.js binds to container hostname, not localhost.
- **Fix**: Ensure `Dockerfile` has `ENV HOSTNAME=0.0.0.0` in the runner stage. Rebuild and redeploy.
- **Health check command**: `node -e "const http = require('http'); const req = http.get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.setTimeout(3000, () => { req.destroy(); process.exit(1); });"`
- **Verify locally**: The server log should show `Local: http://0.0.0.0:3000` (not a hostname like `ip-10-0-x-x`)

### CI/CD reports deploy failure but app is actually running fine

- **Symptom**: GitHub Actions "Wait for deployment to stabilize" step times out, but `aurumshield.vip` is healthy
- **Root Cause**: Stale deployments from previous failures never drained. Old stabilization logic waited for `deployments == 1`.
- **Fix**: The updated `deploy.yml` checks `rolloutState` (COMPLETED/FAILED) instead of deployment count. If this happens again, check for stale deployments and wait for the circuit breaker to drain them.

### 503 Service Temporarily Unavailable

- **Cause**: No healthy targets behind ALB. Usually during deploy rollover.
- **Check**: Target health (see diagnostics above)
- **Fix**: Wait 2-3 minutes for new tasks to pass health checks. If persistent, check container logs.

### Security Group "forces replacement" error

- **Cause**: Changing the `description` field on an SG triggers destroy+recreate, which fails due to ALB dependency.
- **Fix**: NEVER change the `description` of `aws_security_group.alb`. Add new rules as separate `aws_vpc_security_group_ingress_rule` resources instead.

### OIDC auth fails on tag push ("Not authorized to perform sts:AssumeRoleWithWebIdentity")

- **Cause**: OIDC trust policy in `iam.tf` is locked to `refs/heads/main` instead of wildcard.
- **Fix**: Set the sub condition to `"repo:bbarnes4318/aurumshield:*"` and `terraform apply`.

### ACM certificate validation stuck

- **Cause**: Domain nameservers not pointing to Route 53.
- **Fix**: Verify GoDaddy nameservers are set to the 4 AWS Route 53 NS records.
- **Check**: `python -m awscli route53 get-hosted-zone --id Z008104115PTCAFPA62JY --query "DelegationSet.NameServers" --region us-east-2 2>&1`

### Docker build fails in CI/CD

- **Cause**: Missing dependencies, TypeScript errors, or broken imports.
- **Fix**: Always run `npm run build` locally before tagging a release.

---

## Critical File Reference

| File                              | Purpose            | Key Config                                                      |
| --------------------------------- | ------------------ | --------------------------------------------------------------- |
| `Dockerfile`                      | Docker image build | `ENV HOSTNAME=0.0.0.0` — MUST exist                             |
| `.github/workflows/deploy.yml`    | CI/CD pipeline     | Checks `rolloutState` for COMPLETED/FAILED                      |
| `infrastructure/terraform/ecs.tf` | ECS service config | `deployment_circuit_breaker { enable = true, rollback = true }` |
| `infrastructure/terraform/iam.tf` | OIDC trust policy  | `sub = "repo:bbarnes4318/aurumshield:*"` (wildcard)             |
| `next.config.ts`                  | Next.js config     | `output: "standalone"` — required for Docker                    |
| `src/app/health/route.ts`         | Health endpoint    | Returns `{"status":"healthy"}` on GET                           |

## ECS Deployment Configuration (Current)

| Setting                               | Value | Rationale                                           |
| ------------------------------------- | ----- | --------------------------------------------------- |
| `desired_count`                       | 2     | Two tasks for availability                          |
| `deployment_minimum_healthy_percent`  | 50    | Allows 1 task to drain during rolling update        |
| `deployment_maximum_percent`          | 200   | Allows 2 new tasks + 2 old tasks during rollover    |
| `deployment_circuit_breaker.enable`   | true  | Auto-stops failed deployments                       |
| `deployment_circuit_breaker.rollback` | true  | Auto-rolls back to last working revision            |
| `healthCheck.startPeriod`             | 120s  | Gives app 2 min to start before health checks count |
| `healthCheck.interval`                | 30s   | Polls every 30s                                     |
| `healthCheck.retries`                 | 3     | 3 failures = unhealthy                              |

---

## Environment Notes

- **Docker**: NOT installed on the local Windows machine. All Docker builds happen in GitHub Actions (Ubuntu runner).
- **Terraform**: Located at `$env:USERPROFILE\tools\terraform\terraform.exe`
- **AWS CLI**: Invoked via `python -m awscli` (installed as Python package). ALWAYS set `$env:PYTHONIOENCODING='utf-8'` before any AWS CLI call to avoid charmap codec errors.
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
