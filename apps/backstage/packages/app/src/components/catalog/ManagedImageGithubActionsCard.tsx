import { useEffect, useState } from 'react';
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
import { Typography, Tooltip, Box, IconButton } from '@material-ui/core';
import { Refresh as RefreshIcon } from '@material-ui/icons';
import { 
  GITHUB_ACTIONS_ANNOTATION,
  githubActionsApiRef,
} from '@backstage/plugin-github-actions';
import { useApi } from '@backstage/core-plugin-api';

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

// GitHub Actions component styled to match Backstage design system
export const ManagedImageGithubActionsCard = () => {
  const { entity } = useEntity();
  const githubActionsApi = useApi(githubActionsApiRef);
  const [workflowRuns, setWorkflowRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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

        // The API returns workflow_runs directly (not nested in data)
        setWorkflowRuns(result.workflow_runs || []);
      } catch (err) {
        console.error('Error fetching workflow runs:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
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

  const handleRefresh = () => {
    setError(null);
    // Re-trigger the useEffect by updating a dependency
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

        setWorkflowRuns(result.workflow_runs || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching workflow runs:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchWorkflowRuns();
  };

  const title = (
    <Box display="flex" alignItems="center" justifyContent="space-between">
      <Typography variant="h6">Recent Workflow Runs</Typography>
      <Tooltip title="Refresh workflow runs">
        <IconButton onClick={handleRefresh}>
          <RefreshIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const subheader = `${workflowRuns.length} runs found`;

  if (error) {
    return (
      <InfoCard title={title} subheader={subheader}>
        <Typography color="error" style={{ padding: '16px' }}>
          Error: {error}
        </Typography>
      </InfoCard>
    );
  }

  return (
    <InfoCard title={title} subheader={subheader}>
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