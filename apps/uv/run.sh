#!/bin/sh
set -e

# Writable project root (emptyDir)
PROJECT_DIR=/app

# Read-only source code
SRC_DIR=/integration

# Copy python sources
cp -f $SRC_DIR/app.py $PROJECT_DIR/

# Copy pyproject.toml if present
if [ -f "$SRC_DIR/pyproject.toml" ]; then
    cp -f $SRC_DIR/pyproject.toml $PROJECT_DIR/
fi

# Use PROJECT_DIR as uv project root
cd $PROJECT_DIR

# If we have a project file, uv will resolve dependencies automatically.
# If not, install what we need inline.
if [ ! -f "pyproject.toml" ]; then
    echo "No pyproject.toml found — installing deps inline"
    uv pip install fastapi uvicorn kubernetes pyyaml
fi

# Ensure uvicorn can import the app from /integration
exec uv run uvicorn \
    --app-dir "$SRC_DIR" \
    app:app \
    --host 0.0.0.0 \
    --port 8080
