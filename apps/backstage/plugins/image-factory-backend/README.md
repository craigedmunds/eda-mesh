# @internal/backstage-plugin-image-factory-backend

Backend API for image-factory enrollment and management.

## API Endpoints

- `POST /api/image-factory/images` - Enroll a new managed image (creates PR to images.yaml)
- `GET /api/image-factory/images` - List all enrolled images
- `GET /api/image-factory/images/:name` - Get image details

## Configuration

Add to `app-config.yaml`:

```yaml
imageFactory:
  gitRepo: https://github.com/your-org/your-repo.git
  gitBranch: main
  imagesYamlPath: image-factory/images.yaml
  github:
    token: ${GITHUB_TOKEN}
```

## Related Packages

- `@internal/backstage-plugin-image-factory-common` - Shared types and validators
- `@internal/backstage-plugin-catalog-backend-module-image-factory` - Catalog entity kinds registration
