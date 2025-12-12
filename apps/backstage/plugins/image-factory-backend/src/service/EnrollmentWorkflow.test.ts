/**
 * Integration test for the complete enrollment workflow
 * Tests the end-to-end flow from API request to PR creation
 */

import { LoggerService } from '@backstage/backend-plugin-api';
import { ConfigReader } from '@backstage/config';
import { EnrollmentService } from './EnrollmentService';
import { validateEnrollmentData, EnrollmentData } from '@internal/backstage-plugin-image-factory-common';

// Mock fetch for GitHub API calls
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('Complete Enrollment Workflow', () => {
  let enrollmentService: EnrollmentService;
  let logger: LoggerService;
  let config: ConfigReader;

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

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;
    config = new ConfigReader({
      imageFactory: {
        gitRepo: 'https://github.com/test/repo.git',
        gitBranch: 'main',
        imagesYamlPath: 'image-factory/images.yaml',
        github: {
          token: 'test-token',
        },
      },
    });

    enrollmentService = new EnrollmentService(logger, config);
    jest.clearAllMocks();
  });

  describe('Validation', () => {
    it('should validate enrollment data correctly', () => {
      const result = validateEnrollmentData(validEnrollmentData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid enrollment data', () => {
      const invalidData = {
        ...validEnrollmentData,
        name: 'Invalid_Name!', // Invalid characters
        registry: '', // Empty required field
      };

      const result = validateEnrollmentData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
      expect(result.errors.some(e => e.field === 'registry')).toBe(true);
    });

    it('should validate rebuild delay format', () => {
      const testCases = [
        { delay: '7d', valid: true },
        { delay: '24h', valid: true },
        { delay: '30m', valid: true },
        { delay: '7days', valid: false },
        { delay: '24', valid: false },
        { delay: 'invalid', valid: false },
      ];

      testCases.forEach(({ delay, valid }) => {
        const data = {
          ...validEnrollmentData,
          rebuildPolicy: {
            ...validEnrollmentData.rebuildPolicy,
            delay,
          },
        };

        const result = validateEnrollmentData(data);
        expect(result.valid).toBe(valid);
        if (!valid) {
          expect(result.errors.some(e => e.field === 'rebuildPolicy.delay')).toBe(true);
        }
      });
    });
  });

  describe('GitHub Integration', () => {
    beforeEach(() => {
      // Mock successful GitHub API responses
      mockFetch
        // Get reference
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            object: { sha: 'base-sha-123' }
          }),
        })
        // Create branch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        // Get file content
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            content: Buffer.from('[]').toString('base64'), // Empty images.yaml
            sha: 'file-sha-123',
          }),
        })
        // Update file
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        // Create PR
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            html_url: 'https://github.com/test/repo/pull/123',
          }),
        });
    });

    it('should complete the full enrollment workflow', async () => {
      const result = await enrollmentService.enrollImage(validEnrollmentData);

      expect(result.success).toBe(true);
      expect(result.pullRequestUrl).toBe('https://github.com/test/repo/pull/123');

      // Verify GitHub API calls
      expect(mockFetch).toHaveBeenCalledTimes(5);
      
      // Verify branch creation
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/git/refs'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('refs/heads/enroll-image-test-image'),
        })
      );

      // Verify file update with correct content
      const updateCall = mockFetch.mock.calls.find(call => 
        call[0].includes('/contents/') && call[1].method === 'PUT'
      );
      expect(updateCall).toBeDefined();
      
      const updateBody = JSON.parse(updateCall[1].body);
      const updatedContent = Buffer.from(updateBody.content, 'base64').toString();
      const parsedContent = JSON.parse(updatedContent);
      
      expect(parsedContent).toHaveLength(1);
      expect(parsedContent[0]).toMatchObject({
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

      // Verify PR creation
      const prCall = mockFetch.mock.calls.find(call => 
        call[0].includes('/pulls') && call[1].method === 'POST'
      );
      expect(prCall).toBeDefined();
      
      const prBody = JSON.parse(prCall[1].body);
      expect(prBody.title).toBe('Enroll image: test-image');
      expect(prBody.body).toContain('test-image');
      expect(prBody.body).toContain('ghcr.io');
      expect(prBody.body).toContain('test/test-image');
    });

    it('should handle duplicate image enrollment', async () => {
      // Mock existing images.yaml with the same image
      const existingImages = [
        {
          name: 'test-image',
          registry: 'ghcr.io',
          repository: 'existing/test-image',
        }
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            object: { sha: 'base-sha-123' }
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            content: Buffer.from(JSON.stringify(existingImages)).toString('base64'),
            sha: 'file-sha-123',
          }),
        });

      await expect(enrollmentService.enrollImage(validEnrollmentData))
        .rejects
        .toThrow("Image 'test-image' is already enrolled");
    });

    it('should handle GitHub API failures gracefully', async () => {
      // Mock GitHub API failure
      mockFetch.mockRejectedValueOnce(new Error('GitHub API Error'));

      await expect(enrollmentService.enrollImage(validEnrollmentData))
        .rejects
        .toThrow('GitHub API Error');
    });

    it('should clean up branch on PR creation failure', async () => {
      // Mock successful operations until PR creation fails
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            object: { sha: 'base-sha-123' }
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            content: Buffer.from('[]').toString('base64'),
            sha: 'file-sha-123',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        // PR creation fails
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Forbidden',
          text: () => Promise.resolve('PR creation failed'),
        })
        // Branch cleanup
        .mockResolvedValueOnce({
          ok: true,
        });

      await expect(enrollmentService.enrollImage(validEnrollmentData))
        .rejects
        .toThrow('Failed to create pull request');

      // Verify branch cleanup was attempted
      const deleteCall = mockFetch.mock.calls.find(call => 
        call[1]?.method === 'DELETE' && call[0].includes('/git/refs/heads/')
      );
      expect(deleteCall).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate GitHub repository URL format', () => {
      const invalidConfig = new ConfigReader({
        imageFactory: {
          gitRepo: 'invalid-url',
          gitBranch: 'main',
          imagesYamlPath: 'images.yaml',
          github: { token: 'test-token' },
        },
      });

      expect(() => new EnrollmentService(logger, invalidConfig))
        .toThrow('Invalid GitHub repository URL');
    });

    it('should handle missing configuration gracefully', () => {
      const incompleteConfig = new ConfigReader({
        imageFactory: {
          gitRepo: 'https://github.com/test/repo.git',
          // Missing other required fields
        },
      });

      expect(() => new EnrollmentService(logger, incompleteConfig))
        .toThrow();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network timeouts', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      await expect(enrollmentService.enrollImage(validEnrollmentData))
        .rejects
        .toThrow('Network timeout');
    });

    it('should handle malformed GitHub responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null), // Malformed response
      });

      await expect(enrollmentService.enrollImage(validEnrollmentData))
        .rejects
        .toThrow();
    });
  });

  describe('Data Transformation', () => {
    it('should correctly transform enrollment data to images.yaml format', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            object: { sha: 'base-sha-123' }
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            content: Buffer.from('[]').toString('base64'),
            sha: 'file-sha-123',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            html_url: 'https://github.com/test/repo/pull/123',
          }),
        });

      await enrollmentService.enrollImage(validEnrollmentData);

      // Extract the file update call
      const updateCall = mockFetch.mock.calls.find(call => 
        call[0].includes('/contents/') && call[1].method === 'PUT'
      );
      
      const updateBody = JSON.parse(updateCall[1].body);
      const updatedContent = Buffer.from(updateBody.content, 'base64').toString();
      const parsedContent = JSON.parse(updatedContent);
      
      // Verify the transformation excludes metadata fields not needed in images.yaml
      expect(parsedContent[0]).not.toHaveProperty('metadata');
      
      // Verify required fields are present
      expect(parsedContent[0]).toHaveProperty('name');
      expect(parsedContent[0]).toHaveProperty('registry');
      expect(parsedContent[0]).toHaveProperty('repository');
      expect(parsedContent[0]).toHaveProperty('source');
      expect(parsedContent[0]).toHaveProperty('rebuildDelay');
      expect(parsedContent[0]).toHaveProperty('autoRebuild');
    });
  });
});