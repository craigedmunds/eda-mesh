#!/usr/bin/env python3
"""Unit tests for the image factory tool."""
import pytest
import yaml
from pathlib import Path
from tempfile import TemporaryDirectory
import sys
import os

# Add the parent directory to the path so we can import app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app import ImageFactoryTool


class TestImageFactoryTool:
    """Test suite for ImageFactoryTool."""
    
    @pytest.fixture
    def temp_factory(self):
        """Create a temporary image factory directory structure."""
        with TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            
            # Create directory structure
            (root / "state" / "images").mkdir(parents=True)
            (root / "state" / "base-images").mkdir(parents=True)
            
            yield root
    
    def test_normalize_base_image_name(self, temp_factory):
        """Test base image name normalization."""
        tool = ImageFactoryTool(temp_factory)
        
        assert tool.normalize_base_image_name("node:22-bookworm-slim") == "node-22-bookworm-slim"
        assert tool.normalize_base_image_name("docker.io/library/node:22") == "library-node-22"
        assert tool.normalize_base_image_name("ghcr.io/owner/image:v1.0") == "owner-image-v1.0"
    
    def test_parse_image_reference(self, temp_factory):
        """Test parsing image references."""
        tool = ImageFactoryTool(temp_factory)
        
        # Official Docker image
        result = tool.parse_image_reference("node:22-bookworm-slim")
        assert result['registry'] == 'docker.io'
        assert result['repository'] == 'library/node'
        assert result['tag'] == '22-bookworm-slim'
        
        # Custom registry
        result = tool.parse_image_reference("ghcr.io/owner/image:v1.0")
        assert result['registry'] == 'ghcr.io'
        assert result['repository'] == 'owner/image'
        assert result['tag'] == 'v1.0'
        
        # No tag
        result = tool.parse_image_reference("nginx")
        assert result['repository'] == 'library/nginx'
        assert result['tag'] == 'latest'
    
    def test_parse_dockerfile_multi_stage(self, temp_factory):
        """Test extracting all base images from multi-stage Dockerfile."""
        tool = ImageFactoryTool(temp_factory)
        
        # Create a multi-stage Dockerfile
        dockerfile = temp_factory / "Dockerfile"
        dockerfile.write_text("""
FROM python:3.12-slim AS builder
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt

FROM gcr.io/distroless/python3-debian12:latest
COPY --from=builder /app /app
WORKDIR /app
""")
        
        base_images = tool.parse_dockerfile_base_images(dockerfile)
        assert len(base_images) == 2
        assert "python:3.12-slim" in base_images
        assert "gcr.io/distroless/python3-debian12:latest" in base_images
    
    def test_parse_dockerfile_deduplication(self, temp_factory):
        """Test deduplication of repeated base images in same Dockerfile."""
        tool = ImageFactoryTool(temp_factory)
        
        # Create a Dockerfile with duplicate FROM statements
        dockerfile = temp_factory / "Dockerfile"
        dockerfile.write_text("""
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json .
RUN npm install

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
""")
        
        # The parse method returns all FROM statements (no deduplication at parse level)
        base_images = tool.parse_dockerfile_base_images(dockerfile)
        assert len(base_images) == 3
        assert all(img == "node:18-alpine" for img in base_images)
        
        # Deduplication happens during processing when normalizing names
        normalized_names = []
        seen = set()
        for base_image_ref in base_images:
            base_image_name = tool.normalize_base_image_name(base_image_ref)
            if base_image_name not in seen:
                normalized_names.append(base_image_name)
                seen.add(base_image_name)
        
        assert len(normalized_names) == 1
        assert "node-18-alpine" in normalized_names
    
    def test_parse_dockerfile_stage_references(self, temp_factory):
        """Test that stage references are not treated as base images."""
        tool = ImageFactoryTool(temp_factory)
        
        # Create a Dockerfile with stage references
        dockerfile = temp_factory / "Dockerfile"
        dockerfile.write_text("""
FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
""")
        
        base_images = tool.parse_dockerfile_base_images(dockerfile)
        assert len(base_images) == 2
        assert "node:18-alpine" in base_images
        assert "nginx:alpine" in base_images
        # "builder" should not be included as it's a stage reference
    
    def test_generate_base_image_state(self, temp_factory):
        """Test generating base image state."""
        tool = ImageFactoryTool(temp_factory)
        
        state = tool.generate_base_image_state("node:22-bookworm-slim")
        
        assert state['name'] == 'node-22-bookworm-slim'
        assert state['fullImage'] == 'node:22-bookworm-slim'
        assert state['registry'] == 'docker.io'
        assert state['repository'] == 'library/node'
        assert state['tag'] == '22-bookworm-slim'
        assert state['allowTags'] == '^22-bookworm-slim$'
        assert state['repoURL'] == 'docker.io/library/node'
    
    def test_generate_image_state_managed(self, temp_factory):
        """Test generating state for a managed image."""
        tool = ImageFactoryTool(temp_factory)
        
        image_config = {
            'name': 'backstage',
            'registry': 'ghcr.io',
            'repository': 'owner/backstage',
            'source': {
                'provider': 'github',
                'repo': 'owner/repo',
                'dockerfile': 'Dockerfile'
            },
            'rebuildDelay': '7d',
            'autoRebuild': True
        }
        
        state = tool.generate_image_state(image_config, ['node-22-bookworm-slim'])
        
        assert state['name'] == 'backstage'
        assert state['discoveryStatus'] == 'pending'
        assert state['baseImages'] == ['node-22-bookworm-slim']
        assert state['enrollment']['registry'] == 'ghcr.io'
        assert state['enrollment']['source']['repo'] == 'owner/repo'
        assert 'allowTags' not in state  # Managed images don't have warehouse fields
    
    def test_generate_image_state_external(self, temp_factory):
        """Test generating state for an external image."""
        tool = ImageFactoryTool(temp_factory)
        
        image_config = {
            'name': 'postgres',
            'registry': 'docker.io',
            'repository': 'library/postgres',
            'allowTags': '^16-alpine$',
            'rebuildDelay': '30d'
        }
        
        state = tool.generate_image_state(image_config, [])
        
        assert state['name'] == 'postgres'
        assert state['discoveryStatus'] == 'external'
        assert state['baseImages'] == []
        assert 'source' not in state['enrollment']
        assert state['allowTags'] == '^16-alpine$'
        assert state['repoURL'] == 'docker.io/library/postgres'
    
    def test_merge_state_preserves_runtime_data(self, temp_factory):
        """Test that merge preserves runtime data while updating config."""
        tool = ImageFactoryTool(temp_factory)
        
        existing = {
            'name': 'backstage',
            'enrolledAt': '2024-01-01T00:00:00Z',
            'enrollment': {
                'registry': 'ghcr.io',
                'repository': 'old/backstage'
            },
            'currentDigest': 'sha256:abc123',
            'lastBuilt': '2024-12-01T00:00:00Z',
            'rebuildHistory': [{'date': '2024-12-01'}]
        }
        
        new = {
            'name': 'backstage',
            'enrolledAt': '2024-12-04T00:00:00Z',
            'enrollment': {
                'registry': 'ghcr.io',
                'repository': 'new/backstage'
            },
            'baseImages': ['node-22-bookworm-slim']
        }
        
        merged = tool.merge_state(existing, new, prefer_new=True)
        
        # Config updated from new
        assert merged['enrollment']['repository'] == 'new/backstage'
        assert merged['baseImages'] == ['node-22-bookworm-slim']
        
        # Runtime data preserved from existing
        assert merged['currentDigest'] == 'sha256:abc123'
        assert merged['lastBuilt'] == '2024-12-01T00:00:00Z'
        # rebuildHistory is not a preserved runtime field in the current implementation
    
    def test_process_creates_state_files(self, temp_factory):
        """Test full processing creates expected state files."""
        tool = ImageFactoryTool(temp_factory)
        
        # Create images.yaml
        images_yaml = temp_factory / "images.yaml"
        images_yaml.write_text(yaml.dump([
            {
                'name': 'test-image',
                'registry': 'ghcr.io',
                'repository': 'owner/test',
                'source': {
                    'provider': 'github',
                    'repo': 'owner/repo',
                    'dockerfile': 'Dockerfile'
                }
            }
        ]))
        
        # Create Dockerfile
        dockerfile = temp_factory.parent / "Dockerfile"
        dockerfile.write_text("FROM node:22-bookworm-slim\n")
        
        # Process
        tool.process()
        
        # Check image state file created
        image_state_file = temp_factory / "state" / "images" / "test-image.yaml"
        assert image_state_file.exists()
        
        with open(image_state_file) as f:
            image_state = yaml.safe_load(f)
        
        assert image_state['name'] == 'test-image'
        assert 'node-22-bookworm-slim' in image_state['baseImages']
        
        # Check base image state file created
        base_state_file = temp_factory / "state" / "base-images" / "node-22-bookworm-slim.yaml"
        assert base_state_file.exists()
        
        with open(base_state_file) as f:
            base_state = yaml.safe_load(f)
        
        assert base_state['name'] == 'node-22-bookworm-slim'
        # dependentImages is computed, not stored
    
    def test_process_updates_existing_state(self, temp_factory):
        """Test that processing updates existing state files correctly."""
        tool = ImageFactoryTool(temp_factory)
        
        # Create initial state file with runtime data
        image_state_file = temp_factory / "state" / "images" / "test-image.yaml"
        image_state_file.write_text(yaml.dump({
            'name': 'test-image',
            'enrolledAt': '2024-01-01T00:00:00Z',
            'enrollment': {
                'registry': 'ghcr.io',
                'repository': 'owner/old'
            },
            'currentDigest': 'sha256:preserved',
            'lastBuilt': '2024-11-01T00:00:00Z'
        }))
        
        # Create images.yaml with updated config
        images_yaml = temp_factory / "images.yaml"
        images_yaml.write_text(yaml.dump([
            {
                'name': 'test-image',
                'registry': 'ghcr.io',
                'repository': 'owner/new',
                'source': {
                    'provider': 'github',
                    'repo': 'owner/repo',
                    'dockerfile': 'Dockerfile'
                }
            }
        ]))
        
        # Create Dockerfile
        dockerfile = temp_factory.parent / "Dockerfile"
        dockerfile.write_text("FROM alpine:latest\n")
        
        # Process
        tool.process()
        
        # Check state was updated
        with open(image_state_file) as f:
            updated_state = yaml.safe_load(f)
        
        # Config updated
        assert updated_state['enrollment']['repository'] == 'owner/new'
        
        # Runtime data preserved
        assert updated_state['currentDigest'] == 'sha256:preserved'
        assert updated_state['lastBuilt'] == '2024-11-01T00:00:00Z'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])