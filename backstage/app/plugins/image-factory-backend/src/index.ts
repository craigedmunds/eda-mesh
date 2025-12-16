/**
 * Backend plugin for image-factory enrollment and management
 *
 * @packageDocumentation
 */

export { imageFactoryPlugin as default } from './plugin';
export * from './service/router';
export { createEnrollImageAction } from './scaffolder/enrollAction';
export { imageFactoryScaffolderModule } from './scaffolder/module';
