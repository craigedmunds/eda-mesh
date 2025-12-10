import { createApiRef } from '@backstage/core-plugin-api';
import { EnrollmentData } from '@internal/backstage-plugin-image-factory-common';

/**
 * Image version information from container registry
 */
export interface ImageVersion {
  tag: string;
  digest: string;
  size: number;
  publishedAt: string;
  platform?: string;
  labels?: Record<string, string>;
}

/**
 * Response from image versions API
 */
export interface ImageVersionsResponse {
  versions: ImageVersion[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Response from enrollment API
 */
export interface EnrollmentResponse {
  success: boolean;
  pullRequestUrl: string;
}

/**
 * API for interacting with image factory backend
 */
export interface ImageFactoryApi {
  /**
   * Get versions for a specific image
   */
  getImageVersions(
    imageName: string,
    options?: {
      page?: number;
      pageSize?: number;
    }
  ): Promise<ImageVersionsResponse>;

  /**
   * Enroll a new managed image
   */
  enrollImage(data: EnrollmentData): Promise<EnrollmentResponse>;
}

/**
 * API reference for dependency injection
 */
export const imageFactoryApiRef = createApiRef<ImageFactoryApi>({
  id: 'plugin.image-factory.service',
});