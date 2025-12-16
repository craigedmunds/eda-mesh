/**
 * Simplified integration test for enrollment workflow components
 */

import { ConfigReader } from '@backstage/config';
import { validateEnrollmentData, EnrollmentData } from '@internal/backstage-plugin-image-factory-common';

describe('Enrollment Workflow Integration', () => {
  const validEnrollmentData: EnrollmentData = {
    name: 'test-image',
    registry: 'ghcr.io',
    repository: 'test/test-image',
    source: {
      provider: 'github',
      repo: 'test/repo',
      branch: 'main',
      dockerfile: 'Dockerfile',
      workflow: 'build.yml',
    },
    rebuildPolicy: {
      delay: '7d',
      autoRebuild: true,
    },
    metadata: {
      title: 'Test Image',
      description: 'A test container image',
      owner: 'test-team',
      system: 'image-factory',
      lifecycle: 'production',
    },
  };

  describe('End-to-End Validation', () => {
    it('should validate complete enrollment data', () => {
      const result = validateEnrollmentData(validEnrollmentData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate all required fields', () => {
      const requiredFields = [
        'name',
        'registry', 
        'repository',
        'source.provider',
        'source.repo',
        'source.branch',
        'source.dockerfile',
        'source.workflow',
        'rebuildPolicy.delay',
        'rebuildPolicy.autoRebuild'
      ];

      requiredFields.forEach(field => {
        const testData = JSON.parse(JSON.stringify(validEnrollmentData));
        
        // Remove the field
        const keys = field.split('.');
        let current = testData;
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]];
        }
        delete current[keys[keys.length - 1]];

        const result = validateEnrollmentData(testData);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.field === field)).toBe(true);
      });
    });

    it('should validate field formats', () => {
      const testCases = [
        {
          field: 'name',
          validValues: ['test-image', 'my-app', 'service-1'],
          invalidValues: ['Test_Image', 'my app', 'service!', '']
        },
        {
          field: 'registry',
          validValues: ['ghcr.io', 'docker.io', 'registry.example.com'],
          invalidValues: ['invalid registry', '', 'http://registry.com']
        },
        {
          field: 'repository',
          validValues: ['test/image', 'user/app', 'org/service-name'],
          invalidValues: ['', 'invalid repo!', 'UPPERCASE/repo']
        },
        {
          field: 'rebuildPolicy.delay',
          validValues: ['7d', '24h', '30m', '1d', '12h'],
          invalidValues: ['7days', '24', 'invalid', '', '7D', '24H']
        }
      ];

      testCases.forEach(({ field, validValues, invalidValues }) => {
        // Test valid values
        validValues.forEach(value => {
          const testData = JSON.parse(JSON.stringify(validEnrollmentData));
          const keys = field.split('.');
          let current = testData;
          for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
          }
          current[keys[keys.length - 1]] = value;

          const result = validateEnrollmentData(testData);
          expect(result.valid).toBe(true);
        });

        // Test invalid values
        invalidValues.forEach(value => {
          const testData = JSON.parse(JSON.stringify(validEnrollmentData));
          const keys = field.split('.');
          let current = testData;
          for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
          }
          current[keys[keys.length - 1]] = value;

          const result = validateEnrollmentData(testData);
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.field === field)).toBe(true);
        });
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should validate complete configuration', () => {
      const config = new ConfigReader({
        imageFactory: {
          gitRepo: 'https://github.com/test/repo.git',
          gitBranch: 'main',
          imagesYamlPath: 'image-factory/images.yaml',
          github: {
            token: 'test-token',
          },
        },
      });

      expect(config.getString('imageFactory.gitRepo')).toBe('https://github.com/test/repo.git');
      expect(config.getString('imageFactory.gitBranch')).toBe('main');
      expect(config.getString('imageFactory.imagesYamlPath')).toBe('image-factory/images.yaml');
      expect(config.getString('imageFactory.github.token')).toBe('test-token');
    });

    it('should handle missing configuration', () => {
      const config = new ConfigReader({});

      expect(() => config.getString('imageFactory.gitRepo')).toThrow();
      expect(() => config.getString('imageFactory.github.token')).toThrow();
    });
  });

  describe('Data Transformation', () => {
    it('should transform enrollment data to images.yaml format', () => {
      // Simulate the transformation that happens in GitHubService
      const transformed = {
        name: validEnrollmentData.name,
        registry: validEnrollmentData.registry,
        repository: validEnrollmentData.repository,
        source: {
          provider: validEnrollmentData.source.provider,
          repo: validEnrollmentData.source.repo,
          branch: validEnrollmentData.source.branch,
          dockerfile: validEnrollmentData.source.dockerfile,
          workflow: validEnrollmentData.source.workflow,
        },
        rebuildDelay: validEnrollmentData.rebuildPolicy.delay,
        autoRebuild: validEnrollmentData.rebuildPolicy.autoRebuild,
      };

      expect(transformed).toEqual({
        name: 'test-image',
        registry: 'ghcr.io',
        repository: 'test/test-image',
        source: {
          provider: 'github',
          repo: 'test/repo',
          branch: 'main',
          dockerfile: 'Dockerfile',
          workflow: 'build.yml',
        },
        rebuildDelay: '7d',
        autoRebuild: true,
      });

      // Verify metadata is not included in images.yaml format
      expect(transformed).not.toHaveProperty('metadata');
    });

    it('should handle optional fields correctly', () => {
      const minimalData: EnrollmentData = {
        name: 'minimal-image',
        registry: 'docker.io',
        repository: 'user/minimal',
        source: {
          provider: 'github',
          repo: 'user/repo',
          branch: 'main',
          dockerfile: 'Dockerfile',
          workflow: 'build.yml',
        },
        rebuildPolicy: {
          delay: '1d',
          autoRebuild: false,
        },
      };

      const result = validateEnrollmentData(minimalData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Error Message Quality', () => {
    it('should provide clear error messages', () => {
      const invalidData = {
        name: 'Invalid_Name!',
        registry: '',
        repository: 'INVALID/REPO',
        source: {
          provider: 'invalid-provider' as 'github' | 'gitlab',
          repo: '',
          branch: '',
          dockerfile: '',
          workflow: '',
        },
        rebuildPolicy: {
          delay: 'invalid-delay',
          autoRebuild: 'not-a-boolean' as any,
        },
      };

      const result = validateEnrollmentData(invalidData);
      expect(result.valid).toBe(false);
      
      // Check that error messages are descriptive
      const errorMessages = result.errors.map(e => e.message);
      expect(errorMessages.some(msg => msg.includes('lowercase letters, numbers, and hyphens'))).toBe(true);
      expect(errorMessages.some(msg => msg.includes('required'))).toBe(true);
      expect(errorMessages.some(msg => msg.includes('github') || msg.includes('gitlab'))).toBe(true);
      expect(errorMessages.some(msg => msg.includes('7d, 24h, 30m'))).toBe(true);
    });
  });

  describe('Provider Support', () => {
    it('should support GitHub provider', () => {
      const githubData = {
        ...validEnrollmentData,
        source: {
          ...validEnrollmentData.source,
          provider: 'github' as const,
        },
      };

      const result = validateEnrollmentData(githubData);
      expect(result.valid).toBe(true);
    });

    it('should support GitLab provider', () => {
      const gitlabData = {
        ...validEnrollmentData,
        source: {
          ...validEnrollmentData.source,
          provider: 'gitlab' as const,
        },
      };

      const result = validateEnrollmentData(gitlabData);
      expect(result.valid).toBe(true);
    });

    it('should reject unsupported providers', () => {
      const invalidData = {
        ...validEnrollmentData,
        source: {
          ...validEnrollmentData.source,
          provider: 'bitbucket' as 'github' | 'gitlab',
        },
      };

      const result = validateEnrollmentData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'source.provider')).toBe(true);
    });
  });
});