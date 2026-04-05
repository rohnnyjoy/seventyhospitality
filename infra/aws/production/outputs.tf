output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "apprunner_url" {
  value = aws_apprunner_service.api.service_url
}

output "apprunner_arn" {
  value = aws_apprunner_service.api.arn
}

output "rds_endpoint" {
  value = aws_rds_instance.main.endpoint
}

output "database_url" {
  value     = local.database_url
  sensitive = true
}
