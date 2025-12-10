import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import { ImageFactoryApi, ImageVersionsResponse } from './ImageFactoryApi';

/**
 * Client implementation for ImageFactoryApi
 */
export class ImageFactoryClient implements ImageFactoryApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: {
    discoveryApi: DiscoveryApi;
    fetchApi: FetchApi;
  }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  async getImageVersions(
    imageName: string,
    options?: {
      page?: number;
      pageSize?: number;
    }
  ): Promise<ImageVersionsResponse> {
    const baseUrl = await this.discoveryApi.getBaseUrl('image-factory');
    const searchParams = new URLSearchParams();
    
    if (options?.page !== undefined) {
      searchParams.set('page', options.page.toString());
    }
    if (options?.pageSize !== undefined) {
      searchParams.set('pageSize', options.pageSize.toString());
    }

    const url = `${baseUrl}/images/${encodeURIComponent(imageName)}/versions?${searchParams}`;
    
    const response = await this.fetchApi.fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image versions: ${response.statusText}`);
    }
    
    return response.json();
  }
}