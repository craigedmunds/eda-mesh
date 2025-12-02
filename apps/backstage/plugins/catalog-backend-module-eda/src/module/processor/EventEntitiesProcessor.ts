import {
  CatalogProcessor,
  CatalogProcessorEmit,
  processingResult,
} from '@backstage/plugin-catalog-node';
import yaml from 'js-yaml';
import { LoggerService } from '@backstage/backend-plugin-api';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import {
  Entity,
  getCompoundEntityRef,
  parseEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import {
  EventEntityV1alpha1,
  eventEntityV1alpha1Validator,
  eventSchemaV1alpha1,
} from '@internal/backstage-plugin-eda-common';

export class EventEntitiesProcessor implements CatalogProcessor {
  private logger: LoggerService;

  private readonly validators = [eventEntityV1alpha1Validator];

  constructor(options: { logger: LoggerService }) {
    this.logger = options.logger;
    this.logger.info('EventEntitiesProcessor constructor');
  }

  getProcessorName(): string {
    return 'EventEntitiesProcessor';
  }

  async validateEntityKind(entity: Entity): Promise<boolean> {
    this.logger.debug(
      `EventEntitiesProcessor validateEntityKind entity.apiVersion=${entity.apiVersion}, entity.kind=${entity.kind}, entity.metadata.name=${entity.metadata.name}`,
    );

    for (const validator of this.validators) {
      if (await validator.check(entity)) {
        return true;
      }
    }

    return false;
  }

  async postProcessEntity(
    entity: Entity,
    location: LocationSpec,
    emit: CatalogProcessorEmit,
  ): Promise<Entity> {
    const selfRef = getCompoundEntityRef(entity);

    this.logger.debug(
      `EventEntitiesProcessor postProcessEntity entity.apiVersion=${entity.apiVersion}, entity.kind=${entity.kind}, entity.metadata.name=${entity.metadata.name}`,
    );

    if (
      entity.apiVersion === 'backstage.io/v1alpha1' &&
      entity.kind === 'API' &&
      entity.spec?.type == 'asyncapi'
    ) {
      this.logger.info(
        `EventEntitiesProcessor postProcessEntity backstage.io/v1alpha1 API found of type asyncapi. entity.metadata.name=${entity.metadata.name}`,
      );

      const def = entity?.spec?.definition as string | undefined;
      if (def) {
        let parsed: any;
        try {
          parsed = yaml.load(def);
        } catch (e) {
          this.logger.warn(
            `EventEntitiesProcessor failed to parse asyncapi definition for ${entity.metadata.name}: ${String(
              e,
            )}`,
          );
          return entity;
        }

        try {
          const channels = parsed?.channels ?? {};
          Object.entries(channels).forEach(([channelName, channelValue]: any) => {
            const messages = channelValue?.messages ?? {};
            
            Object.entries(messages).forEach(
              ([messageName, messageValue]: any) => {
                let resolvedMessage: any = messageValue;
                const ref = messageValue?.$ref as string | undefined;
                if (ref && ref.startsWith('#/components/messages/')) {
                  const refName = ref.split('/').pop();
                  resolvedMessage =
                    parsed?.components?.messages?.[refName ?? ''] ??
                    messageValue;
                }

                const eventName = `${messageName}`;
                const parentRef = stringifyEntityRef(entity);
                const baseSpec: Record<string, any> = {};
                eventSpecKeys.forEach(key => {
                  if (entity.spec && key in entity.spec) {
                    baseSpec[key] = (entity.spec as any)[key];
                  }
                });
                if (!baseSpec.definition) {
                  baseSpec.definition = def;
                }
                if (!baseSpec.type) {
                  baseSpec.type = 'asyncapi';
                }
                if (!baseSpec.lifecycle) {
                  baseSpec.lifecycle = 'experimental';
                }
                if (!baseSpec.owner) {
                  baseSpec.owner = 'unknown';
                }

                // Pass through domain and subdomain from API labels
                const domain = entity.metadata?.labels?.['eda.io/domain'];
                const subdomain = entity.metadata?.labels?.['eda.io/subdomain'];
                if (domain) {
                  baseSpec.domain = domain;
                }
                if (subdomain) {
                  baseSpec.subdomain = subdomain;
                }

                // Build minimal definition for this event
                // Only include the structure of headers and payload, nothing else
                const eventDefinition: any = {
                  asyncapi: parsed?.asyncapi ?? '3.0.0',
                  defaultContentType: parsed?.defaultContentType,
                  components: {
                    messages: {},
                    schemas: {},
                  },
                };

                // Add minimal info about the event if available from the message
                if (resolvedMessage?.title || resolvedMessage?.summary || resolvedMessage?.description) {
                  eventDefinition.info = {
                    title: resolvedMessage?.title || resolvedMessage?.name || messageName,
                    version: '1.0.0',
                  };
                  if (resolvedMessage?.summary) {
                    eventDefinition.info.description = resolvedMessage.summary;
                  } else if (resolvedMessage?.description) {
                    eventDefinition.info.description = resolvedMessage.description;
                  }
                }

                // Include the message structure (headers and payload only)
                const minimalMessage: any = {
                  name: resolvedMessage?.name || messageName,
                  contentType: resolvedMessage?.contentType,
                };
                
                if (resolvedMessage?.title) minimalMessage.title = resolvedMessage.title;
                if (resolvedMessage?.summary) minimalMessage.summary = resolvedMessage.summary;
                
                // Include payload structure
                if (resolvedMessage?.payload) {
                  minimalMessage.payload = resolvedMessage.payload;
                }
                
                // Include headers structure
                if (resolvedMessage?.headers) {
                  minimalMessage.headers = resolvedMessage.headers;
                }

                eventDefinition.components.messages[messageName] = minimalMessage;

                // Include referenced schemas for payload and headers
                const schemaRefs: string[] = [];
                const maybeAddRef = (r?: string) => {
                  if (r && r.startsWith('#/components/schemas/')) {
                    const name = r.split('/').pop();
                    if (name) schemaRefs.push(name);
                  }
                };
                maybeAddRef(resolvedMessage?.payload?.$ref);
                maybeAddRef(resolvedMessage?.headers?.$ref);
                
                if (schemaRefs.length > 0 && parsed?.components?.schemas) {
                  schemaRefs.forEach(name => {
                    if (parsed.components.schemas[name]) {
                      eventDefinition.components.schemas[name] =
                        parsed.components.schemas[name];
                    }
                  });
                }
                
                // Clean up empty components
                if (Object.keys(eventDefinition.components.schemas).length === 0) {
                  delete eventDefinition.components.schemas;
                }
                if (Object.keys(eventDefinition.components.messages).length === 0) {
                  delete eventDefinition.components.messages;
                }
                if (Object.keys(eventDefinition.components).length === 0) {
                  delete eventDefinition.components;
                }

                baseSpec.definition = yaml.dump(eventDefinition);
                const eventEntity: EventEntityV1alpha1 = {
                  apiVersion: 'eda.io/v1alpha1',
                  kind: 'Event',
                  metadata: {
                    name: eventName.toLowerCase(),
                    annotations: {
                      'backstage.io/parent': parentRef,
                    },
                  },
                  spec: baseSpec as EventEntityV1alpha1['spec'],
                };

                this.logger.info(
                  `EventEntitiesProcessor postProcessEntity emitting event entity.metadata.name=${eventEntity.metadata.name}`,
                );

                emit(processingResult.entity(location, eventEntity));
              },
            );
          });
        } catch (e) {
          this.logger.warn(
            `EventEntitiesProcessor failed to emit events for ${entity.metadata.name}: ${String(
              e,
            )}`,
          );
        }
      }
    }

    if (entity.apiVersion === 'eda.io/v1alpha1' && entity.kind === 'Event') {
      const eventEntity = entity as EventEntityV1alpha1;
      const owner = eventEntity.spec.owner;
      if (owner) {
        parseEntityRef(owner, {
          defaultKind: 'Group',
          defaultNamespace: selfRef.namespace,
        });
      }
    }

    return entity;
  }
}
const eventSpecKeys: string[] =
  (eventSchemaV1alpha1 as any)?.allOf?.[1]?.properties?.spec?.properties
    ? Object.keys(
        (eventSchemaV1alpha1 as any).allOf[1].properties.spec.properties,
      )
    : ['type', 'lifecycle', 'owner', 'system', 'definition'];
