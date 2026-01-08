# Build stage: Install uv and prepare dependencies
FROM python:3.11-slim AS builder

# Install curl for downloading uv
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install uv (standalone binary)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Ensure uv is on PATH for this stage
ENV PATH="/root/.local/bin:${PATH}"

# Create a minimal Python environment with common dependencies
WORKDIR /build
COPY example/pyproject.toml .

# Pre-install common dependencies to a virtual environment
RUN uv venv /opt/venv && \
    uv pip install --python /opt/venv/bin/python \
    fastapi uvicorn pyyaml kubernetes

# Copy uv binary to a known location
RUN mkdir -p /opt/uv/bin && cp /root/.local/bin/uv /opt/uv/bin/

# Runtime stage: Use distroless Python image
FROM gcr.io/distroless/python3-debian12:latest

# Copy Python virtual environment from builder (site-packages only)
COPY --from=builder /opt/venv/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Copy uv binary from builder
COPY --from=builder /opt/uv/bin/uv /usr/local/bin/uv

# # Copy Python entrypoint script
COPY entrypoint.py /usr/local/bin/entrypoint.py

# Set up environment - use system Python from distroless image
# ENV PATH="/usr/local/bin:${PATH}"
ENV PYTHONPATH="/usr/local/lib/python3.11/site-packages"
ENV PYTHONUNBUFFERED=1
ENV UV_PROJECT_ENVIRONMENT=/app/.cache
ENV UV_SYSTEM_PYTHON=1
ENV UV_PYTHON=/usr/bin/python3

WORKDIR /app

EXPOSE 8080

# # Use the system Python interpreter from distroless image
ENTRYPOINT ["python", "/usr/local/bin/entrypoint.py"]