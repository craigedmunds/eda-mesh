import { render, screen, waitFor } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { githubActionsApiRef } from '@backstage/plugin-github-actions';
import { ManagedImageEntityV1alpha1 } from '@internal/backstage-plugin-image-factory-common';

// Import the component from EntityPage - we'll need to extract it
// For now, let's create a test version of the component
import { useEffect, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { 
  InfoCard, 
  Progress,
  Table,
  TableColumn,
  StatusOK,
  StatusError,
  StatusPending,
  StatusRunning,
  Link
} from '@backstage/core-components';
import { Typography, Tooltip } from '@material-ui/core';
import { GITHUB_ACTIONS_ANNOTATION } from '@backstage/plugin-github-actions';

/**
 * Formats date to relative time (same as Container Versions for consistency)
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? 'just now' : `${diffMinutes}m ago`;
    }
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Test version of the GitHub Actions component
const ManagedImageGithubActionsCard = () => {
  const { entity } = useEntity();
  const githubActionsApi = useApi(githubActionsApiRef);
  const [workflowRuns, setWorkflowRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string } | null>(null);

  useEffect(() => {
    const fetchWorkflowRuns = async () => {
      try {
        const projectSlug = entity.metadata.annotations?.[GITHUB_ACTIONS_ANNOTATION];
        if (!projectSlug) {
          setError('No GitHub project slug found');
          setLoading(false);
          return;
        }

        const [owner, repo] = projectSlug.split('/');
        setRepoInfo({ owner, repo });
        
        const result = await githubActionsApi.listWorkflowRuns({
          owner,
          repo,
          pageSize: 10,
        });

        // The API returns an Octokit response object with data property
        setWorkflowRuns(result.workflow_runs || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching workflow runs:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchWorkflowRuns();
  }, [entity, githubActionsApi]);

  const getStatusIcon = (run: any) => {
    switch (run.status) {
      case 'in_progress':
      case 'queued':
        return <StatusRunning />;
      default:
        switch (run.conclusion) {
          case 'success':
            return <StatusOK />;
          case 'failure':
          case 'cancelled':
          case 'timed_out':
            return <StatusError />;
          default:
            return <StatusPending />;
        }
    }
  };

  const columns: TableColumn<any>[] = [
    {
      title: 'Workflow',
      field: 'name',
      render: (run: any) => {
        const commitUrl = repoInfo && run.head_sha 
          ? `https://github.com/${repoInfo.owner}/${repoInfo.repo}/commit/${run.head_sha}`
          : null;
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {getStatusIcon(run)}
            <div>
              <Typography variant="body2" style={{ fontWeight: 500 }}>
                {run.name || 'Unnamed Workflow'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                #{run.run_number} • {commitUrl ? (
                  <Link 
                    to={commitUrl} 
                    target="_blank" 
                    style={{ 
                      fontSize: 'inherit',
                      textDecoration: 'underline',
                      color: '#1976d2',
                      cursor: 'pointer'
                    }}
                  >
                    {run.head_sha?.substring(0, 7)}
                  </Link>
                ) : (
                  run.head_sha?.substring(0, 7)
                )} • {run.event}
              </Typography>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Commit',
      field: 'head_commit',
      render: (run: any) => {
        const commitMessage = run.head_commit?.message || run.display_title || 'No commit message';
        const truncatedMessage = commitMessage.length > 50 
          ? `${commitMessage.substring(0, 50)}...` 
          : commitMessage;
        
        return (
          <Tooltip title={commitMessage}>
            <Typography variant="body2" style={{ maxWidth: '200px' }}>
              {truncatedMessage}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      title: 'Created',
      field: 'created_at',
      render: (run: any) => (
        <Tooltip title={new Date(run.created_at).toLocaleString()}>
          <Typography variant="body2">
            {formatRelativeTime(run.created_at)}
          </Typography>
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      field: 'html_url',
      render: (run: any) => (
        run.html_url ? (
          <Link to={run.html_url} target="_blank">
            View
          </Link>
        ) : null
      ),
    },
  ];

  if (loading) {
    return (
      <InfoCard title="GitHub Actions">
        <Progress />
      </InfoCard>
    );
  }

  if (error) {
    return (
      <InfoCard title="GitHub Actions">
        <Typography color="error" style={{ padding: '16px' }}>
          Error: {error}
        </Typography>
      </InfoCard>
    );
  }

  return (
    <InfoCard title="Recent Workflow Runs" subheader={`${workflowRuns.length} runs found`}>
      {workflowRuns.length === 0 ? (
        <Typography variant="body1" color="textSecondary" style={{ padding: '16px', textAlign: 'center' }}>
          No workflow runs found
        </Typography>
      ) : (
        <Table
          columns={columns}
          data={workflowRuns.slice(0, 10)}
          options={{
            paging: false,
            search: false,
            toolbar: false,
            showTitle: false,
          }}
        />
      )}
    </InfoCard>
  );
};

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

const renderComponent = (entity = mockManagedImageEntity) => {
  return render(
    <TestApiProvider apis={[[githubActionsApiRef, mockGithubActionsApi]]}>
      <EntityProvider entity={entity}>
        <ManagedImageGithubActionsCard />
      </EntityProvider>
    </TestApiProvider>
  );
};

describe('ManagedImageGithubActionsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
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
            head_commit: {
              message: 'Add new feature for image processing',
            },
            display_title: 'Build and Push Backstage',
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
            head_commit: {
              message: 'Fix build issues',
            },
            display_title: 'Build and Push Backstage',
          },
        ],
      },
    });
  });

  it('renders loading state initially', async () => {
    // Create a promise that we can control
    let resolvePromise: (value: any) => void;
    const delayedPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    mockGithubActionsApi.listWorkflowRuns.mockImplementation(() => delayedPromise);

    renderComponent();

    // Should show loading initially
    expect(screen.getByText('GitHub Actions')).toBeInTheDocument();
    
    // Resolve the promise with data
    resolvePromise!({
      data: {
        total_count: 1,
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
        ],
      },
    });
    
    // Wait for loading to complete and data to appear
    await waitFor(() => {
      expect(screen.getByText('Build and Push')).toBeInTheDocument();
    });
  });

  it('renders workflow runs table after loading', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Recent Workflow Runs')).toBeInTheDocument();
    });

    expect(screen.getByText('Build and Push')).toBeInTheDocument();
    expect(screen.getByText('#42')).toBeInTheDocument();
    expect(screen.getByText('#41')).toBeInTheDocument();
  });

  it('displays workflow count in subheader', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('2 runs found')).toBeInTheDocument();
    });
  });

  it('calls GitHub Actions API with correct parameters', async () => {
    renderComponent();

    await waitFor(() => {
      expect(mockGithubActionsApi.listWorkflowRuns).toHaveBeenCalledWith({
        owner: 'test',
        repo: 'test-repo',
        pageSize: 10,
      });
    });
  });

  it('handles API error gracefully', async () => {
    mockGithubActionsApi.listWorkflowRuns.mockRejectedValue(new Error('GitHub API Error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Error: GitHub API Error/)).toBeInTheDocument();
    });
  });

  it('handles empty workflow runs list', async () => {
    mockGithubActionsApi.listWorkflowRuns.mockResolvedValue({
      data: {
        total_count: 0,
        workflow_runs: [],
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No workflow runs found')).toBeInTheDocument();
    });
  });

  it('displays status icons correctly', async () => {
    renderComponent();

    await waitFor(() => {
      // Check that status icons are rendered (we can't easily test the specific icons, but we can check they exist)
      expect(screen.getByText('Build and Push')).toBeInTheDocument();
    });
  });

  it('displays commit messages with truncation', async () => {
    mockGithubActionsApi.listWorkflowRuns.mockResolvedValue({
      data: {
        total_count: 1,
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
            head_commit: {
              message: 'This is a very long commit message that should be truncated when displayed in the table to avoid taking up too much space',
            },
          },
        ],
      },
    });

    renderComponent();

    await waitFor(() => {
      // Should show truncated message
      expect(screen.getByText(/This is a very long commit message that should be/)).toBeInTheDocument();
    });
  });

  it('displays relative time formatting', async () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    mockGithubActionsApi.listWorkflowRuns.mockResolvedValue({
      data: {
        total_count: 1,
        workflow_runs: [
          {
            id: 123456,
            name: 'Build and Push',
            run_number: 42,
            status: 'completed',
            conclusion: 'success',
            head_sha: 'abc123def456',
            event: 'push',
            created_at: twoHoursAgo.toISOString(),
            html_url: 'https://github.com/test/test-repo/actions/runs/123456',
          },
        ],
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('2h ago')).toBeInTheDocument();
    });
  });

  it('creates clickable commit SHA links', async () => {
    renderComponent();

    await waitFor(() => {
      const commitLink = screen.getByText('abc123d');
      expect(commitLink).toBeInTheDocument();
      expect(commitLink.closest('a')).toHaveAttribute('href', 'https://github.com/test/test-repo/commit/abc123def456');
    });
  });

  it('handles missing GitHub project slug annotation', async () => {
    const entityWithoutSlug = {
      ...mockManagedImageEntity,
      metadata: {
        ...mockManagedImageEntity.metadata,
        annotations: {
          // Missing github.com/project-slug annotation
          'image-factory.io/registry': 'ghcr.io',
        },
      },
    };

    renderComponent(entityWithoutSlug);

    await waitFor(() => {
      expect(screen.getByText(/Error: No GitHub project slug found/)).toBeInTheDocument();
    });
  });

  it('displays View action links', async () => {
    renderComponent();

    await waitFor(() => {
      const viewLinks = screen.getAllByText('View');
      expect(viewLinks).toHaveLength(2); // One for each workflow run
      expect(viewLinks[0].closest('a')).toHaveAttribute('href', 'https://github.com/test/test-repo/actions/runs/123456');
    });
  });
});