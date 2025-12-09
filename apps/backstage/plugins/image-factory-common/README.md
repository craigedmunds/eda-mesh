# @internal/backstage-plugin-image-factory-common

Common functionalities for the image-factory plugin, including entity definitions, types, and utilities.

## Features

- Entity kind definitions for ManagedImage and BaseImage
- TypeScript interfaces for image entities
- Annotation key constants for image metadata
- Utility functions for parsing entity annotations
- Validation schemas for enrollment data

## Usage

```typescript
import {
  ManagedImageEntityV1alpha1,
  BaseImageEntityV1alpha1,
  IMAGE_FACTORY_ANNOTATIONS,
  parseImageAnnotations,
  validateEnrollmentData,
} from '@internal/backstage-plugin-image-factory-common';
```
