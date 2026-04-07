variable "aws_profile" {
  description = "Optional AWS CLI profile name for Terraform operations."
  type        = string
  default     = "seventy"
}

variable "aws_region" {
  description = "AWS region for the Seventy API stack."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project tag value."
  type        = string
  default     = "seventy"
}

variable "environment_name" {
  description = "Environment tag value for this stack."
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  description = "CIDR block for the application VPC."
  type        = string
  default     = "10.42.0.0/16"
}

variable "app_port" {
  description = "Container port exposed by the API."
  type        = number
  default     = 3001
}

variable "api_cpu" {
  description = "CPU units for the Fargate task."
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Memory (MiB) for the Fargate task."
  type        = number
  default     = 1024
}

variable "api_desired_count" {
  description = "Desired number of API tasks."
  type        = number
  default     = 1
}

variable "api_image_tag" {
  description = "Container image tag to deploy."
  type        = string
  default     = "latest"
}

variable "db_name" {
  description = "Primary Postgres database name."
  type        = string
  default     = "seventy"
}

variable "db_username" {
  description = "Primary Postgres username."
  type        = string
  default     = "seventy"
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Allocated RDS storage in GiB."
  type        = number
  default     = 20
}

variable "db_backup_retention_period" {
  description = "Automated backup retention period in days."
  type        = number
  default     = 7
}

variable "skip_final_snapshot" {
  description = "Whether to skip a final snapshot on destroy."
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Whether deletion protection is enabled on the database."
  type        = bool
  default     = false
}

variable "media_bucket_name" {
  description = "Existing S3 bucket for media uploads."
  type        = string
  default     = "seventy-media-983814062972-us-east-1"
}

variable "media_s3_prefix" {
  description = "Optional object key prefix for media assets."
  type        = string
  default     = ""
}

variable "web_url" {
  description = "Public URL of the Seventy web/admin frontend."
  type        = string
  default     = ""
}

variable "public_base_url" {
  description = "Optional explicit public base URL for API-generated links."
  type        = string
  default     = ""
}

variable "auth_disabled" {
  description = "Whether to disable API auth checks."
  type        = bool
  default     = false
}

variable "stripe_secret_key" {
  description = "Stripe secret key for membership/checkout flows."
  type        = string
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret."
  type        = string
  sensitive   = true
}

variable "resend_api_key" {
  description = "Resend API key for transactional email."
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Optional explicit JWT secret. Leave empty to generate one."
  type        = string
  default     = ""
  sensitive   = true
}

variable "cron_secret" {
  description = "Optional explicit cron auth secret. Leave empty to generate one."
  type        = string
  default     = ""
  sensitive   = true
}

variable "cleanup_schedule_expression" {
  description = "EventBridge Scheduler expression for stale event-image cleanup."
  type        = string
  default     = "rate(1 day)"
}
