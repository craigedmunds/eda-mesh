import { EnrollmentService } from './EnrollmentService';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';

describe('EnrollmentService', () => {
  const mockLogger = mockServices.logger.mock();
  const mockConfig = new ConfigReader({
    imageFactory: {
      gitRepo: 'https://github.com/test/repo.git',
      gitBranch: 'main',
      imagesYamlPath: 'image-factory/images.yaml',
      github: {
        token: 'test-token',
      },
    },
  });

  it('should validate enrollment data', async () => {
    const service = new EnrollmentService(mockLogger, mockConfig);

    const invalidData = {
      name: 'INVALID-NAME',
      registry: 'ghcr.io',
      repository: 'test/repo',
    };

    await expect(service.enrollImage(invalidData)).rejects.toThrow(
      'Validation failed',
    );
  });

  it('should reject enrollment with missing required fields', async () => {
    const service = new EnrollmentService(mockLogger, mockConfig);

    const incompleteData = {
      name: 'test-image',
    };

    await expect(service.enrollImage(incompleteData)).rejects.toThrow(
      'Validation failed',
    );
  });
});
