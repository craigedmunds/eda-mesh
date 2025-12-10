import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { ImageVersionsCard } from './ImageVersionsCard';
import { discoveryApiRef } from '@backstage/core-plugin-api';

import { ManagedImageEntityV1alpha1 } from '@internal/backstage-plugin-image-factory-common';

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

const mockManagedImageEntity: ManagedImageEntityV1alpha1 = {
  apiVersion: 'image-factory.io/v1alpha1',
  kind: 'ManagedImage',
  metadata: {
    name: 'test-image',
    annotations: {
      'image-factory.io/registry': 'ghcr.io',
      'image-factory.io/repository': 'test/test-image',
      'image-factory.io/digest': 'sha256:abc123',
    },
  },
  spec: {
    type: 'managed-image',
    lifecycle: 'production',
    owner: 'team-a',
    system: 'image-factory',
    source: {
      provider: 'github',
      repo: 'test/repo',
      branch: 'main',
      dockerfile: 'Dockerfile',
      workflow: 'build.yml',
    },
    rebuildPolicy: {
      delay: '7d',
      autoRebuild: true,
    },
  },
};



// Mock fetch for registry API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockDiscoveryApi = {
  getBaseUrl: jest.fn().mockResolvedValue('http://localhost:7007/api/proxy'),
};

const renderComponent = (entity = mockManagedImageEntity) => {
  return render(
    <TestApiProvider apis={[[discoveryApiRef, mockDiscoveryApi]]}>
      <EntityProvider entity={entity}>
        <ImageVersionsCard />
      </EntityProvider>
    </TestApiProvider>
  );
};

describe('ImageVersionsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          name: 'sha256:abc123def456',
          metadata: {
            container: {
              tags: ['v1.2.3'],
              size: 1024000,
            },
          },
          created_at: '2024-12-10T10:00:00Z',
        },
        {
          name: 'sha256:def456ghi789',
          metadata: {
            container: {
              tags: ['v1.2.2'],
              size: 1020000,
            },
          },
          created_at: '2024-12-09T15:30:00Z',
        },
        {
          name: 'sha256:123456789abc',
          metadata: {
            container: {
              tags: ['sha256:61523e618e412180bf630a11730406d571f13dd12b040c6ac9005f3a52'],
              size: 1000000,
            },
          },
          created_at: '2024-12-08T12:00:00Z',
        },
        {
          name: 'sha256:987654321fed',
          metadata: {
            container: {
              tags: ['latest'],
              size: 1050000,
            },
          },
          created_at: '2024-12-07T09:00:00Z',
        },
      ]),
    });
  });

  it('renders loading state initially', async () => {
    // Create a promise that we can control
    let resolvePromise: (value: any) => void;
    const delayedPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    mockFetch.mockImplementation(() => delayedPromise);

    renderComponent();

    // Should show loading initially
    expect(screen.getByText('Container Versions')).toBeInTheDocument();
    
    // Resolve the promise with data
    resolvePromise!({
      ok: true,
      json: () => Promise.resolve([
        {
          name: 'sha256:abc123def456',
          metadata: {
            container: {
              tags: ['v1.2.3'],
              size: 1024000,
            },
          },
          created_at: '2024-12-10T10:00:00Z',
        },
      ]),
    });
    
    // Wait for loading to complete and data to appear
    await waitFor(() => {
      expect(screen.getByText('v1.2.3')).toBeInTheDocument();
    });
  });

  it('renders versions table after loading', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Container Versions')).toBeInTheDocument();
    });

    expect(screen.getByText('v1.2.3')).toBeInTheDocument();
    expect(screen.getByText('v1.2.2')).toBeInTheDocument();
    expect(screen.getByText('1000 KB')).toBeInTheDocument();
    expect(screen.getByText('996.1 KB')).toBeInTheDocument();
  });

  it('displays registry and repository in subheader', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/ghcr\.io\/test\/test-image • 2 versions/)).toBeInTheDocument();
    });
  });

  it('calls registry API with correct parameters', async () => {
    renderComponent();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/github-api/users/test/packages/container/test-image/versions'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/vnd.github.v3+json',
          }),
        })
      );
    });
  });

  it('handles API error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('API Error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Failed to load image versions: API Error/)).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('handles empty versions list', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No versions found for this image')).toBeInTheDocument();
    });
  });

  it('copies image reference to clipboard when copy button is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('v1.2.3')).toBeInTheDocument();
    });

    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    fireEvent.click(copyButtons[0]);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ghcr.io/test/test-image:v1.2.3');
  });

  it('refreshes data when refresh button is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('v1.2.3')).toBeInTheDocument();
    });

    // Clear the mock to reset call count
    mockFetch.mockClear();

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    
    await act(async () => {
      fireEvent.click(refreshButton);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does not render for non-managed image entities', () => {
    const componentEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
      },
      spec: {
        type: 'service',
        lifecycle: 'production',
        owner: 'team-a',
      },
    };

    const { container } = render(
      <TestApiProvider apis={[[discoveryApiRef, mockDiscoveryApi]]}>
        <EntityProvider entity={componentEntity}>
          <ImageVersionsCard />
        </EntityProvider>
      </TestApiProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  it('formats file sizes correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          name: 'sha256:abc123',
          metadata: {
            container: {
              tags: ['1.0.0'],
              size: 1073741824, // 1 GB
            },
          },
          created_at: '2024-12-10T10:00:00Z',
        },
        {
          name: 'sha256:def456',
          metadata: {
            container: {
              tags: ['0.1.0'],
              size: 512, // 512 B
            },
          },
          created_at: '2024-12-10T10:00:00Z',
        },
      ]),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('1 GB')).toBeInTheDocument();
      expect(screen.getByText('512 B')).toBeInTheDocument();
    });
  });

  it('filters out non-semantic version tags', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          name: 'sha256:abc123',
          metadata: {
            container: {
              tags: ['v1.2.3'], // Should be included
              size: 1024000,
            },
          },
          created_at: '2024-12-10T10:00:00Z',
        },
        {
          name: 'sha256:def456',
          metadata: {
            container: {
              tags: ['sha256:61523e618e412180bf630a11730406d571f13dd12b040c6ac9005f3a52'], // Should be filtered out
              size: 1020000,
            },
          },
          created_at: '2024-12-09T15:30:00Z',
        },
        {
          name: 'sha256:ghi789',
          metadata: {
            container: {
              tags: ['latest'], // Should be filtered out
              size: 1030000,
            },
          },
          created_at: '2024-12-08T12:00:00Z',
        },
        {
          name: 'sha256:jkl012',
          metadata: {
            container: {
              tags: ['0.6.2'], // Should be included
              size: 1040000,
            },
          },
          created_at: '2024-12-07T09:00:00Z',
        },
      ]),
    });

    renderComponent();

    await waitFor(() => {
      // Should show only semantic version tags
      expect(screen.getByText('v1.2.3')).toBeInTheDocument();
      expect(screen.getByText('0.6.2')).toBeInTheDocument();
      
      // Should not show SHA or latest tags
      expect(screen.queryByText('sha256:61523e618e412180bf630a11730406d571f13dd12b040c6ac9005f3a52')).not.toBeInTheDocument();
      expect(screen.queryByText('latest')).not.toBeInTheDocument();
      
      // Should show correct count (2 versions, not 4)
      expect(screen.getByText(/ghcr\.io\/test\/test-image • 2 versions/)).toBeInTheDocument();
    });
  });
});