#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

build_service() {
  local service_dir="$1"
  echo
  echo "==> Building ${service_dir}"
  (
    cd "${ROOT_DIR}/${service_dir}"
    ./mvnw -B -DskipTests package
  )
}

# =========================
# 1. BUILD ALL SERVICES
# =========================
build_service "infrastructure/discovery-service"
build_service "infrastructure/api-gateway"
build_service "services/user-service"
build_service "services/product-service"
build_service "services/media-service"

echo
echo "==> Building frontend"
(
  cd "${ROOT_DIR}/frontend"
  if [ ! -d node_modules ]; then
    npm ci
  fi
  npm run build
)

cd "${ROOT_DIR}"

# =========================
# 2. START INFRA FIRST
# =========================
echo
echo "==> Starting Kafka, Zookeeper, Eureka..."

docker compose up -d zookeeper kafka discovery-service

# =========================
# 3. WAIT FOR EUREKA
# =========================
echo "==> Waiting for Eureka (discovery-service) to be READY..."

MAX_RETRIES=60
COUNT=0

until docker exec buy-01-discovery-service-1 wget -qO- http://localhost:8761/actuator/health | grep '"status":"UP"' > /dev/null 2>&1; do
  COUNT=$((COUNT + 1))

  if [ "$COUNT" -ge "$MAX_RETRIES" ]; then
    echo "❌ Eureka did not become ready in time. Aborting."
    exit 1
  fi

  echo "   Eureka not ready yet... retrying ($COUNT/$MAX_RETRIES)"
  sleep 2
done

echo "✅ Eureka is UP!"

# =========================
# 4. START REMAINING SERVICES
# =========================
echo
echo "==> Starting full microservices stack..."

docker compose up -d api-gateway user-service product-service media-service frontend

echo
echo "🚀 All services are running!"