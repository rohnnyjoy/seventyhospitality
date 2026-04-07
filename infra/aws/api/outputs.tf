output "api_url" {
  description = "Public URL for the Seventy API load balancer."
  value       = "http://${aws_lb.api.dns_name}"
}

output "alb_dns_name" {
  description = "Raw ALB DNS name."
  value       = aws_lb.api.dns_name
}

output "ecr_repository_url" {
  description = "ECR repository URL for the API image."
  value       = aws_ecr_repository.api.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.api.name
}

output "ecs_service_name" {
  description = "ECS service name."
  value       = aws_ecs_service.api.name
}

output "database_endpoint" {
  description = "RDS endpoint hostname."
  value       = aws_db_instance.postgres.address
}

output "database_name" {
  description = "Primary application database name."
  value       = aws_db_instance.postgres.db_name
}

output "log_group_name" {
  description = "CloudWatch log group for the API."
  value       = aws_cloudwatch_log_group.api.name
}
