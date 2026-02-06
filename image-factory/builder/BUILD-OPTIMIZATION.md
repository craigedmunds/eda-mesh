# Builder Image Build Optimization

## Multi-Stage Build Strategy

The Dockerfile is optimized with a **4-stage build** to maximize Docker layer caching:

```
Stage 1: base-tools      (~1.2GB) - Rarely changes
   ↓
Stage 2: dependencies    (~200MB) - Changes when deps update
   ↓
Stage 3: application     (~10MB)  - Changes frequently
   ↓
Stage 4: runtime         (minimal) - Just configuration
```

## Layer Breakdown

### Stage 1: Base Tools (base-tools)
**Size**: ~1.2GB  
**Changes**: Rarely (only when tool versions bump)

Contains:
- UBI 9 base OS
- Python 3.11, Node.js, npm
- Task, kubectl, git, jq
- Podman, Buildah, Skopeo
- Trivy
- Container runtime configs

**Cache invalidation**: Only when:
- UBI base image updates
- Tool versions change (Task, kubectl, Trivy)
- Container runtime packages update

### Stage 2: Dependencies (dependencies)
**Size**: ~200MB  
**Changes**: When Python dependencies change

Contains:
- Python packages from `app/pyproject.toml`
- Python packages from `cdk8s/pyproject.toml`

**Cache invalidation**: Only when:
- `pyproject.toml` files change
- `setup.py` files change

**Optimization**: Uses `--no-cache-dir` to reduce layer size

### Stage 3: Application (application)
**Size**: ~10MB  
**Changes**: Every code change

Contains:
- Python source code (`app/` and `cdk8s/`)
- Taskfile.yaml
- images.yaml

**Cache invalidation**: Every time you:
- Modify Python code
- Update Taskfile
- Change enrolled images

### Stage 4: Runtime (runtime)
**Size**: Minimal  
**Changes**: Configuration changes only

Contains:
- Environment variables
- User creation
- Permissions
- Healthcheck

## Build Performance

### Without Multi-Stage Optimization
```
Code change → Rebuild entire 1.5GB image → 10+ minutes
```

### With Multi-Stage Optimization
```
Code change → Rebuild only 10MB layer → 30 seconds

Dependency change → Rebuild 200MB + 10MB → 2-3 minutes

Tool update → Rebuild entire stack → 10+ minutes (rare)
```

## Cache Hit Rates

In typical development:

| Change Type | Frequency | Layers Rebuilt | Time |
|------------|-----------|----------------|------|
| Code change | 90% | Stage 3 only | ~30s |
| Dependency update | 9% | Stage 2-3 | ~3m |
| Tool update | 1% | All stages | ~10m |

## Build Commands

### Development (fast iteration)
```bash
# Build with maximum caching
docker build -t image-factory:dev -f builder/Dockerfile .

# Build with no cache (force rebuild everything)
docker build --no-cache -t image-factory:dev -f builder/Dockerfile .

# Build specific stage (for testing)
docker build --target dependencies -t image-factory:deps -f builder/Dockerfile .
```

### Production (reproducible builds)
```bash
# Build with specific versions
docker build \
  --build-arg TASK_VERSION=3.35.1 \
  -t ghcr.io/craigedmunds/image-factory:v1.0.0 \
  -f builder/Dockerfile .
```

## Build Context Optimization

### .dockerignore
The `.dockerignore` file excludes:
- `.venv/`, `node_modules/` - Local development dependencies
- `.git/` - Git history (large)
- `tests/` - Not needed in runtime
- `*.md` - Documentation (except README)
- `.output/`, `state/` - Generated at runtime
- Build artifacts

This reduces build context from ~500MB to ~50MB.

## Verification

### Check Layer Sizes
```bash
docker history ghcr.io/craigedmunds/image-factory:latest
```

Expected output:
```
IMAGE          CREATED          SIZE
<runtime>      1 minute ago     512B    (user creation)
<application>  1 minute ago     10MB    (Python code)
<dependencies> 5 minutes ago    200MB   (pip packages)
<base-tools>   10 minutes ago   1.2GB   (system tools)
```

### Verify Caching
```bash
# First build
time docker build -t test1 -f builder/Dockerfile .
# Should take ~10 minutes

# Change Python code, rebuild
echo "# comment" >> app/app.py
time docker build -t test2 -f builder/Dockerfile .
# Should take ~30 seconds (only rebuilds application layer)
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: Build Image Factory Builder
  uses: docker/build-push-action@v5
  with:
    context: image-factory
    file: image-factory/builder/Dockerfile
    cache-from: type=registry,ref=ghcr.io/craigedmunds/image-factory:buildcache
    cache-to: type=registry,ref=ghcr.io/craigedmunds/image-factory:buildcache,mode=max
    push: true
    tags: ghcr.io/craigedmunds/image-factory:latest
```

This uses **registry caching** to share cache between builds.

### Local Development
```bash
# Use BuildKit for better caching
export DOCKER_BUILDKIT=1

# Build with inline cache
docker build \
  --cache-from ghcr.io/craigedmunds/image-factory:latest \
  -t ghcr.io/craigedmunds/image-factory:dev \
  -f builder/Dockerfile .
```

## Multi-Architecture Builds

For multi-arch builds, each stage is built per architecture:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --cache-from type=registry,ref=ghcr.io/craigedmunds/image-factory:buildcache \
  --cache-to type=registry,ref=ghcr.io/craigedmunds/image-factory:buildcache,mode=max \
  -t ghcr.io/craigedmunds/image-factory:latest \
  -f builder/Dockerfile \
  --push .
```

## Troubleshooting

### Cache Not Working

**Problem**: Every build rebuilds all layers

**Solutions**:
1. Check BuildKit is enabled: `export DOCKER_BUILDKIT=1`
2. Verify .dockerignore doesn't exclude dependency files
3. Check file timestamps haven't changed

### Large Image Size

**Problem**: Image larger than expected

**Solutions**:
1. Check for leftover build artifacts in layers
2. Verify `dnf clean all` runs after installs
3. Use `--no-cache-dir` for pip installs
4. Check .dockerignore is excluding unnecessary files

### Slow Builds

**Problem**: Even cached builds are slow

**Solutions**:
1. Use registry cache: `--cache-from`
2. Use BuildKit: `DOCKER_BUILDKIT=1`
3. Parallelize stages where possible
4. Consider using kaniko in K8s

## Best Practices

1. **Never change Stage 1 unnecessarily** - It's the largest and slowest to build
2. **Pin versions** - Use specific versions for reproducibility
3. **Group related operations** - Fewer RUN statements = fewer layers
4. **Clean up in same layer** - `dnf install && dnf clean all` in one RUN
5. **Order by change frequency** - Least changing operations first
6. **Use .dockerignore** - Reduce build context size
7. **Test with no-cache occasionally** - Verify build still works without cache

## Metrics

Track these over time:
- **Build time** (with cache): Target < 1 minute for code changes
- **Build time** (no cache): Target < 15 minutes
- **Image size**: Target ~1.5GB total
- **Layer count**: Target < 20 layers
- **Cache hit rate**: Target > 80%
