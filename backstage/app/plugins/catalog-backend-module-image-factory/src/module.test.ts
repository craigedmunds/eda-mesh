import { catalogModuleImageFactory } from './module';

describe('catalogModuleImageFactory', () => {
  it('should be defined', () => {
    expect(catalogModuleImageFactory).toBeDefined();
  });

  it('should have correct module configuration', () => {
    expect(catalogModuleImageFactory.$$type).toBe('@backstage/BackendFeature');
  });
});
