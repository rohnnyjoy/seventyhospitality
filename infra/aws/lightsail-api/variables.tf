variable "aws_profile" {
  description = "Optional AWS CLI profile name for Terraform operations."
  type        = string
  default     = "seventy"
}

variable "aws_region" {
  description = "AWS region for the Lightsail API stack."
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

variable "instance_name" {
  description = "Lightsail instance name."
  type        = string
  default     = "seventy-prod-api"
}

variable "blueprint_id" {
  description = "Lightsail blueprint ID."
  type        = string
  default     = "amazon_linux_2023"
}

variable "bundle_id" {
  description = "Lightsail bundle ID."
  type        = string
  default     = "small_3_0"
}

variable "availability_zone" {
  description = "Lightsail availability zone."
  type        = string
  default     = "us-east-1a"
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
