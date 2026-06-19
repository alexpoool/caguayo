FROM python:3.13-slim AS backend

WORKDIR /app/backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml and uv.lock
COPY pyproject.toml uv.lock ./

# Install uv and dependencies
RUN pip install uv
RUN uv sync --frozen

# Copy backend source code
COPY backend/src ./src
COPY backend/alembic ./alembic
COPY backend/main.py .
COPY backend/alembic.ini .

# Create non-root user
RUN useradd -m -u 1000 appuser
RUN chown -R appuser:appuser /app/backend
USER appuser

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
