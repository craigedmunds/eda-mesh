import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { discoveryApiRef } from '@backstage/core-plugin-api';
import { githubActionsApiRef } from '@backstage/plugin-github-actions';
import { ImageVersionsCard } from './ImageVersionsCard/ImageVersionsCard';
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
      'github.com/project-slug': 'test/test-repo',
      'github.com/workflows': 'build.yml',
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

const mockGithubActionsApi = {
  listWorkflowRuns: jest.fn(),
  reRunWorkflow: jest.fn(),
  getWorkflow: jest.fn(),
  getWorkflowRun: jest.fn(),
  listJobsForWorkflowRun: jest.fn(),
  downloadJobLogsForWorkflowRun: jest.fn(),
  listBranches: jest.fn(),
  getDefaultBranch: jest.fn(),
};

const renderWithProviders = (entity = mockManagedImageEntity) => {
  return render(
    <TestApiProvider
      apis={[
        [discoveryApiRef, mockDiscoveryApi],
        [githubActionsApiRef, mockGithubActionsApi],
      ]}
    >
      <EntityProvider entity={entity}>
        <ImageVersionsCard />
      </EntityProvider>
    </TestApiProvider>
  );
};

describe('Integration Tests - ManagedImage Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful registry API response
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
      ]),
    });

    // Mock successful GitHub Actions API response
    mockGithubActionsApi.listWorkflowRuns.mockResolvedValue({
      data: {
        total_count: 2,
        workflow_runs: [
          {
            id: 123456,
            name: 'Build and Push',
            run_number: 42,
            status: 'completed',
            conclusion: 'success',
            head_sha: 'abc123def456',
            event: 'push',
            created_at: '2024-12-10T10:00:00Z',
            html_url: 'https://github.com/test/test-repo/actions/runs/123456',
          },
          {
            id: 123455,
            name: 'Build and Push',
            run_number: 41,
            status: 'completed',
            conclusion: 'failure',
            head_sha: 'def456ghi789',
            event: 'pull_request',
            created_at: '2024-12-09T15:30:00Z',
            html_url: 'https://github.com/test/test-repo/actions/runs/123455',
          },
        ],
      },
    });
  });

  describe('ImageVersionsCard Integration', () => {
    it('should fetch and display container versions from GHCR', async () => {
      renderWithProviders();

      // Wait for the component to load and fetch data
      await waitFor(() => {
        expect(screen.getByText('Container Versions')).toBeInTheDocument();
      });

      // Verify API was called with correct parameters
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/github-api/users/test/packages/container/test-image/versions'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/vnd.github.v3+json',
          }),
        })
      );

      // Verify version data is displayed
      await waitFor(() => {
        expect(screen.getByText('v1.2.3')).toBeInTheDocument();
        expect(screen.getByText('v1.2.2')).toBeInTheDocument();
      });

      // Verify registry and repository info
      expect(screen.getByText(/ghcr\.io\/test\/test-image • 2 versions/)).toBeInTheDocument();

      // Verify file sizes are formatted correctly
      expect(screen.getByText('1000 KB')).toBeInTheDocument();
      expect(screen.getByText('996.1 KB')).toBeInTheDocument();
    });

    it('should handle copy-to-clipboard functionality', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('v1.2.3')).toBeInTheDocument();
      });

      // Find and click the first copy button
      const copyButtons = screen.getAllByRole('button', { name: /copy/i });
      fireEvent.click(copyButtons[0]);

      // Verify clipboard API was called with correct image reference
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ghcr.io/test/test-image:v1.2.3');
    });

    it('should refresh data when refresh button is clicked', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('v1.2.3')).toBeInTheDocument();
      });

      // Clear mock to reset call count
      mockFetch.mockClear();

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      await act(async () => {
        fireEvent.click(refreshButton);
      });

      // Verify API was called again
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      mockFetch.mockRejectedValue(new Error('Network error'));

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(/Failed to load image versions: Network error/)).toBeInTheDocument();
      });

      // Verify retry button is available
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should filter out non-semantic version tags', async () => {
      // Mock response with mixed tag types
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
                tags: ['latest'], // Should be filtered out
                size: 1020000,
              },
            },
            created_at: '2024-12-09T15:30:00Z',
          },
          {
            name: 'sha256:ghi789',
            metadata: {
              container: {
                tags: ['sha256:61523e618e412180bf630a11730406d571f13dd12b040c6ac9005f3a52'], // Should be filtered out
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

      renderWithProviders();

      await waitFor(() => {
        // Should show only semantic version tags
        expect(screen.getByText('v1.2.3')).toBeInTheDocument();
        expect(screen.getByText('0.6.2')).toBeInTheDocument();
        
        // Should not show filtered tags
        expect(screen.queryByText('latest')).not.toBeInTheDocument();
        expect(screen.queryByText('sha256:61523e618e412180bf630a11730406d571f13dd12b040c6ac9005f3a52')).not.toBeInTheDocument();
        
        // Should show correct count (2 versions, not 4)
        expect(screen.getByText(/ghcr\.io\/test\/test-image • 2 versions/)).toBeInTheDocument();
      });
    });
  });

  describe('Docker Hub Integration', () => {
    it('should work with Docker Hub registry', async () => {
      const dockerHubEntity = {
        ...mockManagedImageEntity,
        metadata: {
          ...mockManagedImageEntity.metadata,
          annotations: {
            ...mockManagedImageEntity.metadata.annotations,
            'image-factory.io/registry': 'docker.io',
            'image-factory.io/repository': 'library/node',
          },
        },
      };

      // Mock Docker Hub API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [
            {
              name: '18-alpine',
              digest: 'sha256:abc123',
              full_size: 50000000,
              last_updated: '2024-12-10T10:00:00Z',
              images: [
                {
                  architecture: 'amd64',
                  os: 'linux',
                  size: 50000000,
                },
              ],
            },
          ],
        }),
      });

      render(
        <TestApiProvider apis={[[discoveryApiRef, mockDiscoveryApi]]}>
          <EntityProvider entity={dockerHubEntity}>
            <ImageVersionsCard />
          </EntityProvider>
        </TestApiProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Container Versions')).toBeInTheDocument();
      });

      // Verify Docker Hub API was called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/dockerhub-api/v2/repositories/library/node/tags')
      );

      // Verify Docker Hub registry info
      await waitFor(() => {
        expect(screen.getByText(/docker\.io\/library\/node/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing registry information', () => {
      const entityWithoutRegistry = {
        ...mockManagedImageEntity,
        metadata: {
          ...mockManagedImageEntity.metadata,
          annotations: {
            // Missing registry and repository annotations
            'image-factory.io/digest': 'sha256:abc123',
          },
        },
      };

      renderWithProviders(entityWithoutRegistry);

      expect(screen.getByText(/Failed to load image versions: Missing registry or repository information/)).toBeInTheDocument();
    });

    it('should not render for non-ManagedImage entities', () => {
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
  });

  describe('End-to-End Workflow', () => {
    it('should display complete ManagedImage information flow', async () => {
      renderWithProviders();

      // 1. Component should load and show loading state initially
      expect(screen.getByText('Container Versions')).toBeInTheDocument();

      // 2. Wait for registry data to load
      await waitFor(() => {
        expect(screen.getByText('v1.2.3')).toBeInTheDocument();
        expect(screen.getByText('v1.2.2')).toBeInTheDocument();
      });

      // 3. Verify all expected data is displayed
      expect(screen.getByText(/ghcr\.io\/test\/test-image • 2 versions/)).toBeInTheDocument();
      expect(screen.getByText('1000 KB')).toBeInTheDocument();
      expect(screen.getByText('996.1 KB')).toBeInTheDocument();

      // 4. Verify interactive elements work
      const copyButtons = screen.getAllByRole('button', { name: /copy/i });
      expect(copyButtons).toHaveLength(4); // 2 versions × 2 copy buttons each (tag + digest)

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();

      // 5. Test copy functionality
      fireEvent.click(copyButtons[0]);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ghcr.io/test/test-image:v1.2.3');

      // 6. Test refresh functionality
      mockFetch.mockClear();
      fireEvent.click(refreshButton);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});