# =============================================================================
# Outputs — Capitalized environment variables + infrastructure references
# =============================================================================

output "DATABASE_ENDPOINT" {
  value       = aws_db_instance.main.address
  description = "RDS PostgreSQL endpoint"
}

output "DATABASE_PORT" {
  value       = aws_db_instance.main.port
  description = "RDS PostgreSQL port"
}

output "DATABASE_NAME" {
  value       = var.db_name
  description = "PostgreSQL database name"
}

output "DATABASE_SECRET_ARN" {
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
  description = "ARN of the RDS-managed Secrets Manager secret"
  sensitive   = true
}

output "APP_BASE_URL" {
  value       = "https://${var.domain_name}"
  description = "Application base URL via custom domain"
}

output "AWS_REGION" {
  value       = var.aws_region
  description = "AWS region"
}

output "S3_BUCKET" {
  value       = aws_s3_bucket.documents.id
  description = "S3 document storage bucket name"
}

output "ECS_CLUSTER_NAME" {
  value       = aws_ecs_cluster.main.name
  description = "ECS cluster name"
}

output "ECR_REPOSITORY_URL" {
  value       = aws_ecr_repository.app.repository_url
  description = "ECR repository URL for Docker push"
}

output "ALB_DNS_NAME" {
  value       = aws_lb.main.dns_name
  description = "ALB DNS name"
}

output "GITHUB_ACTIONS_ROLE_ARN" {
  value       = aws_iam_role.github_actions.arn
  description = "IAM role ARN for GitHub Actions OIDC — set as AWS_ROLE_ARN secret in repo"
}

output "ROUTE53_NAMESERVERS" {
  value       = aws_route53_zone.main.name_servers
  description = "Set these as nameservers in GoDaddy for aurumshield.vip"
}

output "DOMAIN" {
  value       = var.domain_name
  description = "Primary domain"
}

# -----------------------------------------------------------------------------
# Third-Party API Key Secret ARNs
# -----------------------------------------------------------------------------

output "MODERN_TREASURY_SECRET_ARN" {
  value       = aws_secretsmanager_secret.modern_treasury.arn
  description = "ARN of the Modern Treasury API key secret"
  sensitive   = true
}

output "VERIFF_SECRET_ARN" {
  value       = aws_secretsmanager_secret.veriff.arn
  description = "ARN of the Veriff API key secret"
  sensitive   = true
}

output "BPIPE_SECRET_ARN" {
  value       = aws_secretsmanager_secret.bpipe.arn
  description = "ARN of the Bloomberg B-PIPE API key secret"
  sensitive   = true
}

output "DOCUSIGN_SECRET_ARN" {
  value       = aws_secretsmanager_secret.docusign.arn
  description = "ARN of the DocuSign API key secret"
  sensitive   = true
}
