FROM python:3.12-slim

# Install curl + build dependencies (slim images are very minimal)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install uv (standalone binary)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Ensure uv is on PATH
ENV PATH="/root/.local/bin:${PATH}"

WORKDIR /app

# Optional project environment directory  
ENV UV_PROJECT_ENVIRONMENT=/app/.cache
ENV PYTHONUNBUFFERED=1
ENV UV_SYSTEM_PYTHON=1

EXPOSE 8080

RUN mkdir /scripts
COPY run.sh /scripts

# CMD ["uv", "run", "uvicorn", "--app-dir", "/integration", "app:app", "--host", "0.0.0.0", "--port", "8080"]
CMD ["/bin/sh", "/scripts/run.sh"]