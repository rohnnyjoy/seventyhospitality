provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile != "" ? var.aws_profile : null

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment_name
      Component   = "lightsail-api"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  name_prefix      = "${var.project_name}-${var.environment_name}"
  media_object_arn = var.media_s3_prefix != "" ? "arn:aws:s3:::${var.media_bucket_name}/${var.media_s3_prefix}/*" : "arn:aws:s3:::${var.media_bucket_name}/*"
  bootstrap_script = <<-SCRIPT
    #!/bin/bash
    set -euxo pipefail
    dnf install -y docker rsync
    systemctl enable --now docker
    usermod -aG docker ec2-user
    mkdir -p /usr/local/libexec/docker/cli-plugins
    mkdir -p /opt/seventy/api /opt/seventy/runtime /opt/seventy/data/postgres /opt/seventy/caddy/data /opt/seventy/caddy/config /opt/seventy/deploy/lightsail
    chown -R ec2-user:ec2-user /opt/seventy
    curl -fsSL https://github.com/docker/compose/releases/download/v2.39.2/docker-compose-linux-x86_64 -o /usr/local/libexec/docker/cli-plugins/docker-compose
    chmod +x /usr/local/libexec/docker/cli-plugins/docker-compose
  SCRIPT
}

resource "random_password" "postgres" {
  length  = 32
  special = false
}

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "random_password" "cron" {
  length  = 48
  special = false
}

resource "aws_lightsail_instance" "api" {
  name              = var.instance_name
  availability_zone = var.availability_zone
  blueprint_id      = var.blueprint_id
  bundle_id         = var.bundle_id
  user_data         = local.bootstrap_script
}

resource "aws_lightsail_static_ip" "api" {
  name = "${var.instance_name}-ip"
}

resource "aws_lightsail_static_ip_attachment" "api" {
  static_ip_name = aws_lightsail_static_ip.api.name
  instance_name  = aws_lightsail_instance.api.name
}

resource "aws_lightsail_instance_public_ports" "api" {
  instance_name = aws_lightsail_instance.api.name

  port_info {
    protocol   = "tcp"
    from_port  = 22
    to_port    = 22
    cidrs      = ["0.0.0.0/0"]
    ipv6_cidrs = ["::/0"]
  }

  port_info {
    protocol   = "tcp"
    from_port  = 80
    to_port    = 80
    cidrs      = ["0.0.0.0/0"]
    ipv6_cidrs = ["::/0"]
  }

  port_info {
    protocol   = "tcp"
    from_port  = 443
    to_port    = 443
    cidrs      = ["0.0.0.0/0"]
    ipv6_cidrs = ["::/0"]
  }
}

resource "aws_iam_user" "media" {
  name = "${local.name_prefix}-lightsail-media"
}

resource "aws_iam_access_key" "media" {
  user = aws_iam_user.media.name
}

resource "aws_iam_user_policy" "media" {
  name = "${local.name_prefix}-lightsail-media"
  user = aws_iam_user.media.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = "arn:aws:s3:::${var.media_bucket_name}"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = local.media_object_arn
      }
    ]
  })
}
