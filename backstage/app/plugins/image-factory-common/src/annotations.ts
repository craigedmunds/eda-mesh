/**
 * Annotation keys for image-factory entities
 *
 * @packageDocumentation
 */

/**
 * Annotation keys used by image-factory entities to store metadata
 *
 * @public
 */
export const IMAGE_FACTORY_ANNOTATIONS = {
  /**
   * The container registry where the image is stored
   * Example: "ghcr.io", "docker.io"
   */
  REGISTRY: 'image-factory.io/registry',

  /**
   * The repository path in the registry
   * Example: "craigedmunds/backstage", "library/node"
   */
  REPOSITORY: 'image-factory.io/repository',

  /**
   * The image tag
   * Example: "latest", "22-bookworm-slim"
   */
  TAG: 'image-factory.io/tag',

  /**
   * The current digest of the image
   * Example: "sha256:abc123..."
   */
  DIGEST: 'image-factory.io/digest',

  /**
   * Timestamp of the last build (for managed images)
   * Example: "2024-12-09T10:00:00Z"
   */
  LAST_BUILT: 'image-factory.io/last-built',

  /**
   * Timestamp of the last update (for base images)
   * Example: "2024-12-08T15:30:00Z"
   */
  LAST_UPDATED: 'image-factory.io/last-updated',

  /**
   * Current rebuild status
   * Example: "up-to-date", "pending", "rebuilding", "failed"
   */
  REBUILD_STATUS: 'image-factory.io/rebuild-status',

  /**
   * Timestamp when the image becomes eligible for rebuild
   * Example: "2024-12-15T10:00:00Z"
   */
  REBUILD_ELIGIBLE_AT: 'image-factory.io/rebuild-eligible-at',

  /**
   * The previous digest before the last update
   * Example: "sha256:def456..."
   */
  PREVIOUS_DIGEST: 'image-factory.io/previous-digest',

  /**
   * Timestamp when the image was first discovered/enrolled
   * Example: "2024-12-01T10:00:00Z"
   */
  ENROLLED_AT: 'image-factory.io/enrolled-at',

  /**
   * Status of the last dependency discovery
   * Example: "success", "failed", "pending"
   */
  DISCOVERY_STATUS: 'image-factory.io/discovery-status',

  /**
   * Timestamp of the last dependency discovery
   * Example: "2024-12-09T10:00:00Z"
   */
  LAST_DISCOVERY: 'image-factory.io/last-discovery',
} as const;

/**
 * Type for annotation keys
 *
 * @public
 */
export type ImageFactoryAnnotationKey =
  (typeof IMAGE_FACTORY_ANNOTATIONS)[keyof typeof IMAGE_FACTORY_ANNOTATIONS];
