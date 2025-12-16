import {
  coreServices,
  createBackendModule
} from '@backstage/backend-plugin-api';

import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';

import { EventEntitiesProcessor } from './module/processor/EventEntitiesProcessor';

export const catalogModuleEda = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'eda',
  register(reg) {
    reg.registerInit({
      deps: {
        logger: coreServices.logger,
        catalog: catalogProcessingExtensionPoint,
      },
      async init({ logger, catalog }) {
        logger.info('eda loaded');

        logger.info('Adding EventEntitiesProcessor');
        catalog.addProcessor(new EventEntitiesProcessor({ logger }));
      },
    });
  },
});
