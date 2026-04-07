provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile != "" ? var.aws_profile : null

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment_name
      Component   = "media"
      ManagedBy   = "terraform"
    }
  }
}

resource "aws_s3_bucket" "media" {
  bucket = var.media_bucket_name
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

import {
  to = aws_s3_bucket.media
  id = "seventy-media-983814062972-us-east-1"
}

import {
  to = aws_s3_bucket_public_access_block.media
  id = "seventy-media-983814062972-us-east-1"
}

import {
  to = aws_s3_bucket_server_side_encryption_configuration.media
  id = "seventy-media-983814062972-us-east-1"
}
