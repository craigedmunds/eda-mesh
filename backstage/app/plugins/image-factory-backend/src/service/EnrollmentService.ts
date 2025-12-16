import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { InputError } from '@backstage/errors';
import {
  validateEnrollmentData,
  type EnrollmentData,
} from '@internal/backstage-plugin-image-factory-common';
import { GitHubService } from './GitHubService';

export class EnrollmentService {
  private readonly githubService: GitHubService;

  constructor(
    private readonly logger: LoggerService,
    config: Config,
  ) {
    this.githubService = new GitHubService(logger, config);
  }

  async enrollImage(data: Partial<EnrollmentData>): Promise<{
    success: boolean;
    pullRequestUrl: string;
  }> {
    this.logger.info('Validating enrollment data');

    // Validate input data
    const validationResult = validateEnrollmentData(data);
    if (!validationResult.valid) {
      const errorMessages = validationResult.errors
        .map(e => `${e.field}: ${e.message}`)
        .join(', ');
      throw new InputError(`Validation failed: ${errorMessages}`);
    }

    const enrollmentData = data as EnrollmentData;

    this.logger.info('Creating pull request for image enrollment', {
      imageName: enrollmentData.name,
    });

    // Create PR to add image to images.yaml
    const pullRequestUrl = await this.githubService.createEnrollmentPR(
      enrollmentData,
    );

    this.logger.info('Successfully created enrollment PR', {
      imageName: enrollmentData.name,
      pullRequestUrl,
    });

    return {
      success: true,
      pullRequestUrl,
    };
  }
}
