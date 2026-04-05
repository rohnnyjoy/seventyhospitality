resource "random_password" "db" {
  length  = 32
  special = false
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.prefix}-db"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${local.prefix}-db" }
}

resource "aws_rds_instance" "main" {
  identifier = "${local.prefix}-postgres"

  engine         = "postgres"
  engine_version = "17"
  instance_class = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 50
  storage_encrypted     = true

  db_name  = var.project
  username = var.project
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period = 7
  skip_final_snapshot     = false
  final_snapshot_identifier = "${local.prefix}-final"

  tags = { Name = "${local.prefix}-postgres" }
}

locals {
  database_url = "postgresql://${aws_rds_instance.main.username}:${random_password.db.result}@${aws_rds_instance.main.endpoint}/${aws_rds_instance.main.db_name}?schema=public&sslmode=require"
}
