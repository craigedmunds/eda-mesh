FROM ghcr.io/coder/code-server:4.23.1

USER root

# Install minimal system packages and task runner
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    sudo \
    && rm -rf /var/lib/apt/lists/* \
    && sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin

# Switch back to coder user
USER coder

# Set git configuration
RUN git config --global user.email "coder@code-server.local" \
    && git config --global user.name "Code Server" \
    && git config --global pull.rebase false

# Create workspace directories
RUN mkdir -p /home/coder/projects /home/coder/workspaces /home/coder/cache

WORKDIR /home/coder