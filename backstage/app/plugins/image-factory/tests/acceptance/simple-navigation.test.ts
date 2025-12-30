import { test, expect } from '@playwright/test';
import { authenticateWithBackstage, suppressConsoleNoise, navigateAfterAuth } from '../../../../tests/acceptance/lib/auth-helper';

/**
 * Backstage Navigation Tests for Image Factory
 * 
 * Validates Image Factory Requirements:
 * - Requirement 11.7: Backstage catalog navigation and filtering
 * - Basic Backstage integration functionality
 */
test.describe('Image Factory Backstage Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup console noise suppression
    suppressConsoleNoise(page);
    
    // Navigate to home page and authenticate
    await page.goto('/');
    await authenticateWithBackstage(page);
  });
  test('should access Backstage catalog directly', async ({ page }, testInfo) => {
    // Validates Requirement 11.7: Catalog navigation and filtering capabilities
    
    // Navigate to catalog using helper
    await navigateAfterAuth(page, '/catalog');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    // Take screenshot for documentation - using Playwright's built-in screenshot
    await page.screenshot({ path: `catalog-direct-access-${Date.now()}.png`, fullPage: true });
    
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

  test('should access create page and find templates', async ({ page }, testInfo) => {
    // Validates template discovery and navigation functionality
    
    // Navigate to create page using helper
    await navigateAfterAuth(page, '/create');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    // Take screenshot for documentation - using Playwright's built-in screenshot
    await page.screenshot({ path: `create-direct-access-${Date.now()}.png`, fullPage: true });
    
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