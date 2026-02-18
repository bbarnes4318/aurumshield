variable "aws_region" {
  type        = string
  default     = "us-east-2"
  description = "AWS region for all resources"
}

variable "project_name" {
  type        = string
  default     = "aurumshield"
  description = "Project name used as prefix for all resource names"
}

variable "account_id" {
  type        = string
  default     = "974789824146"
  description = "AWS account ID used for globally unique resource names"
}

variable "db_name" {
  type        = string
  default     = "aurumshield"
  description = "PostgreSQL database name"
}

variable "db_username" {
  type        = string
  default     = "aurumshield_admin"
  description = "PostgreSQL master username"
}

variable "app_port" {
  type        = number
  default     = 3000
  description = "Application container port"
}

variable "health_check_path" {
  type        = string
  default     = "/health"
  description = "Health check endpoint path"
}

variable "github_repo" {
  type        = string
  default     = "bbarnes4318/aurumshield"
  description = "GitHub repository in owner/repo format for OIDC trust policy"
}

variable "domain_name" {
  type        = string
  default     = "aurumshield.vip"
  description = "Primary domain name for the application"
}
