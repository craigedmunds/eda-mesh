import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
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
      if (result.type === 'entity' && result.entity) {
        emitted.push(result.entity);
      }
    };

    await processor.postProcessEntity(apiEntity as any, {} as any, emit);

    const names = emitted.map(e => e.metadata.name);
    expect(names).toContain('example-asyncapi-api-usercreated');
    const userCreated = emitted.find(
      e => e.metadata.name === 'example-asyncapi-api-usercreated',
    );
    const def = yaml.load(userCreated.spec.definition) as any;
    expect(Object.keys(def.channels ?? {})).toEqual(['userCreated']);
    expect(def.channels.userCreated?.messages?.UserCreated).toBeDefined();
    expect(def.components?.messages?.UserCreated?.payload).toBeDefined();
  });
});
