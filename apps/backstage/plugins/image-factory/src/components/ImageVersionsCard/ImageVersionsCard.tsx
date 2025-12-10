import { useState, useEffect } from 'react';
import {
  InfoCard,
  Progress,
  Table,
  TableColumn,
} from '@backstage/core-components';
import { useApi, discoveryApiRef } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Typography,
} from '@material-ui/core';
import {
  Refresh as RefreshIcon,
  FileCopy as CopyIcon,
} from '@material-ui/icons';
import { Alert } from '@material-ui/lab';
import { createRegistryClient, ImageVersion } from '../../api/registryClients';
import { isManagedImageEntity, parseImageAnnotations } from '@internal/backstage-plugin-image-factory-common';

/**
 * Props for ImageVersionsCard component
 */
export interface ImageVersionsCardProps {
  /** Optional variant for styling */
  variant?: 'gridItem';
}

/**
 * Formats bytes to human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Formats date to relative time
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

/**
 * Copies text to clipboard and shows feedback
 */
function useCopyToClipboard() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return { copyToClipboard, copied };
}

/**
 * Card component that displays container image versions from registry
 */
export const ImageVersionsCard = ({ variant }: ImageVersionsCardProps) => {
  const { entity } = useEntity();
  const discoveryApi = useApi(discoveryApiRef);
  const [versions, setVersions] = useState<ImageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { copyToClipboard, copied } = useCopyToClipboard();

  const pageSize = 10;

  // Check if this is a managed image entity
  const isManagedImage = isManagedImageEntity(entity);
  
  const imageMetadata = isManagedImage ? parseImageAnnotations(entity) : null;
  const imageName = entity.metadata.name;
  const imageRegistry = imageMetadata?.registry;
  const imageRepository = imageMetadata?.repository;

  const fetchVersions = async (pageNum: number = 0, isRefresh: boolean = false) => {
    if (!imageRegistry || !imageRepository) {
      setError('Missing registry or repository information');
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const registryClient = createRegistryClient(imageRegistry, discoveryApi);
      const response = await registryClient.getImageVersions(imageRepository, {
        page: pageNum,
        pageSize,
      });
      
      setVersions(response.versions);
      setTotalCount(response.totalCount);
      setPage(pageNum);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to fetch image versions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isManagedImage) {
      fetchVersions(0);
    }
  }, [imageName, isManagedImage]);

  const handleRefresh = () => {
    fetchVersions(page, true);
  };

  const handlePageChange = (newPage: number) => {
    fetchVersions(newPage);
  };

  const getImageReference = (version: ImageVersion, useDigest: boolean = false) => {
    const reference = useDigest ? version.digest : version.tag;
    return `${imageRegistry}/${imageRepository}:${reference}`;
  };

  // Early return after all hooks are called
  if (!isManagedImage) {
    return null;
  }

  const columns: TableColumn<ImageVersion>[] = [
    {
      title: 'Tag',
      field: 'tag',
      render: (version: ImageVersion) => (
        <Box display="flex" alignItems="center" style={{ gap: '8px' }}>
          <Typography variant="body2" style={{ fontFamily: 'monospace' }}>
            {version.tag}
          </Typography>
          <Tooltip title={copied === `tag-${version.tag}` ? 'Copied!' : 'Copy image reference'}>
            <IconButton
              size="small"
              onClick={() => copyToClipboard(getImageReference(version), `tag-${version.tag}`)}
            >
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
    {
      title: 'Digest',
      field: 'digest',
      render: (version: ImageVersion) => (
        <Box display="flex" alignItems="center" style={{ gap: '8px' }}>
          <Typography variant="body2" style={{ fontFamily: 'monospace' }}>
            {version.digest.substring(0, 19)}...
          </Typography>
          <Tooltip title={copied === `digest-${version.digest}` ? 'Copied!' : 'Copy digest reference'}>
            <IconButton
              size="small"
              onClick={() => copyToClipboard(getImageReference(version, true), `digest-${version.digest}`)}
            >
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
    {
      title: 'Size',
      field: 'size',
      render: (version: ImageVersion) => (
        <Typography variant="body2">
          {formatBytes(version.size)}
        </Typography>
      ),
    },
    {
      title: 'Published',
      field: 'publishedAt',
      render: (version: ImageVersion) => (
        <Tooltip title={new Date(version.publishedAt).toLocaleString()}>
          <Typography variant="body2">
            {formatRelativeTime(version.publishedAt)}
          </Typography>
        </Tooltip>
      ),
    },
    {
      title: 'Platform',
      field: 'platform',
      render: (version: ImageVersion) => (
        version.platform ? (
          <Chip size="small" label={version.platform} />
        ) : (
          <Typography variant="body2" color="textSecondary">
            -
          </Typography>
        )
      ),
    },
  ];

  const title = (
    <Box display="flex" alignItems="center" justifyContent="space-between">
      <Typography variant="h6">Container Versions</Typography>
      <Tooltip title="Refresh versions">
        <IconButton onClick={handleRefresh} disabled={loading || refreshing}>
          <RefreshIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const subheader = `${imageRegistry}/${imageRepository} • ${totalCount} versions`;

  if (loading && !refreshing) {
    return (
      <InfoCard title="Container Versions" variant={variant}>
        <Progress />
      </InfoCard>
    );
  }

  if (error) {
    return (
      <InfoCard title={title} subheader={subheader} variant={variant}>
        <Alert severity="error">
          <Typography variant="body2">
            Failed to load image versions: {error}
          </Typography>
          <Box mt={1}>
            <Button size="small" onClick={handleRefresh}>
              Retry
            </Button>
          </Box>
        </Alert>
      </InfoCard>
    );
  }

  if (versions.length === 0) {
    return (
      <InfoCard title={title} subheader={subheader} variant={variant}>
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="textSecondary">
            No versions found for this image
          </Typography>
          <Box mt={2}>
            <Button onClick={handleRefresh}>
              Refresh
            </Button>
          </Box>
        </Box>
      </InfoCard>
    );
  }

  return (
    <InfoCard title={title} subheader={subheader} variant={variant}>
      {refreshing && (
        <Box mb={2}>
          <Progress />
        </Box>
      )}
      
      <Table
        columns={columns}
        data={versions}
        options={{
          paging: totalCount > pageSize,
          pageSize,
          pageSizeOptions: [5, 10, 20],
          showTitle: false,
          search: false,
          toolbar: false,
        }}
        page={page}
        totalCount={totalCount}
        onPageChange={handlePageChange}
      />
      
      {copied && (
        <Box position="fixed" bottom={16} right={16} zIndex={1000}>
          <Alert severity="success">
            Copied to clipboard!
          </Alert>
        </Box>
      )}
    </InfoCard>
  );
};