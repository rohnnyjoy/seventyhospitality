# Seventy Lightsail API Infrastructure

This Terraform stack provisions the lower-cost AWS deployment path for Seventy:

- 1 Lightsail instance
- 1 Lightsail static IP
- public ports for SSH/HTTP/HTTPS
- a scoped IAM user/access key for the existing S3 media bucket

The instance itself is intentionally simple:

- Docker + Docker Compose run on the box
- PostgreSQL runs in a local container
- the Seventy API runs in a local container
- Caddy reverse-proxies traffic on port 80

This keeps the monthly floor far lower than the ECS + ALB + RDS stack.

Terraform state for this stack is stored remotely in:

- S3 bucket: `seventy-terraform-state-983814062972-us-east-1`
- DynamoDB lock table: `seventy-terraform-locks`

## Requirements

- Terraform `>= 1.5`
- AWS CLI profile `seventy`, or exported AWS credentials
- Docker for local image build validation

## Commands

```bash
cd /Users/johnroy/Development/seventy
zsh scripts/deploy-api-to-lightsail.zsh
```

The deploy script will:

1. provision or update the Lightsail instance + static IP + media IAM user
2. download the default Lightsail SSH key if needed
3. copy the API source and runtime files to the instance
4. write the runtime `.env`
5. build and start the stack on the instance with Docker Compose

## Notes

- The deployed API uses local PostgreSQL on the same box.
- Media uploads still use S3.
- Backups, HA, and blue/green deploys are intentionally out of scope for this low-cost setup.
