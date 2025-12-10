import { test, expect } from '@playwright/test';

test.describe('Debug Backstage Navigation', () => {
  test('should load Backstage and show navigation elements', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'debug-before-auth.png', fullPage: true });
    
    // Check if we need to sign in - look for all possible auth elements
    console.log('Checking for authentication elements...');
    
    // Try different selectors for guest login
    const authSelectors = [
      'text="Guest"',
      'text="Enter as a Guest User"',
      '[data-testid="guest-signin"]',
      'button:has-text("Guest")',
      'a:has-text("Guest")',
      '.guest-signin',
      '[href*="guest"]'
    ];
    
    let authClicked = false;
    for (const selector of authSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        console.log(`Found auth element with selector: ${selector}`);
        try {
          await element.click();
          console.log('Clicked auth element, waiting for navigation...');
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(3000);
          authClicked = true;
          break;
        } catch (e) {
          console.log(`Failed to click ${selector}:`, e);
        }
      }
    }
    
    if (!authClicked) {
      console.log('No auth element found, looking for all buttons and links...');
      const allButtons = await page.locator('button, a').all();
      for (let i = 0; i < allButtons.length; i++) {
        const text = await allButtons[i].textContent();
        const href = await allButtons[i].getAttribute('href');
        console.log(`Clickable ${i}: "${text}" href="${href}"`);
        
        if (text?.toLowerCase().includes('guest') || href?.includes('guest')) {
          console.log('Found potential guest auth, clicking...');
          try {
            await allButtons[i].click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);
            authClicked = true;
            break;
          } catch (e) {
            console.log('Failed to click:', e);
          }
        }
      }
    }
    
    // Take screenshot after auth attempt
    await page.screenshot({ path: 'debug-after-auth.png', fullPage: true });
    
    // Wait for Backstage to initialize (look for common Backstage elements)
    try {
      await page.waitForSelector('body', { timeout: 10000 });
      await page.waitForTimeout(3000); // Give extra time for React to render
    } catch (e) {
      console.log('Timeout waiting for page elements');
    }
    
    // Take a screenshot to see what's on the page
    await page.screenshot({ path: 'debug-homepage.png', fullPage: true });
    
    // Get page title and URL
    console.log('Page title:', await page.title());
    console.log('Page URL:', page.url());
    
    // Check what's actually on the page
    const bodyText = await page.locator('body').textContent();
    console.log('Page contains text:', bodyText?.substring(0, 200) + '...');
    
    // Look for common Backstage elements
    const backstageElements = [
      '[data-testid="sidebar"]',
      '.MuiDrawer-root',
      'nav',
      '[role="navigation"]',
      '.backstage-sidebar',
      '.MuiAppBar-root',
      'header'
    ];
    
    for (const selector of backstageElements) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        console.log(`Found element: ${selector}`);
        const text = await element.textContent();
        console.log(`  Content: ${text?.substring(0, 100)}...`);
      }
    }
    
    // Check all links on the page
    const allLinks = await page.locator('a').all();
    console.log(`Total links found: ${allLinks.length}`);
    
    for (let i = 0; i < Math.min(allLinks.length, 10); i++) {
      const link = allLinks[i];
      const text = await link.textContent();
      const href = await link.getAttribute('href');
      console.log(`Link ${i}: "${text}" -> ${href}`);
    }
    
    // Look for Create button variations
    const createVariations = [
      'Create',
      'Create Component', 
      'New',
      'Add',
      'Templates',
      'Scaffolder',
      'Software Templates'
    ];
    
    for (const variation of createVariations) {
      const elements = page.locator(`text="${variation}"`);
      const count = await elements.count();
      if (count > 0) {
        console.log(`Found "${variation}" (${count} instances)`);
      }
    }
    
    // Just verify the page loaded
    expect(page.url()).toContain('localhost:3000');
  });
});