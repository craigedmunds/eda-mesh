import {
  CatalogProcessor, CatalogProcessorEmit, processingResult

} from '@backstage/plugin-catalog-node';

import { LoggerService } from '@backstage/backend-plugin-api';

import { LocationSpec } from '@backstage/plugin-catalog-common'

import {
  Entity,
  getCompoundEntityRef,
  parseEntityRef,
  // RELATION_OWNED_BY,
  // RELATION_OWNER_OF,
 } from '@backstage/catalog-model';

import {
  EventEntityV1alpha1,
  eventEntityV1alpha1Validator,
} from '@internal/backstage-plugin-eda-common';

export class EventEntitiesProcessor implements CatalogProcessor {
  // You often end up wanting to support multiple versions of your kind as you
  // iterate on the definition, so we keep each version inside this array as a
  // convenient pattern.
  // private readonly _logger = coreServices.logger;

  private logger: LoggerService;

  private readonly validators = [
    eventEntityV1alpha1Validator,
  ];

  constructor(options: { logger: LoggerService }) {
    this.logger = options.logger;
    this.logger.info('EventEntitiesProcessor constructor');
    
  }
  
  // Return processor name
  getProcessorName(): string {
    return 'EventEntitiesProcessor'
  }

  // validateEntityKind is responsible for signaling to the catalog processing
  // engine that this entity is valid and should therefore be submitted for
  // further processing.
  async validateEntityKind(entity: Entity): Promise<boolean> {
    this.logger.debug(`EventEntitiesProcessor validateEntityKind entity.apiVersion=${ entity.apiVersion }, entity.kind=${ entity.kind }, entity.metadata.name=${ entity.metadata.name }`);

    for (const validator of this.validators) {
      // If the validator throws an exception, the entity will be marked as
      // invalid.
      if (await validator.check(entity)) {
        return true;
      }
    }

    // Returning false signals that we don't know what this is, passing the
    // responsibility to other processors to try to validate it instead.
    return false;
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
  ): Promise<Entity> {
    const selfRef = getCompoundEntityRef(entity);

    this.logger.debug(`EventEntitiesProcessor postProcessEntity entity.apiVersion=${ entity.apiVersion }, entity.kind=${ entity.kind }, entity.metadata.name=${ entity.metadata.name }`);

    if (
      entity.apiVersion === 'backstage.io/v1alpha1' &&
      entity.kind === 'API' &&
      entity.spec?.type == 'asyncapi'
    ) {
      this.logger.info(`EventEntitiesProcessor postProcessEntity backstage.io/v1alpha1 API found of type asyncapi. entity.metadata.name=${ entity.metadata.name }`);

      // let spec = JSON.parse(entity.spec?.definition as string);

      this.logger.info(spec);
    }

    if (
      entity.apiVersion === 'eda.io/v1alpha1' &&
      entity.kind === 'Event'
    ) {
      const eventEntity = entity as EventEntityV1alpha1;
      const definition = eventEntity.spec.definition;
      const owner = eventEntity.spec.owner;
      if (owner) {
        const ownerRef = parseEntityRef(owner, {
          defaultKind: 'Group',
          defaultNamespace: selfRef.namespace,
        });
      }
      // Typically you will want to emit any relations associated with the
      // entity here.
      // emit(processingResult.relation({ ... }))
    }

    return entity;
  }
}