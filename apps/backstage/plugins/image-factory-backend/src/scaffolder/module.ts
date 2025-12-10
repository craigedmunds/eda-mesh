import { createBackendModule, coreServices } from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node';
import { createEnrollImageAction } from './enrollAction';

/**
 * Scaffolder module for image-factory actions
 */
export const imageFactoryScaffolderModule = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'image-factory-actions',
  register(env) {
    env.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ scaffolder, logger, config }) {
        logger.info('Registering image-factory scaffolder actions');
        
        try {
          scaffolder.addActions(
            createEnrollImageAction({ logger, config })
          );
          logger.info('Image-factory scaffolder actions registered successfully');
        } catch (error) {
          logger.error('Failed to register scaffolder actions', error);
          throw error;
        }
      },
    });
  },
});