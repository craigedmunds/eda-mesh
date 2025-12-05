#!/bin/sh
set -e

# Writable project root (emptyDir)
PROJECT_DIR=/app

# Read-only source code
SRC_DIR=/integration

# If arguments provided, treat first arg as script name to run
if [ $# -gt 0 ]; then
    SCRIPT_NAME="$1"
    shift
    
    # Copy the script
    if [ -f "$SRC_DIR/$SCRIPT_NAME" ]; then
        cp -f $SRC_DIR/$SCRIPT_NAME $PROJECT_DIR/
    else
        echo "Error: Script $SCRIPT_NAME not found in $SRC_DIR"
        exit 1
    fi
    
    # Copy pyproject.toml if present
    if [ -f "$SRC_DIR/pyproject.toml" ]; then
        cp -f $SRC_DIR/pyproject.toml $PROJECT_DIR/
    fi
    
    cd $PROJECT_DIR
    
    # Install dependencies if pyproject.toml exists
    if [ -f "pyproject.toml" ]; then
        uv sync
    fi
    
    # Run the script with remaining args
    exec uv run python "$PROJECT_DIR/$SCRIPT_NAME" "$@"
else
    # Default behavior: run uvicorn server
    cp -f $SRC_DIR/app.py $PROJECT_DIR/
    
    if [ -f "$SRC_DIR/pyproject.toml" ]; then
        cp -f $SRC_DIR/pyproject.toml $PROJECT_DIR/
    fi
    
    cd $PROJECT_DIR
    
    if [ ! -f "pyproject.toml" ]; then
        echo "No pyproject.toml found — installing deps inline"
        uv pip install fastapi uvicorn kubernetes pyyaml
    fi
    
    exec uv run uvicorn \
        --app-dir "$SRC_DIR" \
        app:app \
        --host 0.0.0.0 \
        --port 8080
fi
