import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { processingResult } from '@backstage/plugin-catalog-node';
import { LoggerService } from '@backstage/backend-plugin-api';
import { EventEntitiesProcessor } from './EventEntitiesProcessor';

const noopLogger: LoggerService = {
  child: () => noopLogger,
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

describe('EventEntitiesProcessor integration (examples/entities.yaml)', () => {
  it('emits events from example asyncapi API', async () => {
    const examplesPath = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      'examples',
      'entities.yaml',
    );
    const file = fs.readFileSync(examplesPath, 'utf8');
    const entities = yaml.loadAll(file) as any[];
    const apiEntity = entities.find(
      e =>
        e?.apiVersion === 'backstage.io/v1alpha1' &&
        e?.kind === 'API' &&
        e?.metadata?.name === 'example-asyncapi-api',
    );
    expect(apiEntity).toBeDefined();

    const processor = new EventEntitiesProcessor({ logger: noopLogger });
    const emitted: any[] = [];
    const emit = (result: any) => {
      if (result.type === processingResult.entity({}).type) {
        emitted.push(result);
      }
    };

    await processor.postProcessEntity(apiEntity as any, {} as any, emit);

    const names = emitted.map(e => e.entity.metadata.name);
    expect(names).toContain('example-asyncapi-api-usercreated');
    const userCreated = emitted.find(
      e => e.entity.metadata.name === 'example-asyncapi-api-usercreated',
    );
    expect(userCreated.entity.spec.topic).toBe('users');
    expect(userCreated.entity.spec.channel).toBe('userCreated');
    expect(userCreated.entity.spec.messageName).toBe('UserCreated');
  });
});
