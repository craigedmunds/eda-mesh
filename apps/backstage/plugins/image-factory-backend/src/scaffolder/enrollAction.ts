import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { EnrollmentData } from '@internal/backstage-plugin-image-factory-common';
import { EnrollmentService } from '../service/EnrollmentService';
import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';

/**
 * Custom scaffolder action for enrolling images in the Image Factory
 */
export function createEnrollImageAction(options: {
  logger: LoggerService;
  config: Config;
}) {
  const { logger, config } = options;

  return createTemplateAction({
    id: 'image-factory:enroll',
    description: 'Enrolls a container image in the Image Factory system for automated dependency tracking and rebuilds',
    schema: {
      input: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            title: 'Image Name',
            description: 'Unique identifier for the image'
          },
          registry: {
            type: 'string',
            title: 'Registry',
            description: 'Registry where the image is stored'
          },
          repository: {
            type: 'string',
            title: 'Repository',
            description: 'Repository path in registry'
          },
          source: {
            type: 'object',
            title: 'Source',
            properties: {
              provider: {
                type: 'string',
                enum: ['github', 'gitlab'],
                title: 'Provider',
                description: 'Source provider'
              },
              repo: {
                type: 'string',
                title: 'Repository',
                description: 'Source repository'
              },
              branch: {
                type: 'string',
                title: 'Branch',
                description: 'Git branch'
              },
              dockerfile: {
                type: 'string',
                title: 'Dockerfile',
                description: 'Dockerfile path'
              },
              workflow: {
                type: 'string',
                title: 'Workflow',
                description: 'Build workflow'
              }
            },
            required: ['provider', 'repo', 'branch', 'dockerfile', 'workflow']
          },
          rebuildPolicy: {
            type: 'object',
            title: 'Rebuild Policy',
            properties: {
              delay: {
                type: 'string',
                title: 'Delay',
                description: 'Rebuild delay'
              },
              autoRebuild: {
                type: 'boolean',
                title: 'Auto Rebuild',
                description: 'Auto-rebuild enabled'
              }
            },
            required: ['delay', 'autoRebuild']
          },
          metadata: {
            type: 'object',
            title: 'Metadata',
            properties: {
              title: {
                type: 'string',
                title: 'Title',
                description: 'Display title'
              },
              description: {
                type: 'string',
                title: 'Description',
                description: 'Description'
              },
              owner: {
                type: 'string',
                title: 'Owner',
                description: 'Owner'
              },
              system: {
                type: 'string',
                title: 'System',
                description: 'System'
              },
              lifecycle: {
                type: 'string',
                title: 'Lifecycle',
                description: 'Lifecycle'
              }
            }
          }
        },
        required: ['name', 'registry', 'repository', 'source', 'rebuildPolicy']
      },
      output: {
        type: 'object',
        properties: {
          pullRequestUrl: {
            type: 'string',
            title: 'Pull Request URL',
            description: 'URL of the created pull request'
          },
          registryUrl: {
            type: 'string',
            title: 'Registry URL',
            description: 'URL to the container registry page'
          }
        }
      }
    },
    async handler(ctx) {
      const {
        name,
        registry,
        repository,
        source,
        rebuildPolicy,
        metadata,
      } = ctx.input;

      ctx.logger.info(`Enrolling image: ${name}`);

      // Create enrollment data
      const enrollmentData: EnrollmentData = {
        name: name as string,
        registry: registry as string,
        repository: repository as string,
        source: source as EnrollmentData['source'],
        rebuildPolicy: rebuildPolicy as EnrollmentData['rebuildPolicy'],
        metadata: metadata as EnrollmentData['metadata'],
      };

      try {
        // Use the existing enrollment service
        const enrollmentService = new EnrollmentService(logger, config);
        const result = await enrollmentService.enrollImage(enrollmentData);

        // Generate registry URL based on registry type
        let registryUrl: string;
        const registryStr = registry as string;
        const repositoryStr = repository as string;
        if (registryStr === 'ghcr.io') {
          const repoParts = repositoryStr.split('/');
          registryUrl = `https://github.com/orgs/${repoParts[0]}/packages/container/package/${repoParts[1]}`;
        } else if (registryStr === 'docker.io') {
          registryUrl = `https://hub.docker.com/r/${repositoryStr}`;
        } else {
          registryUrl = `https://${registryStr}/${repositoryStr}`;
        }

        ctx.logger.info(`Successfully enrolled image: ${name}`, {
          pullRequestUrl: result.pullRequestUrl,
          registryUrl,
        });

        ctx.output('pullRequestUrl', result.pullRequestUrl);
        ctx.output('registryUrl', registryUrl);
      } catch (error) {
        ctx.logger.error(`Failed to enroll image: ${name}`, error as Error);
        throw error;
      }
    },
  });
}