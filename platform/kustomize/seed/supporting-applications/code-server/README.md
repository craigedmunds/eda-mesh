# Code Server Development Image

A custom Docker image based on `ghcr.io/coder/code-server` with development tools pre-installed.

## Features

- Base code-server functionality
- Task runner pre-installed
- Git configuration set up
- Workspace directories created
- Ready for dynamic tool installation via tasks

## Tools Installation

The image includes a minimal set of tools and relies on the `install-tools` task to dynamically install development tools based on the workspace configuration.

## Usage

This image is used by the code-server supporting application in the platform seed configuration.

## Build

The image is built automatically by GitHub Actions and managed through the image factory pipeline.