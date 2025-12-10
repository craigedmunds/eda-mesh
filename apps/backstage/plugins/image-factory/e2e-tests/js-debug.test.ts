import { test, expect } from '@playwright/test';

test.describe('JavaScript Debug Test', () => {
  test('should check for JavaScript errors and wait for React', async ({ page }) => {
    // Listen for console messages and errors
    page.on('console', msg => console.log('CONSOLE:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    await page.goto('/');
    
    // Wait longer for JavaScript to load
    console.log('Waiting for JavaScript to load...');
    await page.waitForLoadState('networkidle');
    
    // Wait for React to render
    try {
      // Wait for any React element to appear
      await page.waitForSelector('[data-reactroot], #root > div, .App', { timeout: 15000 });
      console.log('React app detected');
    } catch (e) {
      console.log('No React app detected, checking raw HTML...');
    }
    
    // Check if JavaScript is enabled
    const jsEnabled = await page.evaluate(() => {
      return typeof window !== 'undefined' && typeof document !== 'undefined';
    });
    console.log('JavaScript enabled:', jsEnabled);
    
    // Check if React is loaded
    const reactLoaded = await page.evaluate(() => {
      return typeof window.React !== 'undefined' || document.querySelector('[data-reactroot]') !== null;
    });
    console.log('React loaded:', reactLoaded);
    
    // Wait for Backstage app to initialize
    try {
      await page.waitForFunction(() => {
        return document.body.textContent && 
               !document.body.textContent.includes('You need to enable JavaScript');
      }, { timeout: 20000 });
      console.log('Backstage app initialized');
    } catch (e) {
      console.log('Backstage app did not initialize within timeout');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'debug-js-final.png', fullPage: true });
    
    // Check final page state
    const finalText = await page.locator('body').textContent();
    console.log('Final page state:', finalText?.substring(0, 200));
    
    // Look for any Backstage-specific elements that might have loaded
    const backstageSelectors = [
      '[data-testid]',
      '.MuiAppBar-root',
      '.MuiDrawer-root',
      'nav',
      '[role="navigation"]'
    ];
    
    for (const selector of backstageSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`Found ${count} elements matching: ${selector}`);
      }
    }
  });
});