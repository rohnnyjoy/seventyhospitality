#!/bin/zsh

set -euo pipefail

ROOT_DIR="/Users/johnroy/Development/seventy"
API_DIR="${ROOT_DIR}/api"
WEB_DIR="${ROOT_DIR}/web"
TF_DIR="${ROOT_DIR}/infra/aws/lightsail-api"
DEPLOY_DIR="${ROOT_DIR}/deploy/lightsail"
AWS_PROFILE_NAME="${AWS_PROFILE:-seventy}"
AWS_REGION_NAME="${AWS_REGION:-us-east-1}"
INSTANCE_NAME="seventy-prod-api"
ADMIN_DOMAIN="${ADMIN_DOMAIN:-admin.club70.nyc}"
KEY_PATH="${HOME}/.ssh/lightsail-default.pem"
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "${KEY_PATH}")

if [[ ! -f "${API_DIR}/.env" ]]; then
  echo "Missing ${API_DIR}/.env" >&2
  exit 1
fi

if [[ ! -d "${WEB_DIR}" ]]; then
  echo "Missing ${WEB_DIR}" >&2
  exit 1
fi

set -a
source "${API_DIR}/.env"
set +a

: "${STRIPE_SECRET_KEY:?STRIPE_SECRET_KEY is required in api/.env}"
: "${STRIPE_WEBHOOK_SECRET:?STRIPE_WEBHOOK_SECRET is required in api/.env}"
: "${RESEND_API_KEY:?RESEND_API_KEY is required in api/.env}"

cd "${WEB_DIR}"
VITE_API_URL= npm run build

eval "$(AWS_PROFILE="${AWS_PROFILE_NAME}" aws configure export-credentials --format env)"

cd "${TF_DIR}"
terraform init
terraform apply -auto-approve \
  -var="aws_profile=" \
  -var="aws_region=${AWS_REGION_NAME}"

STATIC_IP="$(terraform output -raw static_ip)"
MEDIA_ACCESS_KEY_ID="$(terraform output -raw media_access_key_id)"
MEDIA_SECRET_ACCESS_KEY="$(terraform output -raw media_secret_access_key)"
POSTGRES_PASSWORD="$(terraform output -raw postgres_password)"
JWT_SECRET_VALUE="$(terraform output -raw jwt_secret)"
CRON_SECRET_VALUE="$(terraform output -raw cron_secret)"

if [[ ! -f "${KEY_PATH}" ]]; then
  mkdir -p "${HOME}/.ssh"
  AWS_PROFILE="${AWS_PROFILE_NAME}" aws lightsail download-default-key-pair --region "${AWS_REGION_NAME}" \
    --query privateKeyBase64 \
    --output text > "${KEY_PATH}"
  chmod 600 "${KEY_PATH}"
fi

while ! ssh "${SSH_OPTS[@]}" -o ConnectTimeout=5 "ec2-user@${STATIC_IP}" "echo ready" >/dev/null 2>&1; do
  sleep 5
done

ssh "${SSH_OPTS[@]}" "ec2-user@${STATIC_IP}" <<'EOF'
set -euo pipefail
sudo dnf install -y docker rsync
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
sudo mkdir -p /usr/local/libexec/docker/cli-plugins
sudo mkdir -p /opt/seventy/api /opt/seventy/web /opt/seventy/runtime /opt/seventy/data/postgres /opt/seventy/caddy/data /opt/seventy/caddy/config /opt/seventy/deploy/lightsail
sudo chown -R ec2-user:ec2-user /opt/seventy
if [[ ! -x /usr/local/libexec/docker/cli-plugins/docker-compose ]]; then
  curl -fsSL https://github.com/docker/compose/releases/download/v2.39.2/docker-compose-linux-x86_64 -o /usr/local/libexec/docker/cli-plugins/docker-compose
  chmod +x /usr/local/libexec/docker/cli-plugins/docker-compose
fi
EOF

ssh "${SSH_OPTS[@]}" "ec2-user@${STATIC_IP}" <<'EOF'
mkdir -p /opt/seventy/api /opt/seventy/web /opt/seventy/runtime /opt/seventy/deploy/lightsail
rm -rf /opt/seventy/api/*
rm -rf /opt/seventy/web/*
EOF

rsync -az --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude .env \
  -e "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i ${KEY_PATH}" \
  "${API_DIR}/" "ec2-user@${STATIC_IP}:/opt/seventy/api/"

rsync -az --delete \
  -e "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i ${KEY_PATH}" \
  "${WEB_DIR}/dist/" "ec2-user@${STATIC_IP}:/opt/seventy/web/"

scp "${SSH_OPTS[@]}" "${DEPLOY_DIR}/docker-compose.yml" "ec2-user@${STATIC_IP}:/opt/seventy/deploy/lightsail/docker-compose.yml"
scp "${SSH_OPTS[@]}" "${DEPLOY_DIR}/Caddyfile" "ec2-user@${STATIC_IP}:/opt/seventy/deploy/lightsail/Caddyfile"

cat <<EOF >/tmp/seventy-lightsail.env
DATABASE_URL=postgresql://seventy:${POSTGRES_PASSWORD}@postgres:5432/seventy?schema=public
POSTGRES_DB=seventy
POSTGRES_USER=seventy
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET_VALUE}
CRON_SECRET=${CRON_SECRET_VALUE}
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
RESEND_API_KEY=${RESEND_API_KEY}
WEB_URL=https://${ADMIN_DOMAIN}
API_URL=https://${ADMIN_DOMAIN}
PUBLIC_BASE_URL=https://${ADMIN_DOMAIN}
PORT=3001
AUTH_DISABLED=false
MEDIA_BACKEND=s3
MEDIA_S3_BUCKET=${MEDIA_S3_BUCKET:-seventy-media-983814062972-us-east-1}
MEDIA_S3_REGION=${MEDIA_S3_REGION:-us-east-1}
MEDIA_S3_PREFIX=${MEDIA_S3_PREFIX:-}
AWS_REGION=${AWS_REGION_NAME}
AWS_ACCESS_KEY_ID=${MEDIA_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${MEDIA_SECRET_ACCESS_KEY}
MEDIA_STALE_UPLOAD_MAX_AGE_HOURS=24
MEDIA_STALE_UPLOAD_CLEANUP_LIMIT=100
EOF

scp "${SSH_OPTS[@]}" /tmp/seventy-lightsail.env "ec2-user@${STATIC_IP}:/opt/seventy/runtime/.env"
rm -f /tmp/seventy-lightsail.env

ssh "${SSH_OPTS[@]}" "ec2-user@${STATIC_IP}" <<'EOF'
cd /opt/seventy/deploy/lightsail
docker compose --env-file /opt/seventy/runtime/.env pull postgres caddy || true
docker compose --env-file /opt/seventy/runtime/.env up -d --build
docker compose --env-file /opt/seventy/runtime/.env restart caddy
EOF

echo
echo "Seventy Lightsail API deployed:"
echo "http://${STATIC_IP}"
