import { test, expect } from '@playwright/test';

test.describe('Simple Backstage Navigation Test', () => {
  test('should access Backstage catalog directly', async ({ page }) => {
    // Try accessing the catalog directly
    await page.goto('/catalog');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ path: 'debug-catalog-direct.png', fullPage: true });
    
    console.log('Page title:', await page.title());
    console.log('Page URL:', page.url());
    
    // Check if we're on the catalog page
    const bodyText = await page.locator('body').textContent();
    console.log('Page content preview:', bodyText?.substring(0, 300));
    
    // Look for catalog-specific elements
    const catalogElements = [
      'text="Catalog"',
      '[data-testid="catalog"]',
      'text="Components"',
      'text="APIs"',
      'text="Systems"',
      'text="Domains"',
      'text="Resources"'
    ];
    
    for (const selector of catalogElements) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        console.log(`Found catalog element: ${selector}`);
      }
    }
    
    // Check navigation
    const navLinks = await page.locator('nav a, [role="navigation"] a, .MuiDrawer a').all();
    console.log(`Found ${navLinks.length} navigation links`);
    
    for (let i = 0; i < Math.min(navLinks.length, 10); i++) {
      const text = await navLinks[i].textContent();
      const href = await navLinks[i].getAttribute('href');
      console.log(`Nav link ${i}: "${text}" -> ${href}`);
    }
  });

  test('should try create page directly', async ({ page }) => {
    // Try accessing the create page directly
    await page.goto('/create');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ path: 'debug-create-direct.png', fullPage: true });
    
    console.log('Create page title:', await page.title());
    console.log('Create page URL:', page.url());
    
    // Check if we're on the create page
    const bodyText = await page.locator('body').textContent();
    console.log('Create page content preview:', bodyText?.substring(0, 300));
    
    // Look for template-related elements
    const templateElements = [
      'text="Templates"',
      'text="Software Templates"',
      'text="Create Component"',
      'text="Choose a template"',
      '[data-testid="template"]',
      '.template-card',
      'text="Enroll Managed Image"'
    ];
    
    for (const selector of templateElements) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        console.log(`Found template element: ${selector}`);
      }
    }
  });
});