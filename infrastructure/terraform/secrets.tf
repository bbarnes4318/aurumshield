# =============================================================================
# Secrets Manager — Third-party API keys
#
# These create the SECRET SHELL only. Actual values must be set manually
# in the AWS Console or via CLI after `terraform apply`.
#
# The app fetches these at runtime via ECS secret injection.
# They must NEVER exist in code or Terraform state.
# =============================================================================

resource "aws_secretsmanager_secret" "modern_treasury" {
  name        = "${var.project_name}/modern-treasury"
  description = "Modern Treasury API credentials"

  tags = {
    Name = "${var.project_name}-modern-treasury-secret"
  }
}

resource "aws_secretsmanager_secret" "veriff" {
  name        = "${var.project_name}/veriff"
  description = "Veriff identity verification API credentials"

  tags = {
    Name = "${var.project_name}-veriff-secret"
  }
}

resource "aws_secretsmanager_secret" "bpipe" {
  name        = "${var.project_name}/bpipe"
  description = "Bloomberg B-PIPE market data feed credentials"

  tags = {
    Name = "${var.project_name}-bpipe-secret"
  }
}

resource "aws_secretsmanager_secret" "docusign" {
  name        = "${var.project_name}/docusign"
  description = "DocuSign e-signature API credentials"

  tags = {
    Name = "${var.project_name}-docusign-secret"
  }
}

# -----------------------------------------------------------------------------
# Observability — Datadog
# -----------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "datadog_api_key" {
  name        = "${var.project_name}/production/datadog-api-key"
  description = "Datadog API key for APM, infrastructure monitoring and log management"

  tags = {
    Name = "${var.project_name}-datadog-api-key-secret"
  }
}
