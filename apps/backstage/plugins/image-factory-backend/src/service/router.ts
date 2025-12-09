import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { InputError, ConflictError } from '@backstage/errors';
import express from 'express';
import Router from 'express-promise-router';
import { EnrollmentService } from './EnrollmentService';
import { CatalogService } from './CatalogService';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config } = options;

  const enrollmentService = new EnrollmentService(logger, config);
  const catalogService = new CatalogService(logger);

  const router = Router();
  router.use(express.json());

  // Health check endpoint
  router.get('/health', (_, response) => {
    logger.debug('Health check requested');
    response.json({ status: 'ok' });
  });

  // POST /api/image-factory/images - Enroll a new managed image
  router.post('/images', async (request, response) => {
    const imageName = request.body?.name || 'unknown';
    logger.info('Received enrollment request', {
      imageName,
    });

    try {
      const result = await enrollmentService.enrollImage(request.body);
      logger.info('Successfully enrolled image', {
        imageName,
        pullRequestUrl: result.pullRequestUrl,
      });
      response.status(201).json(result);
    } catch (error) {
      if (error instanceof InputError) {
        logger.warn('Invalid enrollment data', {
          imageName,
          error: error.message,
        });
        response.status(400).json({
          error: 'Bad Request',
          message: error.message,
        });
        return;
      }
      if (error instanceof ConflictError) {
        logger.warn('Image already enrolled', {
          imageName,
          error: error.message,
        });
        response.status(409).json({
          error: 'Conflict',
          message: error.message,
        });
        return;
      }
      logger.error('Failed to enroll image', {
        imageName,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  });

  // GET /api/image-factory/images - List all enrolled images
  router.get('/images', async (_, response) => {
    logger.debug('Listing all images');

    try {
      const images = await catalogService.listImages();
      logger.debug('Successfully listed images', {
        count: images.length,
      });
      response.json({ images });
    } catch (error) {
      logger.error('Failed to list images', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  });

  // GET /api/image-factory/images/:name - Get image details
  router.get('/images/:name', async (request, response) => {
    const { name } = request.params;
    logger.debug('Getting image details', { name });

    try {
      const image = await catalogService.getImage(name);
      if (!image) {
        logger.warn('Image not found', { name });
        response.status(404).json({
          error: 'Not Found',
          message: `Image '${name}' not found`,
        });
        return;
      }
      logger.debug('Successfully retrieved image details', { name });
      response.json(image);
    } catch (error) {
      logger.error('Failed to get image details', {
        name,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  });

  // Error handler middleware
  router.use(
    (
      error: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      logger.error('Request failed', {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message,
      });
    },
  );

  return router;
}
