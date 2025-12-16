import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';

/**
 * Image Factory backend plugin
 *
 * @public
 */
export const imageFactoryPlugin = createBackendPlugin({
  pluginId: 'image-factory',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ httpRouter, logger, config }) {
        logger.info('Initializing image-factory backend plugin');
        
        // Set up HTTP router
        const router = await createRouter({
          logger,
          config,
        });

        httpRouter.use(router);
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });

        logger.info('Image-factory backend plugin initialized successfully');
      },
    });
  },
});
