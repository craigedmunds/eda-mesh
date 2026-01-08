FROM ghcr.io/coder/code-server:4.23.1

USER root

# Install minimal system packages, Python3, and task runner
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    sudo \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/* \
    && sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin

# Copy all code-server configuration files to both /tmp (for build) and /home/coder/.code-server-config (for runtime access)
COPY . /tmp/code-server-config/
COPY . /home/coder/.code-server-config/

# Make scripts executable
RUN chmod +x /tmp/code-server-config/scripts/*.sh
RUN chmod +x /home/coder/.code-server-config/scripts/*.sh

# Run the install-tools task (local execution during build)
RUN cd /tmp/code-server-config && task install-tools

# Switch back to coder user
USER coder

# Set git configuration
RUN git config --global user.email "coder@code-server.local" \
    && git config --global user.name "Code Server" \
    && git config --global pull.rebase false

# Create workspace directories
RUN mkdir -p /home/coder/projects /home/coder/workspaces /home/coder/cache

# Ensure coder user owns the config directory
USER root
RUN chown -R coder:coder /home/coder/.code-server-config
USER coder

WORKDIR /home/coder