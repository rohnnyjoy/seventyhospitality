terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket         = "seventy-terraform-state-983814062972-us-east-1"
    key            = "aws/api/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "seventy-terraform-locks"
    encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}
