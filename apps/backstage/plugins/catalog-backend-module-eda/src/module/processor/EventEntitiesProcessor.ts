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
    _location: LocationSpec,
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
            const topic =
              channelValue?.bindings?.kafka?.topic ??
              channelValue?.address ??
              channelName;

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

                const eventName = `${entity.metadata.name}-${messageName}`;
                const parentRef = stringifyEntityRef(entity);
                const eventEntity: EventEntityV1alpha1 = {
                  apiVersion: 'eda.io/v1alpha1',
                  kind: 'Event',
                  metadata: {
                    name: eventName.toLowerCase(),
                    annotations: {
                      'backstage.io/parent': parentRef,
                    },
                  },
                  spec: {
                    type: 'asyncapi',
                    lifecycle: entity.spec?.lifecycle ?? 'experimental',
                    owner: entity.spec?.owner,
                    system: entity.spec?.system,
                    channel: channelName,
                    topic,
                    messageName,
                    message: resolvedMessage,
                    apiRef: parentRef,
                  },
                };
                emit(processingResult.entity(eventEntity));
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
