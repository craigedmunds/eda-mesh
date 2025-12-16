import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
  Grid,
  Typography,
  Box,
  CircularProgress,
  Link,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import {
  EnrollmentData,
  validateEnrollmentData,
  ValidationError,
} from '@internal/backstage-plugin-image-factory-common';
import { imageFactoryApiRef } from '../../api';

const useStyles = makeStyles(theme => ({
  form: {
    '& .MuiTextField-root': {
      marginBottom: theme.spacing(2),
    },
    '& .MuiFormControl-root': {
      marginBottom: theme.spacing(2),
    },
  },
  section: {
    marginBottom: theme.spacing(3),
  },
  sectionTitle: {
    marginBottom: theme.spacing(2),
    fontWeight: 'bold',
  },
  errorText: {
    color: theme.palette.error.main,
    fontSize: '0.75rem',
    marginTop: theme.spacing(0.5),
  },
  successBox: {
    marginTop: theme.spacing(2),
  },
  loadingBox: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
}));

interface EnrollImageDialogProps {
  open: boolean;
  onClose: () => void;
}

export const EnrollImageDialog: React.FC<EnrollImageDialogProps> = ({
  open,
  onClose,
}) => {
  const classes = useStyles();
  const imageFactoryApi = useApi(imageFactoryApiRef);

  const [formData, setFormData] = useState<Partial<EnrollmentData>>({
    name: '',
    registry: 'ghcr.io',
    repository: '',
    source: {
      provider: 'github',
      repo: '',
      branch: 'main',
      dockerfile: 'Dockerfile',
      workflow: '',
    },
    rebuildPolicy: {
      delay: '7d',
      autoRebuild: true,
    },
    metadata: {
      title: '',
      description: '',
      owner: '',
      system: 'image-factory',
      lifecycle: 'production',
    },
  });

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pullRequestUrl, setPullRequestUrl] = useState<string | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const keys = field.split('.');
      const newData = { ...prev };
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });

    // Clear validation errors for this field
    setValidationErrors(prev => prev.filter(error => error.field !== field));
  };

  const getFieldError = (field: string): string | undefined => {
    return validationErrors.find(error => error.field === field)?.message;
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setPullRequestUrl(null);

    // Validate form data
    const validation = validateEnrollmentData(formData);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await imageFactoryApi.enrollImage(formData as EnrollmentData);
      setPullRequestUrl(response.pullRequestUrl);
      setValidationErrors([]);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: '',
        registry: 'ghcr.io',
        repository: '',
        source: {
          provider: 'github',
          repo: '',
          branch: 'main',
          dockerfile: 'Dockerfile',
          workflow: '',
        },
        rebuildPolicy: {
          delay: '7d',
          autoRebuild: true,
        },
        metadata: {
          title: '',
          description: '',
          owner: '',
          system: 'image-factory',
          lifecycle: 'production',
        },
      });
      setValidationErrors([]);
      setSubmitError(null);
      setPullRequestUrl(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Enroll New Managed Image</DialogTitle>
      <DialogContent>
        {pullRequestUrl ? (
          <Box className={classes.successBox}>
            <Alert severity="success">
              <Typography variant="h6" gutterBottom>
                Enrollment Successful!
              </Typography>
              <Typography variant="body2" gutterBottom>
                Your image enrollment request has been submitted. A pull request has been created for review:
              </Typography>
              <Link href={pullRequestUrl} target="_blank" rel="noopener noreferrer">
                {pullRequestUrl}
              </Link>
              <Typography variant="body2" style={{ marginTop: 16 }}>
                Once the pull request is merged, your image will be enrolled in the Image Factory system
                and will appear in the Backstage catalog.
              </Typography>
            </Alert>
          </Box>
        ) : (
          <form className={classes.form}>
            {/* Basic Information */}
            <Box className={classes.section}>
              <Typography variant="h6" className={classes.sectionTitle}>
                Basic Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Image Name"
                    value={formData.name || ''}
                    onChange={e => handleInputChange('name', e.target.value)}
                    error={!!getFieldError('name')}
                    helperText={getFieldError('name') || 'Unique identifier for the image (lowercase, hyphens allowed)'}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Registry"
                    value={formData.registry || ''}
                    onChange={e => handleInputChange('registry', e.target.value)}
                    error={!!getFieldError('registry')}
                    helperText={getFieldError('registry') || 'Container registry (e.g., ghcr.io, docker.io)'}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Repository"
                    value={formData.repository || ''}
                    onChange={e => handleInputChange('repository', e.target.value)}
                    error={!!getFieldError('repository')}
                    helperText={getFieldError('repository') || 'Repository path in registry (e.g., username/image-name)'}
                    required
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Source Information */}
            <Box className={classes.section}>
              <Typography variant="h6" className={classes.sectionTitle}>
                Source Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Source Provider</FormLabel>
                    <RadioGroup
                      row
                      value={formData.source?.provider || 'github'}
                      onChange={e => handleInputChange('source.provider', e.target.value)}
                    >
                      <FormControlLabel value="github" control={<Radio />} label="GitHub" />
                      <FormControlLabel value="gitlab" control={<Radio />} label="GitLab" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Source Repository"
                    value={formData.source?.repo || ''}
                    onChange={e => handleInputChange('source.repo', e.target.value)}
                    error={!!getFieldError('source.repo')}
                    helperText={getFieldError('source.repo') || 'Repository containing the source code (e.g., owner/repo)'}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Branch"
                    value={formData.source?.branch || ''}
                    onChange={e => handleInputChange('source.branch', e.target.value)}
                    error={!!getFieldError('source.branch')}
                    helperText={getFieldError('source.branch') || 'Git branch to monitor'}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Dockerfile Path"
                    value={formData.source?.dockerfile || ''}
                    onChange={e => handleInputChange('source.dockerfile', e.target.value)}
                    error={!!getFieldError('source.dockerfile')}
                    helperText={getFieldError('source.dockerfile') || 'Path to Dockerfile in repository'}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Workflow Name"
                    value={formData.source?.workflow || ''}
                    onChange={e => handleInputChange('source.workflow', e.target.value)}
                    error={!!getFieldError('source.workflow')}
                    helperText={getFieldError('source.workflow') || 'GitHub Actions workflow file name (e.g., build.yml)'}
                    required
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Rebuild Policy */}
            <Box className={classes.section}>
              <Typography variant="h6" className={classes.sectionTitle}>
                Rebuild Policy
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Rebuild Delay"
                    value={formData.rebuildPolicy?.delay || ''}
                    onChange={e => handleInputChange('rebuildPolicy.delay', e.target.value)}
                    error={!!getFieldError('rebuildPolicy.delay')}
                    helperText={getFieldError('rebuildPolicy.delay') || 'Delay before rebuilding after base image updates (e.g., 7d, 24h, 30m)'}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.rebuildPolicy?.autoRebuild || false}
                        onChange={e => handleInputChange('rebuildPolicy.autoRebuild', e.target.checked)}
                      />
                    }
                    label="Auto-rebuild enabled"
                  />
                  <Typography variant="caption" display="block" color="textSecondary">
                    Automatically trigger rebuilds when base images are updated
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Metadata (Optional) */}
            <Box className={classes.section}>
              <Typography variant="h6" className={classes.sectionTitle}>
                Metadata (Optional)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Title"
                    value={formData.metadata?.title || ''}
                    onChange={e => handleInputChange('metadata.title', e.target.value)}
                    helperText="Display name for the image"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Owner"
                    value={formData.metadata?.owner || ''}
                    onChange={e => handleInputChange('metadata.owner', e.target.value)}
                    helperText="Team or person responsible for this image"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description"
                    value={formData.metadata?.description || ''}
                    onChange={e => handleInputChange('metadata.description', e.target.value)}
                    helperText="Brief description of what this image contains"
                  />
                </Grid>
              </Grid>
            </Box>

            {submitError && (
              <Alert severity="error" style={{ marginBottom: 16 }}>
                {submitError}
              </Alert>
            )}
          </form>
        )}
      </DialogContent>
      <DialogActions>
        {pullRequestUrl ? (
          <Button onClick={handleClose} color="primary">
            Close
          </Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              color="primary"
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Box className={classes.loadingBox}>
                  <CircularProgress size={16} />
                  Enrolling...
                </Box>
              ) : (
                'Enroll Image'
              )}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};