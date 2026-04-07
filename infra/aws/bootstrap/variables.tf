variable "aws_profile" {
  description = "Optional AWS CLI profile name for Terraform operations."
  type        = string
  default     = "seventy"
}

variable "aws_region" {
  description = "AWS region for Terraform bootstrap infrastructure."
  type        = string
  default     = "us-east-1"
}

variable "terraform_state_bucket_name" {
  description = "S3 bucket name for shared Terraform state."
  type        = string
  default     = "seventy-terraform-state-983814062972-us-east-1"
}

variable "terraform_lock_table_name" {
  description = "DynamoDB table name for Terraform state locking."
  type        = string
  default     = "seventy-terraform-locks"
}

variable "project_name" {
  description = "Project tag value."
  type        = string
  default     = "seventy"
}
