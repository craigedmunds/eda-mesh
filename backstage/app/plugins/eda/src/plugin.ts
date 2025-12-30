import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const edaPlugin = createPlugin({
  id: 'eda',
  routes: {
    root: rootRouteRef,
  },
});

export const EdaPage = edaPlugin.provide(
  createRoutableExtension({
    name: 'EdaPage',
    component: () =>
      import('./components/ExampleComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);
