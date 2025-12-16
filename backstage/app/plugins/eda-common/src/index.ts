/***/
/**
 * Common functionalities for the eda plugin.
 *
 * @packageDocumentation
 */

export { eventEntityV1alpha1Validator } from './EventEntityV1alpha1';
export type {
  EventEntityV1alpha1 as EventEntity,
  EventEntityV1alpha1,
} from './EventEntityV1alpha1';

// Export schema as a constant to avoid JSON import issues in builds
import eventSchemaJson from './schema/kinds/Event.v1alpha1.schema.json';
export const eventSchemaV1alpha1 = eventSchemaJson;
