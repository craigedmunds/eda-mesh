import {
  CatalogProcessor,
  CatalogProcessorEmit,
  processingResult,
} from '@backstage/plugin-catalog-node';
import { LoggerService } from '@backstage/backend-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import {
  managedImageEntityV1alpha1Validator,
  baseImageEntityV1alpha1Validator,
} from '@internal/backstage-plugin-image-factory-common';

/**
 * Catalog processor for image-factory entity kinds
 *
 * @public
 */
export class ImageFactoryEntitiesProcessor implements CatalogProcessor {
  private logger: LoggerService;

  private readonly validators = [
    managedImageEntityV1alpha1Validator,
    baseImageEntityV1alpha1Validator,
  ];

  constructor(options: { logger: LoggerService }) {
    this.logger = options.logger;
    this.logger.info('ImageFactoryEntitiesProcessor initialized');
  }

  getProcessorName(): string {
    return 'ImageFactoryEntitiesProcessor';
  }

  async validateEntityKind(entity: Entity): Promise<boolean> {
    this.logger.debug(
      `Validating entity kind: ${entity.kind} (apiVersion: ${entity.apiVersion})`,
    );

    for (const validator of this.validators) {
      if (await validator.check(entity)) {
        this.logger.debug(
          `Entity ${entity.metadata.name} validated as ${entity.kind}`,
        );
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
    if (
      entity.apiVersion === 'image-factory.io/v1alpha1' &&
      entity.kind === 'ManagedImage'
    ) {
      // Emit dependsOn relations for base images
      const dependsOn = (entity.spec?.dependsOn as Array<{ resource: string; type: string }>) || [];
      for (const dep of dependsOn) {
        if (dep.type === 'base-image') {
          emit(
            processingResult.relation({
              source: {
                kind: entity.kind,
                namespace: entity.metadata.namespace || 'default',
                name: entity.metadata.name,
              },
              type: 'dependsOn',
              target: {
                kind: 'BaseImage',
                namespace: 'default',
                name: dep.resource,
              },
            }),
          );
        }
      }
    }

    if (
      entity.apiVersion === 'image-factory.io/v1alpha1' &&
      entity.kind === 'BaseImage'
    ) {
      // Emit dependencyOf relations for managed images
      const dependents = (entity.spec?.dependents as Array<{ resource: string; type: string }>) || [];
      for (const dep of dependents) {
        if (dep.type === 'managed-image') {
          emit(
            processingResult.relation({
              source: {
                kind: entity.kind,
                namespace: entity.metadata.namespace || 'default',
                name: entity.metadata.name,
              },
              type: 'dependencyOf',
              target: {
                kind: 'ManagedImage',
                namespace: 'default',
                name: dep.resource,
              },
            }),
          );
        }
      }
    }

    return entity;
  }
}
