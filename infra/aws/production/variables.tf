variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "aws_profile" {
  type    = string
  default = ""
}

variable "project" {
  type    = string
  default = "seventy"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "admin_domain" {
  type    = string
  default = "admin.club70.nyc"
}

# Secrets passed via environment or tfvars
variable "stripe_secret_key" {
  type      = string
  sensitive = true
}

variable "stripe_webhook_secret" {
  type      = string
  sensitive = true
}

variable "resend_api_key" {
  type      = string
  sensitive = true
}

locals {
  prefix = "${var.project}-${var.environment}"
}
