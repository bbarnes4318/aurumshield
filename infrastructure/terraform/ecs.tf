# =============================================================================
# ECS — Fargate cluster, task definition, service
#
# Architecture:
#   ALB (public subnets) → ECS Tasks (private subnets) → RDS (private subnets)
#
# ECS tasks have NO public IP. Outbound traffic goes through NAT Gateway.
# =============================================================================

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "disabled"
  }

  tags = {
    Name = "${var.project_name}-cluster"
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project_name}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "${var.project_name}-app"
      image     = "${aws_ecr_repository.app.repository_url}:latest"
      essential = true

      dockerLabels = {
        "com.datadoghq.tags.env"     = "production"
        "com.datadoghq.tags.service" = "aurumshield-core"
        "com.datadoghq.tags.version" = "v3.0.0"
      }

      portMappings = [
        {
          containerPort = var.app_port
          hostPort      = var.app_port
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = tostring(var.app_port)
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "S3_BUCKET"
          value = aws_s3_bucket.documents.id
        },
        {
          name  = "ECS_CLUSTER_NAME"
          value = "${var.project_name}-cluster"
        },
        {
          name  = "DATABASE_HOST"
          value = aws_db_instance.main.address
        },
        {
          name  = "DATABASE_PORT"
          value = tostring(aws_db_instance.main.port)
        },
        {
          name  = "DATABASE_NAME"
          value = var.db_name
        },
        {
          name  = "NEXT_PUBLIC_ROOT_URL"
          value = "https://${var.domain_name}"
        },
        {
          name  = "NEXT_PUBLIC_APP_URL"
          value = "https://app.${var.domain_name}"
        }
      ]

      secrets = [
        {
          name      = "DATABASE_CREDENTIALS"
          valueFrom = aws_db_instance.main.master_user_secret[0].secret_arn
        },
        {
          name      = "MODERN_TREASURY_API_KEY"
          valueFrom = aws_secretsmanager_secret.modern_treasury.arn
        },
        {
          name      = "VERIFF_API_KEY"
          valueFrom = aws_secretsmanager_secret.veriff.arn
        },
        {
          name      = "BPIPE_API_KEY"
          valueFrom = aws_secretsmanager_secret.bpipe.arn
        },
        {
          name      = "DOCUSIGN_API_KEY"
          valueFrom = aws_secretsmanager_secret.docusign.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "node -e \"const http = require('http'); const req = http.get('http://localhost:${var.app_port}${var.health_check_path}', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.setTimeout(3000, () => { req.destroy(); process.exit(1); });\""]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 120
      }
    },
    # -----------------------------------------------------------------
    # Datadog Agent Sidecar — APM, infrastructure monitoring, logs
    # -----------------------------------------------------------------
    {
      name      = "datadog-agent"
      image     = "public.ecr.aws/datadog/agent:latest"
      essential = true

      portMappings = []

      environment = [
        {
          name  = "DD_SITE"
          value = "us5.datadoghq.com"
        },
        {
          name  = "ECS_FARGATE"
          value = "true"
        },
        {
          name  = "DD_APM_ENABLED"
          value = "true"
        },
        {
          name  = "DD_APM_NON_LOCAL_TRAFFIC"
          value = "true"
        },
        {
          name  = "DD_LOGS_ENABLED"
          value = "true"
        },
        {
          name  = "DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL"
          value = "true"
        }
      ]

      secrets = [
        {
          name      = "DD_API_KEY"
          valueFrom = aws_secretsmanager_secret.datadog_api_key.arn
        }
      ]
    }
  ])

  tags = {
    Name = "${var.project_name}-app-task"
  }
}

resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "${var.project_name}-app"
    container_port   = var.app_port
  }

  depends_on = [aws_lb_listener.https]

  # CI/CD updates task_definition independently via update-service
  lifecycle {
    ignore_changes = [task_definition]
  }

  tags = {
    Name = "${var.project_name}-app-service"
  }
}
