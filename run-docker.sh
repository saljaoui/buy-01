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

echo
echo "==> Starting Docker stack"
cd "${ROOT_DIR}"
docker compose up --build "$@"
