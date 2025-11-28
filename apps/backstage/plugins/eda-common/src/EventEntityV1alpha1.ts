import type { Entity } from '@backstage/catalog-model';
import schema from './schema/kinds/Event.v1alpha1.schema.json';
import { ajvCompiledJsonSchemaValidator } from './util';
/**
 * 
/**
 * Backstage Event kind Entity. Events describe the interfaces for Components to communicate.
 *
 * @remarks
 *
 * See {@link https://backstage.io/docs/features/software-catalog/system-model}
 *
 * @public
 */
export interface EventEntityV1alpha1 extends Entity {
  apiVersion: 'eda.io/v1alpha1' | 'eda.io/v1beta1';
  kind: 'Event';
  spec: {
    type: string;
    lifecycle: string;
    owner: string;
    definition: string;
    system?: string;
  };
}

/**
 * {@link KindValidator} for {@link EventEntityV1alpha1}.
 *
 * @public
 */
export const eventEntityV1alpha1Validator =
  ajvCompiledJsonSchemaValidator(schema);