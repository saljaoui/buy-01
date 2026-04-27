#!/usr/bin/env bash
echo "==> Resetting Kafka data (DEV ONLY)..."
docker compose down -v
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

# ✅ Start Kafka and Zookeeper first, wait until ready
echo
echo "==> Starting Zookeeper & Kafka..."
cd "${ROOT_DIR}"
docker compose up -d zookeeper kafka

echo "==> Waiting for Kafka to be ready..."
MAX_RETRIES=30
COUNT=0
until docker compose exec kafka kafka-topics --bootstrap-server kafka:9092 --list > /dev/null 2>&1; do
  COUNT=$((COUNT + 1))
  if [ "$COUNT" -ge "$MAX_RETRIES" ]; then
    echo "❌ Kafka did not become ready in time. Aborting."
    exit 1
  fi
  echo "   Kafka not ready yet... retrying ($COUNT/$MAX_RETRIES)"
  sleep 2
done
echo "✅ Kafka is ready!"

# ✅ Start the rest of the stack
echo
echo "==> Starting full Docker stack..."
docker compose up --build "$@"