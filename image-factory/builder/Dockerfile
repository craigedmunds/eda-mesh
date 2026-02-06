# Image Factory All-in-One Builder (Optimized Multi-Stage)
# Purpose: Complete image lifecycle management in a single container
# Optimized for caching: heavy tools → dependencies → application code

# ============================================================================
# Stage 1: Base Tools and Build Environment (RARELY CHANGES - ~1.2GB)
# ============================================================================
FROM registry.access.redhat.com/ubi9/ubi:latest AS base-tools

LABEL org.opencontainers.image.title="Image Factory"
LABEL org.opencontainers.image.description="Complete image lifecycle management: analyze, build, scan, track"
LABEL org.opencontainers.image.source="https://github.com/craigedmunds/argocd-eda"
LABEL org.opencontainers.image.authors="craig@example.com"

# Install system packages and runtimes (changes rarely)
RUN dnf install -y \
    git \
    curl \
    jq \
    wget \
    python3.11 \
    python3.11-pip \
    nodejs \
    npm \
    && dnf clean all

# Install Task
ARG TASK_VERSION=3.35.1
RUN curl -sL "https://github.com/go-task/task/releases/download/v${TASK_VERSION}/task_linux_amd64.tar.gz" | \
    tar xz -C /usr/local/bin task && \
    chmod +x /usr/local/bin/task

# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl && \
    rm kubectl

# Install container build tools (heavy - keep in base layer)
RUN dnf install -y \
    podman \
    buildah \
    skopeo \
    fuse-overlayfs \
    slirp4netns \
    && dnf clean all

# Install Trivy for security scanning
RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | \
    sh -s -- -b /usr/local/bin

# Configure rootless container operation
RUN mkdir -p \
    /var/lib/shared/overlay-images \
    /var/lib/shared/overlay-layers \
    /var/lib/shared/vfs-images \
    /var/lib/shared/vfs-layers \
    /var/lib/containers/storage \
    /run/containers/storage \
    && touch /var/lib/shared/overlay-images/images.lock \
    && touch /var/lib/shared/overlay-layers/layers.lock \
    && touch /var/lib/shared/vfs-images/images.lock \
    && touch /var/lib/shared/vfs-layers/layers.lock \
    && chmod -R 777 /var/lib/shared /var/lib/containers /run/containers

# Copy container runtime configurations (changes occasionally)
COPY configs/storage.conf /etc/containers/storage.conf
COPY configs/registries.conf /etc/containers/registries.conf
COPY configs/policy.json /etc/containers/policy.json

# ============================================================================
# Stage 2: Python Dependencies (CHANGES WHEN DEPS CHANGE - ~200MB)
# ============================================================================
FROM base-tools AS dependencies

WORKDIR /opt/image-factory

# Copy only dependency manifests first (for maximum caching)
COPY app/pyproject.toml app/setup.py ./app/
COPY app/setup.cfg ./app/ 2>/dev/null || true

COPY cdk8s/pyproject.toml cdk8s/setup.py ./cdk8s/
COPY cdk8s/setup.cfg ./cdk8s/ 2>/dev/null || true

# Install Python dependencies
# Using --no-cache-dir to reduce layer size
RUN cd app && \
    (pip3.11 install --no-cache-dir -e .[dev] || \
     pip3.11 install --no-cache-dir -e . || true)

RUN cd cdk8s && \
    (pip3.11 install --no-cache-dir -e .[dev] || \
     pip3.11 install --no-cache-dir -e . || true)

# ============================================================================
# Stage 3: Application Code (CHANGES FREQUENTLY - ~10MB)
# ============================================================================
FROM dependencies AS application

# Copy application source code
# This is the ONLY layer that rebuilds on code changes
COPY app/ ./app/
COPY cdk8s/ ./cdk8s/
COPY Taskfile.yaml ./
COPY images.yaml ./

# Create state directories
RUN mkdir -p state/images state/base-images .output

# ============================================================================
# Final Stage: Runtime Configuration
# ============================================================================
FROM application AS runtime

WORKDIR /workspace

# Environment variables
ENV PATH="/opt/image-factory:${PATH}" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Create non-root user for builds
RUN useradd -u 1000 -m -s /bin/bash builder && \
    mkdir -p /home/builder/.local/share/containers && \
    chown -R builder:builder \
        /home/builder \
        /var/lib/containers \
        /run/containers \
        /workspace \
        /opt/image-factory

# Healthcheck to verify all tools are available
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD task --version && \
      python3.11 --version && \
      podman --version && \
      buildah --version && \
      trivy --version

# Default command shows available tasks
CMD ["task", "--list"]
