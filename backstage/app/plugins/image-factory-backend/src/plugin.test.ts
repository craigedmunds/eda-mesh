import { imageFactoryPlugin } from './plugin';

describe('imageFactoryPlugin', () => {
  it('should be defined', () => {
    expect(imageFactoryPlugin).toBeDefined();
  });

  it('should have correct plugin ID', () => {
    expect(imageFactoryPlugin.$$type).toBe('@backstage/BackendFeature');
  });
});
