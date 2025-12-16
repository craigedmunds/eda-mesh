import { DiscoveryApi } from '@backstage/core-plugin-api';

export interface ImageVersion {
  tag: string;
  digest: string;
  publishedAt: string;
  platform?: string;
}

export interface ImageVersionsResponse {
  versions: ImageVersion[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Base interface for container registry clients
 */
export interface RegistryClient {
  getImageVersions(repository: string, options?: {
    page?: number;
    pageSize?: number;
  }): Promise<ImageVersionsResponse>;
}

/**
 * Checks if a tag is a semantic version (e.g., "1.2.3", "v1.2.3", "0.6.2")
 * Filters out SHA-based tags and other non-version tags
 */
function isSemanticVersionTag(tag: string): boolean {
  if (!tag) return false;
  
  // Allow tags that start with 'v' followed by semantic version
  // or just semantic version directly
  const semanticVersionRegex = /^v?\d+\.\d+\.\d+(?:-[a-zA-Z0-9\-\.]+)?(?:\+[a-zA-Z0-9\-\.]+)?$/;
  
  // Exclude SHA-based tags
  if (tag.startsWith('sha256:')) return false;
  
  // Exclude other common non-version tags
  const excludePatterns = [
    /^latest$/,
    /^main$/,
    /^master$/,
    /^develop$/,
    /^dev$/,
    /^staging$/,
    /^prod$/,
    /^production$/,
    /^[a-f0-9]{7,}$/, // Git commit hashes
  ];
  
  if (excludePatterns.some(pattern => pattern.test(tag))) {
    return false;
  }
  
  return semanticVersionRegex.test(tag);
}

/**
 * GitHub Container Registry (GHCR) client using Backstage proxy
 */
export class GHCRClient implements RegistryClient {
  private readonly discoveryApi: DiscoveryApi;

  constructor(discoveryApi: DiscoveryApi) {
    this.discoveryApi = discoveryApi;
  }

  async getImageVersions(repository: string, options: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<ImageVersionsResponse> {
    const { page = 0, pageSize = 10 } = options;
    const proxyUrl = await this.discoveryApi.getBaseUrl('proxy');
    
    // GHCR uses GitHub Packages API
    // Repository format: "owner/repo" -> we need to extract owner and package name
    const [owner, packageName] = repository.split('/');
    
    const url = `${proxyUrl}/github-api/users/${owner}/packages/container/${packageName}/versions`;
    const params = new URLSearchParams({
      per_page: pageSize.toString(),
      page: (page + 1).toString(), // GitHub API uses 1-based pagination
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GHCR versions: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform GitHub Packages API response to our format and filter for semantic versions
    const allVersions: ImageVersion[] = data
      .map((version: any) => ({
        tag: version.metadata?.container?.tags?.[0] || version.name,
        digest: version.name, // GitHub uses the digest as the version name
        publishedAt: version.created_at,
        platform: version.metadata?.container?.platform || 'linux/amd64',
      }))
      .filter((version: ImageVersion) => isSemanticVersionTag(version.tag));

    return {
      versions: allVersions,
      totalCount: allVersions.length,
      page,
      pageSize,
    };
  }
}

/**
 * Docker Hub client using Backstage proxy
 */
export class DockerHubClient implements RegistryClient {
  private readonly discoveryApi: DiscoveryApi;

  constructor(discoveryApi: DiscoveryApi) {
    this.discoveryApi = discoveryApi;
  }

  async getImageVersions(repository: string, options: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<ImageVersionsResponse> {
    const { page = 0, pageSize = 10 } = options;
    const proxyUrl = await this.discoveryApi.getBaseUrl('proxy');
    
    // Docker Hub API endpoint
    const url = `${proxyUrl}/dockerhub-api/v2/repositories/${repository}/tags`;
    const params = new URLSearchParams({
      page_size: pageSize.toString(),
      page: (page + 1).toString(), // Docker Hub uses 1-based pagination
    });

    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch Docker Hub versions: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform Docker Hub API response to our format and filter for semantic versions
    const allVersions: ImageVersion[] = (data.results?.map((tag: any) => ({
      tag: tag.name,
      digest: tag.digest || tag.images?.[0]?.digest || '',
      publishedAt: tag.last_updated,
      platform: tag.images?.[0]?.architecture ? 
        `${tag.images[0].os || 'linux'}/${tag.images[0].architecture}` : 
        undefined,
    })) || [])
      .filter((version: ImageVersion) => isSemanticVersionTag(version.tag));

    return {
      versions: allVersions,
      totalCount: allVersions.length,
      page,
      pageSize,
    };
  }
}

/**
 * Factory function to create the appropriate registry client based on registry hostname
 */
export function createRegistryClient(registry: string, discoveryApi: DiscoveryApi): RegistryClient {
  if (registry === 'ghcr.io') {
    return new GHCRClient(discoveryApi);
  } else if (registry === 'docker.io' || registry === 'registry-1.docker.io') {
    return new DockerHubClient(discoveryApi);
  } else {
    throw new Error(`Unsupported registry: ${registry}`);
  }
}