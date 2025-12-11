# Generic E2E Runner Image
# Contains: Python 3, Node.js, Playwright, Git, Curl
FROM mcr.microsoft.com/playwright:v1.40.0-focal

# Install system dependencies
# git: for cloning repositories
# curl: for health checks
# python3-pip: for python scripts
RUN apt-get update && apt-get install -y \
    git \
    curl \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies commonly used in scripts
RUN pip3 install --no-cache-dir \
    requests \
    urllib3

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Create a directory for scripts (optional, for mounting)
WORKDIR /workspace
