#!/bin/zsh

set -euo pipefail

ROOT_DIR="/Users/johnroy/Development/seventy"
API_DIR="${ROOT_DIR}/api"
TF_DIR="${ROOT_DIR}/infra/aws/api"
AWS_PROFILE_NAME="${AWS_PROFILE:-seventy}"
AWS_REGION_NAME="${AWS_REGION:-us-east-1}"

if [[ ! -f "${API_DIR}/.env" ]]; then
  echo "Missing ${API_DIR}/.env" >&2
  exit 1
fi

set -a
source "${API_DIR}/.env"
set +a

: "${STRIPE_SECRET_KEY:?STRIPE_SECRET_KEY is required in api/.env}"
: "${STRIPE_WEBHOOK_SECRET:?STRIPE_WEBHOOK_SECRET is required in api/.env}"
: "${RESEND_API_KEY:?RESEND_API_KEY is required in api/.env}"

TAG="$(git -C "${ROOT_DIR}" rev-parse --short HEAD)"

eval "$(AWS_PROFILE="${AWS_PROFILE_NAME}" aws configure export-credentials --format env)"

cd "${TF_DIR}"
terraform init
terraform apply -auto-approve \
  -target=aws_ecr_repository.api \
  -var="aws_profile=" \
  -var="aws_region=${AWS_REGION_NAME}" \
  -var="stripe_secret_key=${STRIPE_SECRET_KEY}" \
  -var="stripe_webhook_secret=${STRIPE_WEBHOOK_SECRET}" \
  -var="resend_api_key=${RESEND_API_KEY}"

REPO_URI="$(terraform output -raw ecr_repository_url)"

AWS_PROFILE="${AWS_PROFILE_NAME}" aws ecr get-login-password --region "${AWS_REGION_NAME}" \
  | docker login --username AWS --password-stdin "$(echo "${REPO_URI}" | cut -d/ -f1)"

docker build --platform linux/amd64 -t "${REPO_URI}:${TAG}" "${API_DIR}"
docker push "${REPO_URI}:${TAG}"

terraform apply -auto-approve \
  -var="aws_profile=" \
  -var="aws_region=${AWS_REGION_NAME}" \
  -var="api_image_tag=${TAG}" \
  -var="stripe_secret_key=${STRIPE_SECRET_KEY}" \
  -var="stripe_webhook_secret=${STRIPE_WEBHOOK_SECRET}" \
  -var="resend_api_key=${RESEND_API_KEY}"

echo
echo "Seventy API deployed:"
terraform output api_url
