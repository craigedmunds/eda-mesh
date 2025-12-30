/**
 * Common functionalities for the image-factory plugin.
 *
 * @packageDocumentation
 */

// Entity definitions
export {
  managedImageEntityV1alpha1Validator,
  type ManagedImageEntityV1alpha1,
} from './ManagedImageEntityV1alpha1';

export {
  baseImageEntityV1alpha1Validator,
  type BaseImageEntityV1alpha1,
} from './BaseImageEntityV1alpha1';

// Constants
export {
  IMAGE_FACTORY_ENTITY_KINDS,
  IMAGE_FACTORY_API_VERSION,
} from './constants';

export {
  IMAGE_FACTORY_ANNOTATIONS,
  type ImageFactoryAnnotationKey,
} from './annotations';

// Helper functions
export {
  parseImageAnnotations,
  isManagedImageEntity,
  isBaseImageEntity,
  getImageReference,
  getBaseImageDependencies,
  getDependentManagedImages,
  needsRebuild,
  isRebuildEligible,
  type ImageMetadata,
} from './helpers';

// Validation
export {
  validateEnrollmentData,
  parseRebuildDelay,
  formatRebuildDelay,
  type EnrollmentData,
  type ValidationError,
  type ValidationResult,
} from './validation';

// Types
export { type KindValidator } from './types';

// Utility functions
export { ajvCompiledJsonSchemaValidator } from './util';

// Export schemas as constants to avoid JSON import issues in builds
import managedImageSchemaJson from './schema/kinds/ManagedImage.v1alpha1.schema.json';
import baseImageSchemaJson from './schema/kinds/BaseImage.v1alpha1.schema.json';

export const managedImageSchemaV1alpha1 = managedImageSchemaJson;
export const baseImageSchemaV1alpha1 = baseImageSchemaJson;
