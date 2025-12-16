/**
 * Helper functions for working with image-factory entities
 *
 * @packageDocumentation
 */

import { Entity } from '@backstage/catalog-model';
import { IMAGE_FACTORY_ANNOTATIONS } from './annotations';
import type { ManagedImageEntityV1alpha1 } from './ManagedImageEntityV1alpha1';
import type { BaseImageEntityV1alpha1 } from './BaseImageEntityV1alpha1';

/**
 * Parsed image metadata from entity annotations
 *
 * @public
 */
export interface ImageMetadata {
  registry?: string;
  repository?: string;
  tag?: string;
  digest?: string;
  lastBuilt?: string;
  lastUpdated?: string;
  rebuildStatus?: string;
  rebuildEligibleAt?: string;
  previousDigest?: string;
  enrolledAt?: string;
  discoveryStatus?: string;
  lastDiscovery?: string;
}

/**
 * Parse image metadata from entity annotations
 *
 * @param entity - The entity to parse annotations from
 * @returns Parsed image metadata
 *
 * @public
 */
export function parseImageAnnotations(entity: Entity): ImageMetadata {
  const annotations = entity.metadata.annotations || {};

  return {
    registry: annotations[IMAGE_FACTORY_ANNOTATIONS.REGISTRY],
    repository: annotations[IMAGE_FACTORY_ANNOTATIONS.REPOSITORY],
    tag: annotations[IMAGE_FACTORY_ANNOTATIONS.TAG],
    digest: annotations[IMAGE_FACTORY_ANNOTATIONS.DIGEST],
    lastBuilt: annotations[IMAGE_FACTORY_ANNOTATIONS.LAST_BUILT],
    lastUpdated: annotations[IMAGE_FACTORY_ANNOTATIONS.LAST_UPDATED],
    rebuildStatus: annotations[IMAGE_FACTORY_ANNOTATIONS.REBUILD_STATUS],
    rebuildEligibleAt:
      annotations[IMAGE_FACTORY_ANNOTATIONS.REBUILD_ELIGIBLE_AT],
    previousDigest: annotations[IMAGE_FACTORY_ANNOTATIONS.PREVIOUS_DIGEST],
    enrolledAt: annotations[IMAGE_FACTORY_ANNOTATIONS.ENROLLED_AT],
    discoveryStatus: annotations[IMAGE_FACTORY_ANNOTATIONS.DISCOVERY_STATUS],
    lastDiscovery: annotations[IMAGE_FACTORY_ANNOTATIONS.LAST_DISCOVERY],
  };
}

/**
 * Check if an entity is a ManagedImage
 *
 * @param entity - The entity to check
 * @returns True if the entity is a ManagedImage
 *
 * @public
 */
export function isManagedImageEntity(
  entity: Entity,
): entity is ManagedImageEntityV1alpha1 {
  return (
    entity.apiVersion === 'image-factory.io/v1alpha1' &&
    entity.kind === 'ManagedImage'
  );
}

/**
 * Check if an entity is a BaseImage
 *
 * @param entity - The entity to check
 * @returns True if the entity is a BaseImage
 *
 * @public
 */
export function isBaseImageEntity(
  entity: Entity,
): entity is BaseImageEntityV1alpha1 {
  return (
    entity.apiVersion === 'image-factory.io/v1alpha1' &&
    entity.kind === 'BaseImage'
  );
}

/**
 * Get the full image reference from entity metadata
 *
 * @param entity - The entity to get the image reference from
 * @returns Full image reference (registry/repository:tag@digest) or null if incomplete
 *
 * @public
 */
export function getImageReference(entity: Entity): string | null {
  const metadata = parseImageAnnotations(entity);

  if (!metadata.registry || !metadata.repository) {
    return null;
  }

  let ref = `${metadata.registry}/${metadata.repository}`;

  if (metadata.tag) {
    ref += `:${metadata.tag}`;
  }

  if (metadata.digest) {
    ref += `@${metadata.digest}`;
  }

  return ref;
}

/**
 * Get base image dependencies from a ManagedImage entity
 *
 * @param entity - The ManagedImage entity
 * @returns Array of base image names
 *
 * @public
 */
export function getBaseImageDependencies(
  entity: ManagedImageEntityV1alpha1,
): string[] {
  return (
    entity.spec.dependsOn
      ?.map((dep: { resource: string; type: string }) => dep.resource)
      .filter(Boolean) || []
  );
}

/**
 * Get dependent managed images from a BaseImage entity
 *
 * @param entity - The BaseImage entity
 * @returns Array of managed image names
 *
 * @public
 */
export function getDependentManagedImages(
  entity: BaseImageEntityV1alpha1,
): string[] {
  return (
    entity.spec.dependents
      ?.map((dep: { resource: string; type: string }) => dep.resource)
      .filter(Boolean) || []
  );
}

/**
 * Check if an image needs rebuilding based on rebuild status
 *
 * @param entity - The entity to check
 * @returns True if the image needs rebuilding
 *
 * @public
 */
export function needsRebuild(entity: Entity): boolean {
  const metadata = parseImageAnnotations(entity);
  return metadata.rebuildStatus === 'pending';
}

/**
 * Check if an image is eligible for rebuild based on rebuild delay
 *
 * @param entity - The entity to check
 * @returns True if the image is eligible for rebuild
 *
 * @public
 */
export function isRebuildEligible(entity: Entity): boolean {
  const metadata = parseImageAnnotations(entity);

  if (!metadata.rebuildEligibleAt) {
    return true; // No delay specified, always eligible
  }

  const eligibleAt = new Date(metadata.rebuildEligibleAt);
  const now = new Date();

  return now >= eligibleAt;
}
