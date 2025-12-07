import { LoggerService } from '@backstage/backend-plugin-api';
import yaml from 'js-yaml';
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
        domain: 'user',
        definition: `
asyncapi: '3.0.0'
info:
  title: User Service
  version: '1.0.0'
channels:
  userCreated:
    address: user/created
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
      if (result.type === 'entity') {
        emitted.push(result.entity ?? result.location?.entity);
      }
    };

    await processor.postProcessEntity(
      asyncapiEntity as any,
      { type: 'url', target: 'file://mock' } as any,
      emit
    );

    expect(emitted.length).toBe(1);
    const event = emitted[0];
    expect(event.apiVersion).toBe('eda.io/v1alpha1');
    expect(event.kind).toBe('Event');
    expect(event.metadata.name).toBe('example-asyncapi-api-usercreated');
    expect(event.spec.definition).toBeDefined();

    const def = yaml.load(event.spec.definition) as any;
    expect(Object.keys(def.channels ?? {})).toEqual(['userCreated']);
    const channel = def.channels.userCreated;
    expect(channel?.messages?.UserCreated?.name).toBe('UserCreated');
    expect(channel?.bindings?.kafka?.topic).toBe('users');
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
      if (result.type === 'entity') {
        emitted.push(result.entity ?? result.location?.entity);
      }
    };

    await processor.postProcessEntity(asyncapiEntity as any, {} as any, emit);

    const event = emitted[0];
    expect(event.metadata.name).toBe('example-asyncapi-api-usercreated');
    const def = yaml.load(event.spec.definition) as any;
    
    expect(Object.keys(def.channels ?? {})).toEqual(['userCreated']);
    expect(Object.keys(def.components?.messages ?? {})).toEqual(['UserCreated']);
    
    expect(def.channels.userCreated?.messages?.UserCreated).toBeDefined();
    expect(def.components?.messages?.UserCreated?.name).toBe('UserCreated');
  });

  it('emits one event per channel and scopes definition to that channel', async () => {
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
  userUpdated:
    messages:
      UserUpdated:
        $ref: '#/components/messages/UserUpdated'
components:
  messages:
    UserCreated:
      name: UserCreated
      title: User Created
      summary: Emitted when a new user is created in the system.
    UserUpdated:
      name: UserUpdated
      title: User Updated
      summary: Emitted when a new user is updated in the system.
`,
      },
    };

    const emitted: any[] = [];
    const emit = (result: any) => {
      if (result.type === 'entity') {
        emitted.push(result.entity ?? result.location?.entity);
      }
    };

    await processor.postProcessEntity(asyncapiEntity as any, {} as any, emit);

    expect(emitted.length).toBe(2);

    const userCreated = emitted.find(
      e => e.metadata.name === 'example-asyncapi-api-usercreated',
    )!;
    const createdDef = yaml.load(userCreated.spec.definition) as any;
    
    expect(Object.keys(createdDef.channels).length).toBe(1);
    expect(Object.keys(createdDef.components?.messages).length).toBe(1);
    
    expect(createdDef.channels.userCreated?.messages?.UserCreated).toBeDefined();
    expect(createdDef.components?.messages?.UserCreated?.name).toBe(
      'UserCreated',
    );
    expect(createdDef.channels.userCreated?.messages?.UserUpdated).toBeFalsy();

    const userUpdated = emitted.find(
      e => e.metadata.name === 'example-asyncapi-api-userupdated',
    )!;
    const updatedDef = yaml.load(userUpdated.spec.definition) as any;
    
    expect(Object.keys(updatedDef.channels).length).toBe(1);
    expect(Object.keys(updatedDef.components?.messages).length).toBe(1);

    expect(updatedDef.channels.userUpdated?.messages?.UserUpdated).toBeDefined();
    expect(updatedDef.components?.messages?.UserUpdated?.name).toBe(
      'UserUpdated',
    );
    expect(updatedDef.channels.userUpdated?.messages?.UserCreated).toBeFalsy();
  });
});
