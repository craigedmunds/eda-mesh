import type { Entity } from '@backstage/catalog-model';
import schema from './schema/kinds/BaseImage.v1alpha1.schema.json';
import { ajvCompiledJsonSchemaValidator } from './util';

/**
 * Backstage BaseImage kind Entity. BaseImages represent upstream container images
 * that managed images depend on.
 *
 * @public
 */
export interface BaseImageEntityV1alpha1 extends Entity {
  apiVersion: 'image-factory.io/v1alpha1';
  kind: 'BaseImage';
  spec: {
    type: 'base-image';
    lifecycle: string;
    owner: string;
    system?: string;
    upstream: {
      registry: string;
      repository: string;
      tag: string;
    };
    dependents?: Array<{
      resource: string;
      type: 'managed-image';
    }>;
  };
}

/**
 * {@link KindValidator} for {@link BaseImageEntityV1alpha1}.
 *
 * @public
 */
export const baseImageEntityV1alpha1Validator =
  ajvCompiledJsonSchemaValidator(schema);
