# Seventy Terraform Bootstrap

This Terraform stack creates the shared backend infrastructure used by other
Seventy Terraform stacks:

- S3 bucket for Terraform state
- DynamoDB table for Terraform state locking

This stack intentionally uses local state so it can bootstrap the remote
backend for the rest of the repository.

## Commands

```bash
cd /Users/johnroy/Development/seventy/infra/aws/bootstrap
AWS_PROFILE=seventy terraform init
AWS_PROFILE=seventy terraform apply
```

If your Terraform AWS provider has trouble refreshing an SSO profile directly,
use exported temporary credentials instead:

```bash
eval "$(AWS_PROFILE=seventy aws configure export-credentials --format env)"
terraform init -var='aws_profile='
terraform apply -var='aws_profile='
```

## Current defaults

- state bucket: `seventy-terraform-state-983814062972-us-east-1`
- lock table: `seventy-terraform-locks`
- region: `us-east-1`
