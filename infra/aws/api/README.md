# Seventy API Infrastructure

This Terraform stack creates the smallest sensible AWS runtime for the Seventy API:

- ECR repository for the API image
- VPC with 2 public and 2 private subnets
- internet-facing ALB
- ECS/Fargate cluster, task definition, and service
- RDS PostgreSQL
- CloudWatch log group
- Secrets Manager secret for runtime app secrets
- EventBridge Scheduler job for stale event-image cleanup

The stack uses the shared remote Terraform backend created earlier:

- S3 bucket: `seventy-terraform-state-983814062972-us-east-1`
- DynamoDB lock table: `seventy-terraform-locks`

## Architecture Notes

- ECS tasks run in public subnets with public IPs to avoid the cost/complexity of NAT for this first deployment.
- RDS runs in private subnets and is only reachable from the ECS task security group.
- The API runs `prisma migrate deploy` on container startup before starting Fastify.
- Media stays in the existing bucket `seventy-media-983814062972-us-east-1`.
- Cleanup of stale uploaded event images runs daily as a scheduled ECS task.

## Requirements

- Terraform `>= 1.5`
- Docker
- AWS CLI profile `seventy`, or exported AWS credentials

## Required Terraform Variables

These secrets are required:

- `stripe_secret_key`
- `stripe_webhook_secret`
- `resend_api_key`

Optional overrides:

- `web_url`
- `public_base_url`
- `jwt_secret`
- `cron_secret`

## First Deploy

Build and push the API image, then apply the stack:

```bash
cd /Users/johnroy/Development/seventy
zsh scripts/deploy-api-to-aws.zsh
```

The deploy script will:

1. initialize Terraform for the API stack
2. create/update the ECR repository
3. build the API container image
4. push it to ECR
5. apply the full Terraform stack with the pushed image tag

## Manual Commands

If you prefer to run the steps yourself:

```bash
cd /Users/johnroy/Development/seventy/infra/aws/api
AWS_PROFILE=seventy terraform init
AWS_PROFILE=seventy terraform apply -target=aws_ecr_repository.api \
  -var='stripe_secret_key=...' \
  -var='stripe_webhook_secret=...' \
  -var='resend_api_key=...'
```

Build and push the image:

```bash
ACCOUNT_ID=$(AWS_PROFILE=seventy aws sts get-caller-identity --query Account --output text)
REPO_URI="${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/seventy-prod-api"
TAG=$(git -C /Users/johnroy/Development/seventy rev-parse --short HEAD)

AWS_PROFILE=seventy aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com"

docker build -t "${REPO_URI}:${TAG}" /Users/johnroy/Development/seventy/api
docker push "${REPO_URI}:${TAG}"
```

Then apply the full stack:

```bash
AWS_PROFILE=seventy terraform apply \
  -var="api_image_tag=${TAG}" \
  -var='stripe_secret_key=...' \
  -var='stripe_webhook_secret=...' \
  -var='resend_api_key=...'
```

## Outputs

Important outputs:

- `api_url`
- `ecr_repository_url`
- `ecs_cluster_name`
- `ecs_service_name`
- `database_endpoint`
- `log_group_name`
