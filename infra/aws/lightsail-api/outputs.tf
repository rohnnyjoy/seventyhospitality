output "instance_name" {
  description = "Lightsail instance name."
  value       = aws_lightsail_instance.api.name
}

output "static_ip" {
  description = "Static IPv4 address for the API instance."
  value       = aws_lightsail_static_ip.api.ip_address
}

output "public_url" {
  description = "Public HTTP URL for the API."
  value       = "http://${aws_lightsail_static_ip.api.ip_address}"
}

output "media_access_key_id" {
  description = "IAM access key ID for S3 media access from Lightsail."
  value       = aws_iam_access_key.media.id
}

output "media_secret_access_key" {
  description = "IAM secret access key for S3 media access from Lightsail."
  value       = aws_iam_access_key.media.secret
  sensitive   = true
}

output "postgres_password" {
  description = "Generated Postgres password for the Lightsail deployment."
  value       = random_password.postgres.result
  sensitive   = true
}

output "jwt_secret" {
  description = "Generated JWT secret for the Lightsail deployment."
  value       = random_password.jwt.result
  sensitive   = true
}

output "cron_secret" {
  description = "Generated cron secret for the Lightsail deployment."
  value       = random_password.cron.result
  sensitive   = true
}
