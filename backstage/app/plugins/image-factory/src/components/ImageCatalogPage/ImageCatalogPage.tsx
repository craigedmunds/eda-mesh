import React, { useState } from 'react';
import {
  Content,
  Header,
  Page,
  InfoCard,
} from '@backstage/core-components';
import {
  Button,
  Typography,
  Box,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import { EnrollImageDialog } from '../EnrollImageDialog';

const useStyles = makeStyles(theme => ({
  enrollButton: {
    marginLeft: theme.spacing(2),
  },
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing(4),
  },
  emptyStateIcon: {
    fontSize: 64,
    color: theme.palette.grey[400],
    marginBottom: theme.spacing(2),
  },
}));

export const ImageCatalogPage: React.FC = () => {
  const classes = useStyles();
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);

  return (
    <Page themeId="tool">
      <Header title="Image Factory" subtitle="Manage container images and dependencies">
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setEnrollDialogOpen(true)}
          className={classes.enrollButton}
        >
          Enroll Image
        </Button>
      </Header>
      <Content>
        <InfoCard title="Managed Images">
          <Box className={classes.emptyState}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No managed images found
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Get started by enrolling your first container image. The Image Factory will
              automatically track dependencies and orchestrate rebuilds when base images are updated.
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setEnrollDialogOpen(true)}
            >
              Enroll Your First Image
            </Button>
          </Box>
        </InfoCard>

        <EnrollImageDialog
          open={enrollDialogOpen}
          onClose={() => setEnrollDialogOpen(false)}
        />
      </Content>
    </Page>
  );
};