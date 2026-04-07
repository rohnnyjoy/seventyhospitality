variable "aws_profile" {
  description = "Optional AWS CLI profile name for Terraform operations."
  type        = string
  default     = "seventy"
}

variable "aws_region" {
  description = "AWS region that hosts the Seventy media bucket."
  type        = string
  default     = "us-east-1"
}

variable "media_bucket_name" {
  description = "S3 bucket name for Seventy media uploads."
  type        = string
  default     = "seventy-media-983814062972-us-east-1"
}

variable "project_name" {
  description = "Project tag value."
  type        = string
  default     = "seventy"
}

variable "environment_name" {
  description = "Environment tag value for this stack."
  type        = string
  default     = "shared"
}
