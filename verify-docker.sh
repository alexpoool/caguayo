#!/bin/bash
set -euo pipefail

# Script to verify the Docker setup

echo "=== Verifying Docker Setup ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }

# 1. Docker running
echo -n "1. Checking if Docker is running... "
if docker ps > /dev/null 2>&1; then
    pass "Docker is running"
else
    fail "Docker is not running. Please start Docker and try again."
fi

# 2. Docker Compose
echo -n "2. Checking if Docker Compose is available... "
if docker compose version > /dev/null 2>&1; then
    pass "Docker Compose is available"
else
    fail "Docker Compose is not available. Please install Docker Compose."
fi

# 3. Dockerfiles
echo -n "3. Checking if backend Dockerfile exists... "
if [ -f "backend/Dockerfile" ]; then
    pass "backend/Dockerfile exists"
else
    fail "backend/Dockerfile does not exist."
fi

echo -n "4. Checking if frontend Dockerfile exists... "
if [ -f "frontend/Dockerfile.frontend" ]; then
    pass "frontend/Dockerfile.frontend exists"
else
    fail "frontend/Dockerfile.frontend does not exist."
fi

# 5. docker-compose.yml
echo -n "5. Checking if docker-compose.yml exists... "
if [ -f "docker-compose.yml" ]; then
    pass "docker-compose.yml exists"
else
    fail "docker-compose.yml does not exist."
fi

# 6. .dockerignore
echo -n "6. Checking if .dockerignore exists... "
if [ -f ".dockerignore" ]; then
    pass ".dockerignore exists"
else
    warn ".dockerignore does not exist (optional but recommended)"
fi

# 7. nginx.conf
echo -n "7. Checking if frontend nginx.conf exists... "
if [ -f "frontend/nginx.conf" ]; then
    pass "frontend/nginx.conf exists"
else
    warn "frontend/nginx.conf does not exist"
fi

echo ""
echo "=== Docker Setup Verification Complete ==="
echo ""
echo "To build and start:"
echo "  docker compose up --build -d"
echo ""
echo "To stop:"
echo "  docker compose down"
echo ""
echo "To view logs:"
echo "  docker compose logs -f"
echo ""
echo "To tag & push to DockerHub:"
echo "  docker tag caguayo-backend:latest usuario/caguayo-backend:latest"
echo "  docker tag caguayo-frontend:latest usuario/caguayo-frontend:latest"
echo "  docker push usuario/caguayo-backend:latest"
echo "  docker push usuario/caguayo-frontend:latest"
