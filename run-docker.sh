#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# =========================
# 0. ENSURE JAVA 17 LOCAL
# =========================
ensure_java17() {
  local tools_dir="${ROOT_DIR}/.tools"
  local jdk_dir="${tools_dir}/jdk-17"

  mkdir -p "${tools_dir}"

  if [ -x "${jdk_dir}/bin/java" ]; then
    export JAVA_HOME="${jdk_dir}"
    export PATH="${JAVA_HOME}/bin:${PATH}"

    echo "==> Using local Java:"
    java -version
    return
  fi

  echo "==> Java 17 not found locally. Installing Java 17 without sudo..."

  local os
  local arch
  local jdk_url
  local archive

  os="$(uname -s)"
  arch="$(uname -m)"

  if [ "${os}" != "Linux" ]; then
    echo "❌ This auto-install script currently supports Linux only."
    exit 1
  fi

  case "${arch}" in
    x86_64)
      jdk_url="https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.17%2B10/OpenJDK17U-jdk_x64_linux_hotspot_17.0.17_10.tar.gz"
      ;;
    aarch64|arm64)
      jdk_url="https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.17%2B10/OpenJDK17U-jdk_aarch64_linux_hotspot_17.0.17_10.tar.gz"
      ;;
    *)
      echo "❌ Unsupported CPU architecture: ${arch}"
      exit 1
      ;;
  esac

  archive="${tools_dir}/jdk-17.tar.gz"

  echo "==> Downloading Java 17..."
  if command -v curl >/dev/null 2>&1; then
    curl -L "${jdk_url}" -o "${archive}"
  elif command -v wget >/dev/null 2>&1; then
    wget -O "${archive}" "${jdk_url}"
  else
    echo "❌ Neither curl nor wget is installed. Install one of them first."
    exit 1
  fi

  echo "==> Extracting Java 17..."
  rm -rf "${jdk_dir}"
  mkdir -p "${jdk_dir}"

  tar -xzf "${archive}" -C "${jdk_dir}" --strip-components=1
  rm -f "${archive}"

  export JAVA_HOME="${jdk_dir}"
  export PATH="${JAVA_HOME}/bin:${PATH}"

  echo "✅ Java 17 installed locally:"
  java -version
}

ensure_java17

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

docker-compose up -d zookeeper kafka discovery-service

# =========================
# 3. WAIT FOR EUREKA
# =========================
echo "==> Waiting for Eureka (discovery-service) to be READY..."

MAX_RETRIES=60
COUNT=0

until docker exec buy-01_discovery-service_1 wget -qO- http://localhost:8761/actuator/health | grep '"status":"UP"' > /dev/null 2>&1; do
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

docker-compose up -d api-gateway user-service product-service media-service frontend

echo
echo "🚀 All services are running!"