/**
 * Constants for the image-factory plugin
 *
 * @packageDocumentation
 */

/**
 * Entity kind constants for image-factory entities
 *
 * @public
 */
export const IMAGE_FACTORY_ENTITY_KINDS = {
  MANAGED_IMAGE: 'ManagedImage',
  BASE_IMAGE: 'BaseImage',
} as const;

/**
 * API version for image-factory entities
 *
 * @public
 */
export const IMAGE_FACTORY_API_VERSION = 'image-factory.io/v1alpha1' as const;
