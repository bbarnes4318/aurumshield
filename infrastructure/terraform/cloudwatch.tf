# =============================================================================
# CloudWatch Log Group — Explicit creation (not auto-created)
# =============================================================================

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.project_name}-app"
  retention_in_days = 14

  tags = {
    Name = "${var.project_name}-app-logs"
  }
}
