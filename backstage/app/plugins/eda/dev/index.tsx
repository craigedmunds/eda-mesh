import { createDevApp } from '@backstage/dev-utils';
import { edaPlugin, EdaPage } from '../src/plugin';

createDevApp()
  .registerPlugin(edaPlugin)
  .addPage({
    element: <EdaPage />,
    title: 'Root Page',
    path: '/eda',
  })
  .render();
