# =============================================================================
#  Caguayo Backend — Multi-Stage Dockerfile
#  Stage 1 : Builder          (dev deps + quality gates: ruff + ty)
#  Stage 2 : Runtime-deps     (production deps only)
#  Stage 3 : Production       (runtime image)
# =============================================================================

# ---------------------------------------------------------------------------
#  STAGE 1 — Builder
#  Install all dependencies (including dev) and run linter / type checker.
#  If either quality gate fails the build stops here.
# ---------------------------------------------------------------------------
FROM python:3.13-slim AS builder

WORKDIR /app/backend

# System dependencies required to compile C extensions (psycopg2, etc.)
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install uv and ty (type checker)
RUN pip install --no-cache-dir uv ty

# Copy dependency metadata first to leverage Docker layer caching
COPY backend/pyproject.toml backend/uv.lock ./

# Install ALL dependencies (project + dev: ruff, pytest, httpx)
RUN uv sync --frozen

# Copy application source code, config, and Alembic
COPY backend/src ./src
COPY backend/main.py .
COPY backend/alembic ./alembic
COPY backend/alembic.ini .
COPY ty.toml .

# ── Quality Gate 1: Ruff linter ──────────────────────────────────────────
# Any linting error (exit code != 0) fails the build.
RUN uv run ruff check src/

# ── Quality Gate 2: ty type checker ──────────────────────────────────────
# Any critical type error (exit code != 0) fails the build.
RUN ty check --config-file ty.toml src/


# ---------------------------------------------------------------------------
#  STAGE 2 — Runtime dependencies
#  Install ONLY production packages into a clean virtual environment.
#  No source code is copied here — this stage only produces the .venv/.
# ---------------------------------------------------------------------------
FROM python:3.13-slim AS runtime-deps

WORKDIR /app/backend

# gcc is still needed here because some production wheels compile C extensions
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

COPY backend/pyproject.toml backend/uv.lock ./

# Install ONLY production dependencies (skip dev group entirely)
RUN uv sync --frozen --no-dev


# ---------------------------------------------------------------------------
#  STAGE 3 — Production
#  Minimal final image: runtimes deps (.venv) + source code, no build tools.
# ---------------------------------------------------------------------------
FROM python:3.13-slim AS production

WORKDIR /app/backend

# libpq5 is required at runtime by psycopg2
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# uv is needed at runtime for the CMD (uv run uvicorn …)
RUN pip install --no-cache-dir uv

# Copy the lean virtual environment (production deps only)
COPY --from=runtime-deps /app/backend/.venv ./.venv

# Copy application code and Alembic configuration from the builder stage
COPY --from=builder /app/backend/src ./src
COPY --from=builder /app/backend/main.py .
COPY --from=builder /app/backend/alembic ./alembic
COPY --from=builder /app/backend/alembic.ini .

# Copy entrypoint script
COPY backend/entrypoint.sh .

# Create a non‑root user and take ownership
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app/backend

USER appuser

# Make the src/ package discoverable
ENV PYTHONPATH=/app/backend/src

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
