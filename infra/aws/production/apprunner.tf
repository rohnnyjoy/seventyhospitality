resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "random_password" "cron" {
  length  = 32
  special = false
}

# IAM role for App Runner to pull from ECR
resource "aws_iam_role" "apprunner_ecr" {
  name = "${local.prefix}-apprunner-ecr"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "build.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr" {
  role       = aws_iam_role.apprunner_ecr.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# IAM role for App Runner instance (S3 media access)
resource "aws_iam_role" "apprunner_instance" {
  name = "${local.prefix}-apprunner-instance"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "tasks.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "apprunner_s3" {
  name = "${local.prefix}-s3-media"
  role = aws_iam_role.apprunner_instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
      Resource = [
        "arn:aws:s3:::seventy-media-*",
        "arn:aws:s3:::seventy-media-*/*"
      ]
    }]
  })
}

# VPC Connector for RDS access
resource "aws_apprunner_vpc_connector" "main" {
  vpc_connector_name = "${local.prefix}-vpc"
  subnets            = aws_subnet.private[*].id
  security_groups    = [aws_security_group.apprunner.id]
}

resource "aws_apprunner_service" "api" {
  service_name = "${local.prefix}-api"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr.arn
    }

    image_repository {
      image_identifier      = "${aws_ecr_repository.api.repository_url}:latest"
      image_repository_type = "ECR"

      image_configuration {
        port = "3001"

        runtime_environment_variables = {
          NODE_ENV                       = "production"
          PORT                           = "3001"
          WEB_URL                        = "https://${var.admin_domain}"
          API_URL                        = "https://${var.admin_domain}"
          PUBLIC_BASE_URL                = "https://${var.admin_domain}"
          AUTH_DISABLED                  = "false"
          MEDIA_BACKEND                  = "s3"
          MEDIA_S3_BUCKET                = "seventy-media-983814062972-us-east-1"
          MEDIA_S3_REGION                = var.aws_region
          MEDIA_STALE_UPLOAD_MAX_AGE_HOURS = "24"
          MEDIA_STALE_UPLOAD_CLEANUP_LIMIT = "100"
        }

        runtime_environment_secrets = {
          DATABASE_URL          = aws_ssm_parameter.database_url.arn
          JWT_SECRET            = aws_ssm_parameter.jwt_secret.arn
          CRON_SECRET           = aws_ssm_parameter.cron_secret.arn
          STRIPE_SECRET_KEY     = aws_ssm_parameter.stripe_secret_key.arn
          STRIPE_WEBHOOK_SECRET = aws_ssm_parameter.stripe_webhook_secret.arn
          RESEND_API_KEY        = aws_ssm_parameter.resend_api_key.arn
        }
      }
    }

    auto_deployments_enabled = true
  }

  instance_configuration {
    cpu               = "0.25 vCPU"
    memory            = "0.5 GB"
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  network_configuration {
    egress_configuration {
      egress_type       = "DEFAULT"
      vpc_connector_arn = aws_apprunner_vpc_connector.main.arn
    }
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/api/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 3
  }

  tags = { Name = "${local.prefix}-api" }
}

# SSM Parameters for secrets
resource "aws_ssm_parameter" "database_url" {
  name  = "/${local.prefix}/database-url"
  type  = "SecureString"
  value = local.database_url
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/${local.prefix}/jwt-secret"
  type  = "SecureString"
  value = random_password.jwt.result
}

resource "aws_ssm_parameter" "cron_secret" {
  name  = "/${local.prefix}/cron-secret"
  type  = "SecureString"
  value = random_password.cron.result
}

resource "aws_ssm_parameter" "stripe_secret_key" {
  name  = "/${local.prefix}/stripe-secret-key"
  type  = "SecureString"
  value = var.stripe_secret_key
}

resource "aws_ssm_parameter" "stripe_webhook_secret" {
  name  = "/${local.prefix}/stripe-webhook-secret"
  type  = "SecureString"
  value = var.stripe_webhook_secret
}

resource "aws_ssm_parameter" "resend_api_key" {
  name  = "/${local.prefix}/resend-api-key"
  type  = "SecureString"
  value = var.resend_api_key
}

# IAM policy for App Runner to read SSM parameters
resource "aws_iam_role_policy" "apprunner_ssm" {
  name = "${local.prefix}-ssm-read"
  role = aws_iam_role.apprunner_instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameters", "ssm:GetParameter"]
      Resource = "arn:aws:ssm:${var.aws_region}:*:parameter/${local.prefix}/*"
    }]
  })
}
