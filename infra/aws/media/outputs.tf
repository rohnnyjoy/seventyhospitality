output "media_bucket_name" {
  description = "Name of the Seventy media bucket."
  value       = aws_s3_bucket.media.bucket
}

output "media_bucket_arn" {
  description = "ARN of the Seventy media bucket."
  value       = aws_s3_bucket.media.arn
}
