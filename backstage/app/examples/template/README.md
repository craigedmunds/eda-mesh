# Image Factory Templates

This directory contains Software Templates for the Image Factory system.

## Enroll Managed Image Template

The `enroll-image-template.yaml` template allows developers to register container images for automated dependency tracking and rebuilds through Backstage's "Create a new component" workflow.

### Usage

1. Navigate to **"Create a new component"** in Backstage
2. Select **"Enroll Managed Image"** template
3. Fill out the form with your image details:
   - **Image Information**: Name, registry, repository path
   - **Source Information**: GitHub/GitLab repo, branch, Dockerfile path, workflow
   - **Rebuild Policy**: Delay settings and auto-rebuild preferences
   - **Metadata**: Optional title, description, owner information

4. Submit the form to create a pull request
5. Review and merge the PR to complete enrollment

### What Happens After Enrollment

1. **Analysis**: The Image Factory analyzes your Dockerfile to discover base image dependencies
2. **Monitoring**: Automatic monitoring is set up for your base images
3. **Catalog Entity**: A ManagedImage entity appears in the Backstage catalog
4. **Rebuild Triggers**: Automated rebuild triggers are configured based on your policy

### Template Features

- **Validation**: Real-time form validation with helpful error messages
- **GitOps**: All changes go through pull request review
- **Flexibility**: Support for both GitHub and GitLab source providers
- **Customization**: Configurable rebuild policies and metadata
- **Integration**: Seamless integration with Backstage's existing workflows

### Configuration

The template uses the `image-factory:enroll` scaffolder action, which requires:

- Image Factory backend plugin installed and configured
- GitHub token with repository access
- Proper `imageFactory` configuration in `app-config.yaml`

### Example Output

After successful enrollment, you'll receive:
- **Pull Request URL**: Link to review the enrollment changes
- **Registry URL**: Direct link to your container registry
- **Next Steps**: Guidance on what happens after PR merge

This template provides a Backstage-native way to onboard container images into the Image Factory system, following established patterns and providing a familiar developer experience.