#!/usr/bin/env bash
set -euo pipefail

# ============================================================
#  TSun FF Bancheck API — VPS Domain Setup
#  Domain : bancheck.tsunstudio.me
#  Port   : 8072
# ============================================================

DOMAIN="${DOMAIN:-bancheck.tsunstudio.me}"
EMAIL="${EMAIL:-admin@tsunstudio.pw}"
APP_PORT="${APP_PORT:-8072}"
PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
IMAGE_NAME="${IMAGE_NAME:-tsun-ff-bancheck}"
CONTAINER_NAME="${CONTAINER_NAME:-tsun-ff-bancheck}"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   TSun FF Bancheck API — VPS Setup              ║"
echo "║   Domain : ${DOMAIN}"
echo "║   Port   : ${APP_PORT}"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# --- Validate project directory ---
if [ ! -f "${PROJECT_DIR}/app.py" ] || [ ! -f "${PROJECT_DIR}/Dockerfile" ]; then
  echo "ERROR: PROJECT_DIR must point to the project root (with app.py + Dockerfile)."
  echo "       Current: ${PROJECT_DIR}"
  exit 1
fi

# --- Validate .env file ---
if [ ! -f "${PROJECT_DIR}/.env" ]; then
  echo "WARNING: No .env file found. Creating one from .env.example..."
  if [ -f "${PROJECT_DIR}/.env.example" ]; then
    cp "${PROJECT_DIR}/.env.example" "${PROJECT_DIR}/.env"
    echo "  → Created .env from .env.example. Please edit it with your BAN_KEY."
  else
    echo "BAN_KEY=none" > "${PROJECT_DIR}/.env"
    echo "  → Created .env with default BAN_KEY=none. Please update it."
  fi
fi

# --- Install system prerequisites ---
echo "=== [1/7] Installing system packages ==="
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# --- Install Docker if missing ---
echo "=== [2/7] Ensuring Docker is installed ==="
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found — installing..."
  if apt-cache policy docker-ce 2>/dev/null | grep -q "Candidate:"; then
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  else
    sudo apt install -y docker.io
  fi
else
  echo "Docker already present — skipping install."
fi

# Install docker compose plugin if not available
if ! docker compose version >/dev/null 2>&1; then
  echo "Installing docker-compose-plugin..."
  sudo apt install -y docker-compose-plugin 2>/dev/null || true
fi

sudo systemctl enable --now docker nginx

# --- Build & run container ---
cd "${PROJECT_DIR}"

echo "=== [3/7] Building Docker image: ${IMAGE_NAME} ==="
sudo docker build -t "${IMAGE_NAME}:latest" .

echo "=== [4/7] Starting container: ${CONTAINER_NAME} ==="
sudo docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

# If docker-compose.yml exists, use compose; otherwise run directly
if [ -f "${PROJECT_DIR}/docker-compose.yml" ] && docker compose version >/dev/null 2>&1; then
  echo "Using docker compose..."
  sudo docker compose up -d --build
else
  echo "Using docker run..."
  ENV_ARGS=()
  if [ -f "${PROJECT_DIR}/.env" ]; then
    ENV_ARGS+=(--env-file "${PROJECT_DIR}/.env")
  fi

  sudo docker run -d \
    --name "${CONTAINER_NAME}" \
    --restart always \
    -p "127.0.0.1:${APP_PORT}:${APP_PORT}" \
    "${ENV_ARGS[@]}" \
    -e PYTHONUNBUFFERED=1 \
    "${IMAGE_NAME}:latest"
fi

# --- Configure Nginx reverse proxy ---
echo "=== [5/7] Configuring Nginx for ${DOMAIN} ==="
sudo tee "/etc/nginx/sites-available/${DOMAIN}" >/dev/null <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # --- Performance tuning for 100+ req/s ---
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Keep-alive to upstream
        proxy_set_header Connection "";
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        proxy_connect_timeout 10s;
        proxy_buffering off;
    }
}
EOF

sudo ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
sudo nginx -t
sudo systemctl reload nginx

# --- SSL certificate via Let's Encrypt ---
echo "=== [6/7] Requesting SSL certificate ==="
sudo certbot --nginx -d "${DOMAIN}" --redirect -m "${EMAIL}" --agree-tos -n

# --- Verify ---
echo ""
echo "=== [7/7] Verification ==="
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Domain    : https://${DOMAIN}"
echo "  App Port  : ${APP_PORT}"
echo "  Container : ${CONTAINER_NAME}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
sudo docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
sudo systemctl status nginx --no-pager | head -5
echo ""
echo "✔ TSun FF Bancheck API setup complete!"
echo "  Test: curl https://${DOMAIN}/bancheck?uid=123456789"
echo ""
