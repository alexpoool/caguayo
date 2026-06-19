#!/bin/bash

# Script to verify the Docker setup

echo "=== Verifying Docker Setup ==="

echo "\n1. Checking if Docker is running..."
if docker ps > /dev/null 2>&1; then
    echo "✓ Docker is running"
else
    echo "✗ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "\n2. Checking if Docker Compose is available..."
if docker compose version > /dev/null 2>&1; then
    echo "✓ Docker Compose is available"
else
    echo "✗ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "\n3. Checking if PostgreSQL is available..."
if docker ps | grep -q postgres; then
    echo "✓ PostgreSQL is running"
else
    echo "⚠ PostgreSQL is not running. It will be started by Docker Compose."
fi

echo "\n4. Checking if backend Dockerfile exists..."
if [ -f "Dockerfile" ]; then
    echo "✓ Backend Dockerfile exists"
else
    echo "✗ Backend Dockerfile does not exist."
    exit 1
fi

echo "\n5. Checking if frontend Dockerfile exists..."
if [ -f "Dockerfile.frontend" ]; then
    echo "✓ Frontend Dockerfile exists"
else
    echo "✗ Frontend Dockerfile does not exist."
    exit 1
fi

echo "\n6. Checking if docker-compose.yml exists..."
if [ -f "docker-compose.yml" ]; then
    echo "✓ docker-compose.yml exists"
else
    echo "✗ docker-compose.yml does not exist."
    exit 1
fi

echo "\n=== Docker Setup Verification Complete ==="
echo "\nTo start the application, run:
  docker-compose up --build

To stop the application:
  docker-compose down

To rebuild and restart:
  docker-compose up --build -d
"
