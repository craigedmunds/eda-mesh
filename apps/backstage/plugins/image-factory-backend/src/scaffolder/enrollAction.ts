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
      input: (zod) => zod.object({
        name: zod.string().describe('Unique identifier for the image'),
        registry: zod.string().describe('Registry where the image is stored'),
        repository: zod.string().describe('Repository path in registry'),
        source: zod.object({
          provider: zod.enum(['github', 'gitlab']).describe('Source provider'),
          repo: zod.string().describe('Source repository'),
          branch: zod.string().describe('Git branch'),
          dockerfile: zod.string().describe('Dockerfile path'),
          workflow: zod.string().describe('Build workflow'),
        }),
        rebuildPolicy: zod.object({
          delay: zod.string().describe('Rebuild delay'),
          autoRebuild: zod.boolean().describe('Auto-rebuild enabled'),
        }),
        metadata: zod.object({
          title: zod.string().optional().describe('Display title'),
          description: zod.string().optional().describe('Description'),
          owner: zod.string().optional().describe('Owner'),
          system: zod.string().optional().describe('System'),
          lifecycle: zod.string().optional().describe('Lifecycle'),
        }).optional(),
      }),
      output: (zod) => zod.object({
        pullRequestUrl: zod.string().describe('URL of the created pull request'),
        registryUrl: zod.string().describe('URL to the container registry page'),
      }),
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
        name,
        registry,
        repository,
        source,
        rebuildPolicy,
        metadata,
      };

      try {
        // Use the existing enrollment service
        const enrollmentService = new EnrollmentService(logger, config);
        const result = await enrollmentService.enrollImage(enrollmentData);

        // Generate registry URL based on registry type
        let registryUrl: string;
        if (registry === 'ghcr.io') {
          const repoParts = repository.split('/');
          registryUrl = `https://github.com/orgs/${repoParts[0]}/packages/container/package/${repoParts[1]}`;
        } else if (registry === 'docker.io') {
          registryUrl = `https://hub.docker.com/r/${repository}`;
        } else {
          registryUrl = `https://${registry}/${repository}`;
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