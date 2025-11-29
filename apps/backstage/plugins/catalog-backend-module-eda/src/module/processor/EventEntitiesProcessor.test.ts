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

describe('EventEntitiesProcessor', () => {
  it('emits Event entities for asyncapi APIs with inline message', async () => {
    const processor = new EventEntitiesProcessor({ logger: noopLogger });

    const asyncapiEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'API',
      metadata: {
        name: 'example-asyncapi-api',
      },
      spec: {
        type: 'asyncapi',
        lifecycle: 'experimental',
        owner: 'guests',
        system: 'examples',
        definition: `
asyncapi: '3.0.0'
info:
  title: User Service
  version: '1.0.0'
channels:
  userCreated:
    address: user/signedup
    bindings:
      kafka:
        topic: users
    messages:
      UserCreated:
        name: UserCreated
`,
      },
    };

    const emitted: any[] = [];
    const emit = (result: any) => {
      if (result.type === processingResult.entity({}).type) {
        emitted.push(result);
      }
    };

    await processor.postProcessEntity(asyncapiEntity as any, {} as any, emit);

    expect(emitted.length).toBe(1);
    const event = emitted[0].entity;
    expect(event.apiVersion).toBe('eda.io/v1alpha1');
    expect(event.kind).toBe('Event');
    expect(event.metadata.name).toBe('example-asyncapi-api-usercreated');
    expect(event.spec.topic).toBe('users');
    expect(event.spec.channel).toBe('userCreated');
    expect(event.spec.messageName).toBe('UserCreated');
    expect(event.spec.apiRef).toBe('api:default/example-asyncapi-api');
  });

  it('resolves $ref messages and emits Event entities', async () => {
    const processor = new EventEntitiesProcessor({ logger: noopLogger });

    const asyncapiEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'API',
      metadata: {
        name: 'example-asyncapi-api',
      },
      spec: {
        type: 'asyncapi',
        lifecycle: 'experimental',
        owner: 'guests',
        system: 'examples',
        definition: `
asyncapi: '3.0.0'
info:
  title: User Service
  version: '1.0.0'
channels:
  userCreated:
    messages:
      UserCreated:
        $ref: '#/components/messages/UserCreated'
components:
  messages:
    UserCreated:
      name: UserCreated
      title: User Created
      summary: Emitted when a new user is created in the system.
`,
      },
    };

    const emitted: any[] = [];
    const emit = (result: any) => {
      if (result.type === processingResult.entity({}).type) {
        emitted.push(result);
      }
    };

    await processor.postProcessEntity(asyncapiEntity as any, {} as any, emit);

    expect(emitted.length).toBe(1);
    const event = emitted[0].entity;
    expect(event.metadata.name).toBe('example-asyncapi-api-usercreated');
    expect(event.spec.messageName).toBe('UserCreated');
    expect(event.spec.message?.name).toBe('UserCreated');
  });
});
