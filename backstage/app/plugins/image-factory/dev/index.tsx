import { createDevApp } from '@backstage/dev-utils';
import { imageFactoryPlugin } from '../src/plugin';

createDevApp()
  .registerPlugin(imageFactoryPlugin)
  .render();