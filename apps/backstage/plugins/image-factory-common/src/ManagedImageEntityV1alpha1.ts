import type { Entity } from '@backstage/catalog-model';
import schema from './schema/kinds/ManagedImage.v1alpha1.schema.json';
import { ajvCompiledJsonSchemaValidator } from './util';

/**
 * Backstage ManagedImage kind Entity. ManagedImages represent container images
 * that are built and maintained by the organization.
 *
 * @public
 */
export interface ManagedImageEntityV1alpha1 extends Entity {
  apiVersion: 'image-factory.io/v1alpha1';
  kind: 'ManagedImage';
  spec: {
    type: 'managed-image';
    lifecycle: string;
    owner: string;
    system?: string;
    source: {
      provider: 'github' | 'gitlab';
      repo: string;
      branch: string;
      dockerfile: string;
      workflow: string;
    };
    rebuildPolicy: {
      delay: string;
      autoRebuild: boolean;
    };
    dependsOn?: Array<{
      resource: string;
      type: 'base-image';
    }>;
  };
}

/**
 * {@link KindValidator} for {@link ManagedImageEntityV1alpha1}.
 *
 * @public
 */
export const managedImageEntityV1alpha1Validator =
  ajvCompiledJsonSchemaValidator(schema);
