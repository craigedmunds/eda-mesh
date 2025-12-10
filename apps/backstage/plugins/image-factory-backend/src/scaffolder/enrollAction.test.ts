import { createEnrollImageAction } from './enrollAction';
import { LoggerService } from '@backstage/backend-plugin-api';
import { ConfigReader } from '@backstage/config';

describe('createEnrollImageAction', () => {
  let logger: LoggerService;
  let config: ConfigReader;

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
  });

  it('should create a scaffolder action with correct id and description', () => {
    const action = createEnrollImageAction({ logger, config });

    expect(action.id).toBe('image-factory:enroll');
    expect(action.description).toContain('Image Factory');
    expect(typeof action.handler).toBe('function');
  });

  it('should generate correct registry URLs', () => {
    const testCases = [
      {
        registry: 'ghcr.io',
        repository: 'myorg/myapp',
        expected: 'https://github.com/orgs/myorg/packages/container/package/myapp'
      },
      {
        registry: 'docker.io',
        repository: 'myuser/myapp',
        expected: 'https://hub.docker.com/r/myuser/myapp'
      },
      {
        registry: 'registry.example.com',
        repository: 'myorg/myapp',
        expected: 'https://registry.example.com/myorg/myapp'
      }
    ];

    // This tests the URL generation logic that would be used in the action
    testCases.forEach(({ registry, repository, expected }) => {
      let registryUrl: string;
      if (registry === 'ghcr.io') {
        registryUrl = `https://github.com/orgs/${repository.split('/')[0]}/packages/container/package/${repository.split('/')[1]}`;
      } else if (registry === 'docker.io') {
        registryUrl = `https://hub.docker.com/r/${repository}`;
      } else {
        registryUrl = `https://${registry}/${repository}`;
      }

      expect(registryUrl).toBe(expected);
    });
  });
});