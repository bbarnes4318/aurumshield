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

The pipeline will:
- Build the Docker image with `.env.production` baked in
- Push to ECR
- Register a new ECS task definition revision
- Deploy to the `aurumshield-cluster` service
- Wait for stabilization (up to 15 minutes)
