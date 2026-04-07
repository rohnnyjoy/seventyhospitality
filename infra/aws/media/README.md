# Seventy Media Infrastructure

This Terraform stack manages the S3 bucket used by Seventy's event image uploads.

It currently manages:

- the S3 bucket
- the public access block
- the default server-side encryption configuration

The live bucket already exists in AWS. Terraform import blocks in `main.tf` bring
that bucket and its related settings under state on first `terraform apply`.

Terraform state for this stack is stored remotely in:

- S3 bucket: `seventy-terraform-state-983814062972-us-east-1`
- DynamoDB lock table: `seventy-terraform-locks`

## Requirements

- Terraform `>= 1.5`
- AWS CLI profile `seventy` configured with access to account `983814062972`

## Commands

```bash
cd /Users/johnroy/Development/seventy/infra/aws/media
AWS_PROFILE=seventy terraform init
AWS_PROFILE=seventy terraform plan
AWS_PROFILE=seventy terraform apply
```

If your Terraform AWS provider has trouble refreshing an SSO profile directly,
use exported temporary credentials instead:

```bash
eval "$(AWS_PROFILE=seventy aws configure export-credentials --format env)"
terraform init -var='aws_profile='
terraform plan -var='aws_profile='
terraform apply -var='aws_profile='
```

If you need to use a different AWS profile:

```bash
AWS_PROFILE=your-profile terraform init
AWS_PROFILE=your-profile terraform plan -var='aws_profile=your-profile'
AWS_PROFILE=your-profile terraform apply -var='aws_profile=your-profile'
```

## Current live values

- bucket: `seventy-media-983814062972-us-east-1`
- region: `us-east-1`

## Note

The bucket is currently hosted in the AWS Organizations management account for Seventy.
That works for now, but the preferred future state is a separate workload account for
application infrastructure.
