import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { ImageFactoryEntitiesProcessor } from './processor/ImageFactoryEntitiesProcessor';

/**
 * Catalog backend module for image-factory entity kinds
 *
 * @public
 */
export const catalogModuleImageFactory = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'image-factory',
  register(reg) {
    reg.registerInit({
      deps: {
        logger: coreServices.logger,
        catalog: catalogProcessingExtensionPoint,
      },
      async init({ logger, catalog }) {
        logger.info('Registering image-factory catalog module');

        catalog.addProcessor(new ImageFactoryEntitiesProcessor({ logger }));
        
        logger.info('Image-factory entity kinds registered: ManagedImage, BaseImage');
      },
    });
  },
});
