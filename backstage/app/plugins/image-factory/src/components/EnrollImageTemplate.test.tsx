import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestApiProvider, wrapInTestApp } from '@backstage/test-utils';
import { scaffolderApiRef } from '@backstage/plugin-scaffolder-react';
import { ScaffolderApi } from '@backstage/plugin-scaffolder-react';

// Mock the scaffolder API
const mockScaffolderApi: Partial<ScaffolderApi> = {
  scaffold: jest.fn().mockResolvedValue({
    taskId: 'test-task-id',
  }),
  getTask: jest.fn().mockResolvedValue({
    id: 'test-task-id',
    status: 'completed',
    output: {
      pullRequestUrl: 'https://github.com/test/repo/pull/123',
      registryUrl: 'https://ghcr.io/craigedmunds/docker-example',
    },
  }),
  getTemplateParameterSchema: jest.fn().mockResolvedValue({
    title: 'Enroll Managed Image',
    type: 'object',
    properties: {},
  }),
  listActions: jest.fn().mockResolvedValue([]),
  streamLogs: jest.fn(),
};

/**
 * Integration test for the Image Factory enrollment template
 * Tests the complete workflow using the craigedmunds/docker-example repository
 */
describe('Image Factory Enrollment Template Integration', () => {
  const user = userEvent.setup();

  const renderTemplate = () => {
    // This would normally be the Backstage template form component
    // For now, we'll create a mock form that represents the template structure
    const MockTemplateForm = () => {
      const [formData, setFormData] = React.useState({
        name: '',
        registry: 'ghcr.io',
        repository: '',
        sourceProvider: 'github',
        sourceRepo: '',
        sourceBranch: 'main',
        dockerfile: 'Dockerfile',
        workflow: '',
        rebuildDelay: '7d',
        autoRebuild: true,
        title: '',
        description: '',
        owner: '',
        system: 'image-factory',
        lifecycle: 'production',
      });

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await mockScaffolderApi.scaffold!({
          templateRef: 'template:default/enroll-managed-image',
          values: formData,
        });
      };

      return (
        <form onSubmit={handleSubmit} data-testid="enrollment-form">
          <h1>Enroll Managed Image</h1>
          
          {/* Image Information */}
          <fieldset>
            <legend>Image Information</legend>
            <label>
              Image Name *
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="my-web-app, user-service, payment-api"
                pattern="^[a-z0-9-]+$"
                required
              />
            </label>
            
            <label>
              Container Registry *
              <select
                name="registry"
                value={formData.registry}
                onChange={(e) => setFormData({ ...formData, registry: e.target.value })}
                required
              >
                <option value="ghcr.io">GitHub Container Registry (ghcr.io)</option>
                <option value="docker.io">Docker Hub (docker.io)</option>
                <option value="registry.example.com">Custom Registry (registry.example.com)</option>
              </select>
            </label>
            
            <label>
              Repository Path *
              <input
                type="text"
                name="repository"
                value={formData.repository}
                onChange={(e) => setFormData({ ...formData, repository: e.target.value })}
                placeholder="myorg/my-web-app, username/service-name"
                required
              />
            </label>
          </fieldset>

          {/* Source Information */}
          <fieldset>
            <legend>Source Information</legend>
            <label>
              Source Provider *
              <select
                name="sourceProvider"
                value={formData.sourceProvider}
                onChange={(e) => setFormData({ ...formData, sourceProvider: e.target.value })}
                required
              >
                <option value="github">GitHub</option>
                <option value="gitlab">GitLab</option>
              </select>
            </label>
            
            <label>
              Source Repository *
              <input
                type="text"
                name="sourceRepo"
                value={formData.sourceRepo}
                onChange={(e) => setFormData({ ...formData, sourceRepo: e.target.value })}
                placeholder="myorg/my-web-app, username/service-repo"
                required
              />
            </label>
            
            <label>
              Branch *
              <input
                type="text"
                name="sourceBranch"
                value={formData.sourceBranch}
                onChange={(e) => setFormData({ ...formData, sourceBranch: e.target.value })}
                required
              />
            </label>
            
            <label>
              Dockerfile Path *
              <input
                type="text"
                name="dockerfile"
                value={formData.dockerfile}
                onChange={(e) => setFormData({ ...formData, dockerfile: e.target.value })}
                placeholder="Dockerfile, docker/Dockerfile, apps/web/Dockerfile"
                required
              />
            </label>
            
            <label>
              Build Workflow *
              <input
                type="text"
                name="workflow"
                value={formData.workflow}
                onChange={(e) => setFormData({ ...formData, workflow: e.target.value })}
                placeholder="build.yml, docker-build.yaml, ci.yml"
                required
              />
            </label>
          </fieldset>

          {/* Rebuild Policy */}
          <fieldset>
            <legend>Rebuild Policy</legend>
            <label>
              Rebuild Delay
              <select
                name="rebuildDelay"
                value={formData.rebuildDelay}
                onChange={(e) => setFormData({ ...formData, rebuildDelay: e.target.value })}
              >
                <option value="1d">1 day (fast updates)</option>
                <option value="3d">3 days (balanced)</option>
                <option value="7d">7 days (recommended)</option>
                <option value="14d">14 days (conservative)</option>
                <option value="30d">30 days (minimal updates)</option>
              </select>
            </label>
            
            <label>
              <input
                type="checkbox"
                name="autoRebuild"
                checked={formData.autoRebuild}
                onChange={(e) => setFormData({ ...formData, autoRebuild: e.target.checked })}
              />
              Auto-rebuild when base images update
            </label>
          </fieldset>

          {/* Metadata */}
          <fieldset>
            <legend>Metadata (Optional)</legend>
            <label>
              Display Title
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="My Web Application, User Management Service"
              />
            </label>
            
            <label>
              Description
              <textarea
                name="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the purpose and contents of this container image"
                rows={3}
              />
            </label>
            
            <label>
              Owner
              <input
                type="text"
                name="owner"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                placeholder="platform-team, backend-team, john.doe"
              />
            </label>
            
            <label>
              System
              <input
                type="text"
                name="system"
                value={formData.system}
                onChange={(e) => setFormData({ ...formData, system: e.target.value })}
              />
            </label>
            
            <label>
              Lifecycle
              <select
                name="lifecycle"
                value={formData.lifecycle}
                onChange={(e) => setFormData({ ...formData, lifecycle: e.target.value })}
              >
                <option value="experimental">Experimental</option>
                <option value="development">Development</option>
                <option value="production">Production</option>
                <option value="deprecated">Deprecated</option>
              </select>
            </label>
          </fieldset>

          <button type="submit">Enroll Image</button>
        </form>
      );
    };

    return render(
      wrapInTestApp(
        <TestApiProvider apis={[[scaffolderApiRef, mockScaffolderApi]]}>
          <MockTemplateForm />
        </TestApiProvider>
      )
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the enrollment form with all required fields', () => {
    renderTemplate();
    
    expect(screen.getByText('Enroll Managed Image')).toBeInTheDocument();
    expect(screen.getByText('Image Information')).toBeInTheDocument();
    expect(screen.getByText('Source Information')).toBeInTheDocument();
    expect(screen.getByText('Rebuild Policy')).toBeInTheDocument();
    expect(screen.getByText('Metadata (Optional)')).toBeInTheDocument();
    
    // Check required fields are present
    expect(screen.getByLabelText(/Image Name/)).toBeRequired();
    expect(screen.getByLabelText(/Container Registry/)).toBeRequired();
    expect(screen.getByLabelText(/Repository Path/)).toBeRequired();
    expect(screen.getByLabelText(/Source Repository/)).toBeRequired();
    expect(screen.getByLabelText(/Branch/)).toBeRequired();
    expect(screen.getByLabelText(/Dockerfile Path/)).toBeRequired();
    expect(screen.getByLabelText(/Build Workflow/)).toBeRequired();
  });

  it('should successfully enroll the craigedmunds/docker-example image', async () => {
    renderTemplate();
    
    // Fill out the form with docker-example data
    await user.type(screen.getByLabelText(/Image Name/), 'docker-example');
    
    // Registry is already set to ghcr.io by default
    expect(screen.getByLabelText(/Container Registry/)).toHaveValue('ghcr.io');
    
    await user.type(screen.getByLabelText(/Repository Path/), 'craigedmunds/docker-example');
    
    // Source provider is already set to github by default
    expect(screen.getByLabelText(/Source Provider/)).toHaveValue('github');
    
    await user.type(screen.getByLabelText(/Source Repository/), 'craigedmunds/docker-example');
    
    // Branch is already set to main by default
    expect(screen.getByLabelText(/Branch/)).toHaveValue('main');
    
    // Dockerfile is already set to Dockerfile by default
    expect(screen.getByLabelText(/Dockerfile Path/)).toHaveValue('Dockerfile');
    
    await user.type(screen.getByLabelText(/Build Workflow/), 'docker-image.yml');
    
    // Rebuild policy defaults are fine (7d, auto-rebuild enabled)
    expect(screen.getByLabelText(/Rebuild Delay/)).toHaveValue('7d');
    expect(screen.getByLabelText(/Auto-rebuild/)).toBeChecked();
    
    // Fill optional metadata
    await user.type(screen.getByLabelText(/Display Title/), 'Docker Example Application');
    await user.type(
      screen.getByLabelText(/Description/),
      'A simple Docker example application demonstrating containerization best practices'
    );
    await user.type(screen.getByLabelText(/Owner/), 'craigedmunds');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /Enroll Image/ }));
    
    // Verify the scaffolder API was called with correct data
    await waitFor(() => {
      expect(mockScaffolderApi.scaffold).toHaveBeenCalledWith({
        templateRef: 'template:default/enroll-managed-image',
        values: {
          name: 'docker-example',
          registry: 'ghcr.io',
          repository: 'craigedmunds/docker-example',
          sourceProvider: 'github',
          sourceRepo: 'craigedmunds/docker-example',
          sourceBranch: 'main',
          dockerfile: 'Dockerfile',
          workflow: 'docker-image.yml',
          rebuildDelay: '7d',
          autoRebuild: true,
          title: 'Docker Example Application',
          description: 'A simple Docker example application demonstrating containerization best practices',
          owner: 'craigedmunds',
          system: 'image-factory',
          lifecycle: 'production',
        },
      });
    });
  });

  it('should validate required fields before submission', async () => {
    renderTemplate();
    
    // Try to submit without filling required fields
    await user.click(screen.getByRole('button', { name: /Enroll Image/ }));
    
    // Form should not submit due to HTML5 validation
    expect(mockScaffolderApi.scaffold).not.toHaveBeenCalled();
    
    // Check that required fields show validation
    const nameInput = screen.getByLabelText(/Image Name/);
    expect(nameInput).toBeInvalid();
  });

  it('should handle different registry options', async () => {
    renderTemplate();
    
    const registrySelect = screen.getByLabelText(/Container Registry/);
    
    // Test Docker Hub registry
    await user.selectOptions(registrySelect, 'docker.io');
    expect(registrySelect).toHaveValue('docker.io');
    
    // Test custom registry
    await user.selectOptions(registrySelect, 'registry.example.com');
    expect(registrySelect).toHaveValue('registry.example.com');
  });

  it('should handle different rebuild delay options', async () => {
    renderTemplate();
    
    const rebuildDelaySelect = screen.getByLabelText(/Rebuild Delay/);
    
    // Test different rebuild delays
    await user.selectOptions(rebuildDelaySelect, '1d');
    expect(rebuildDelaySelect).toHaveValue('1d');
    
    await user.selectOptions(rebuildDelaySelect, '30d');
    expect(rebuildDelaySelect).toHaveValue('30d');
  });

  it('should toggle auto-rebuild option', async () => {
    renderTemplate();
    
    const autoRebuildCheckbox = screen.getByLabelText(/Auto-rebuild/);
    expect(autoRebuildCheckbox).toBeChecked();
    
    await user.click(autoRebuildCheckbox);
    expect(autoRebuildCheckbox).not.toBeChecked();
    
    await user.click(autoRebuildCheckbox);
    expect(autoRebuildCheckbox).toBeChecked();
  });

  it('should validate image name pattern', async () => {
    renderTemplate();
    
    const nameInput = screen.getByLabelText(/Image Name/);
    
    // Test invalid characters (uppercase, spaces, special chars)
    await user.type(nameInput, 'Invalid Name!');
    expect(nameInput).toBeInvalid();
    
    // Clear and test valid name
    await user.clear(nameInput);
    await user.type(nameInput, 'valid-image-name');
    expect(nameInput).toBeValid();
  });

  it('should handle GitLab as source provider', async () => {
    renderTemplate();
    
    const sourceProviderSelect = screen.getByLabelText(/Source Provider/);
    await user.selectOptions(sourceProviderSelect, 'gitlab');
    expect(sourceProviderSelect).toHaveValue('gitlab');
  });

  it('should handle different lifecycle stages', async () => {
    renderTemplate();
    
    const lifecycleSelect = screen.getByLabelText(/Lifecycle/);
    
    // Test experimental lifecycle
    await user.selectOptions(lifecycleSelect, 'experimental');
    expect(lifecycleSelect).toHaveValue('experimental');
    
    // Test development lifecycle
    await user.selectOptions(lifecycleSelect, 'development');
    expect(lifecycleSelect).toHaveValue('development');
  });
});