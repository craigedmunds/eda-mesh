#!/bin/bash
set -e

echo "Installing development tools..."

# Update package lists
apt-get update

# Install system packages
echo "Installing system packages..."
apt-get install -y curl wget git jq tree htop vim nano

# Install yq
echo "Installing yq..."
wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
chmod +x /usr/local/bin/yq

# Install kubectl
echo "Installing kubectl..."
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
mv kubectl /usr/local/bin/

# Install kustomize
echo "Installing kustomize..."
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
mv kustomize /usr/local/bin/

# Install helm
echo "Installing helm..."
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install k9s
echo "Installing k9s..."
K9S_VERSION=$(curl -s https://api.github.com/repos/derailed/k9s/releases/latest | grep tag_name | cut -d "\"" -f 4)
curl -sL https://github.com/derailed/k9s/releases/download/${K9S_VERSION}/k9s_Linux_amd64.tar.gz | tar xfz - -C /usr/local/bin k9s

# Install uv (Python package manager)
echo "Installing uv..."
export CARGO_HOME=/home/coder/.cargo
export RUSTUP_HOME=/home/coder/.rustup
curl -LsSf https://astral.sh/uv/install.sh | sh
echo "export PATH=\"/home/coder/.cargo/bin:\$PATH\"" >> /home/coder/.bashrc

# Install pipx
echo "Installing pipx..."
python3 -m pip install --user pipx --break-system-packages
python3 -m pipx ensurepath

# Install Node.js and npm
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install yarn
echo "Installing yarn..."
npm install -g yarn ts-node

# Install Go
echo "Installing Go..."
GO_VERSION="1.21.5"
wget https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz
rm -rf /usr/local/go && tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz
rm go${GO_VERSION}.linux-amd64.tar.gz
echo "export PATH=\$PATH:/usr/local/go/bin" >> /home/coder/.bashrc

# Install Task runner
echo "Installing Task runner..."
sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin

echo "Development tools installation completed!"
echo "Installed tools:"
echo "- System: curl, wget, git, jq, yq, tree, htop, vim, nano"
echo "- Kubernetes: kubectl, kustomize, helm, k9s"
echo "- Python: uv, pip, pipx"
echo "- Node.js: node, npm, yarn, ts-node"
echo "- Go: go compiler and tools"
echo "- Task: task runner"