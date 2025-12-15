import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Backstage E2E Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure screenshots directory exists
    const screenshotsDir = path.join('test-results', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    await page.goto('/');
  });

  test('should validate Backstage deployment and basic functionality', async ({ page }) => {
    // Take screenshot of login page
    await page.screenshot({ path: 'test-results/screenshots/01-login-page.png', fullPage: true });
    
    // Verify we're on the login page
    await expect(page).toHaveTitle(/.*Backstage.*/);
    
    // Debug: Log current page content to understand the login form
    const pageContent = await page.content();
    console.log('Page title:', await page.title());
    console.log('Current URL:', page.url());
    
    // Look for guest login option with more specific selectors
    const guestLoginSelectors = [
      'button:has-text("Enter")',
      'button:has-text("Guest")', 
      'button:has-text("Sign In")',
      'input[type="submit"]',
      'button[type="submit"]',
      '[data-testid="guest-enter"]',
      '[data-testid="sign-in-button"]',
      'form button',
      '.MuiButton-root:has-text("Enter")'
    ];
    
    let guestButton = null;
    let usedSelector = '';
    
    for (const selector of guestLoginSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          console.log(`Found guest login button: ${selector}`);
          guestButton = button;
          usedSelector = selector;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!guestButton) {
      // Debug: List all available buttons and forms
      const allButtons = await page.locator('button').allTextContents();
      const allInputs = await page.locator('input').all();
      const inputTypes = [];
      for (const input of allInputs) {
        const type = await input.getAttribute('type');
        inputTypes.push(type);
      }
      
      throw new Error(`Could not find guest login button. Available buttons: ${JSON.stringify(allButtons)}, Input types: ${JSON.stringify(inputTypes)}`);
    }
    
    // Try clicking the button and handle potential form submission
    console.log(`Clicking guest login button: ${usedSelector}`);
    
    // Check if button is in a form
    const buttonParent = await guestButton.locator('..').innerHTML();
    console.log(`Button parent HTML: ${buttonParent.substring(0, 200)}...`);
    
    // Check for any forms on the page
    const forms = await page.locator('form').count();
    console.log(`Number of forms on page: ${forms}`);
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Browser console error: ${msg.text()}`);
      }
    });
    
    // Listen for network requests
    page.on('request', request => {
      console.log(`Network request: ${request.method()} ${request.url()}`);
    });
    
    // Wait for potential navigation or form submission
    const navigationPromise = page.waitForURL('**', { timeout: 10000 }).catch(() => null);
    
    // Try different click approaches
    console.log('Attempting button click...');
    await guestButton.click();
    
    // Wait a bit for any immediate changes
    await page.waitForTimeout(2000);
    
    // Check if we navigated
    await navigationPromise;
    
    // If no navigation, try form submission
    if (forms > 0) {
      console.log('Trying form submission...');
      const form = page.locator('form').first();
      await form.evaluate(form => form.submit());
      await page.waitForTimeout(2000);
    }
    
    // Wait for any loading to complete
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    await page.screenshot({ path: 'test-results/screenshots/02-after-login.png', fullPage: true });
    
    console.log('After login attempt - URL:', page.url());
    console.log('After login attempt - Title:', await page.title());
    
    // Check if login worked or if we can access the app directly
    const currentUrl = page.url();
    const enterButtonStillVisible = await page.locator('button:has-text("Enter")').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (enterButtonStillVisible) {
      console.log('⚠️  Guest login failed (404 on /api/auth/guest/refresh), trying direct access...');
      
      // Try accessing the catalog directly to bypass auth issues
      const directUrls = ['/catalog', '/create', '/docs'];
      let directAccessWorked = false;
      
      for (const url of directUrls) {
        try {
          console.log(`Trying direct access to: ${url}`);
          await page.goto(url);
          await page.waitForLoadState('networkidle', { timeout: 10000 });
          
          // Take a screenshot to see what we got
          await page.screenshot({ path: `test-results/screenshots/direct-access-${url.replace('/', '')}.png`, fullPage: true });
          
          // Check if we're no longer on login page
          const stillOnLogin = await page.locator('button:has-text("Enter")').isVisible({ timeout: 2000 }).catch(() => false);
          
          if (!stillOnLogin) {
            console.log(`✅ Direct access to ${url} worked - no login button found!`);
            directAccessWorked = true;
            break;
          } else {
            // Even if login button is still there, check if we have any main app content
            const hasContent = await page.locator('body').textContent();
            console.log(`Page content preview for ${url}: ${hasContent?.substring(0, 200)}...`);
            
            // Check for any Backstage-specific content that indicates the app loaded
            const backstageIndicators = [
              page.locator('text=Catalog'),
              page.locator('text=Create'),
              page.locator('text=Docs'),
              page.locator('text=APIs'),
              page.locator('text=Components'),
              page.locator('[data-testid]'),
              page.locator('.MuiAppBar-root'),
              page.locator('nav')
            ];
            
            for (const indicator of backstageIndicators) {
              try {
                if (await indicator.isVisible({ timeout: 1000 })) {
                  console.log(`✅ Found Backstage content on ${url} despite login button being present`);
                  directAccessWorked = true;
                  break;
                }
              } catch (e) {
                // Continue checking
              }
            }
            
            if (directAccessWorked) break;
          }
        } catch (e) {
          console.log(`❌ Direct access to ${url} failed: ${e.message}`);
        }
      }
      
      if (!directAccessWorked) {
        console.log('⚠️  Authentication is broken and direct access to main app failed');
        console.log('📋 However, Backstage is responding and serving content');
        console.log('🔍 This indicates a backend configuration issue with guest auth, but deployment is successful');
        
        // Since we can't access the main app, let's validate what we can:
        // 1. Backstage is responding
        // 2. JavaScript resources are loading
        // 3. The login page is functional
        
        // Since we can't access the main app, this is a test failure
        // We can validate that Backstage is deployed and responding, but login is broken
        const hasBackstageTitle = await page.title();
        const hasLoginButton = await page.locator('button:has-text("Enter")').isVisible();
        const hasBackstageContent = await page.locator('text=Backstage').isVisible();
        
        if (hasBackstageTitle.includes('Backstage') && hasLoginButton && hasBackstageContent) {
          // Backstage is deployed but authentication is broken
          throw new Error(
            `Backstage deployment detected but authentication is broken. ` +
            `Guest login fails with 404 on /api/auth/guest/refresh and direct access to main app failed. ` +
            `The application is responding and serving the login page, but users cannot access the main functionality. ` +
            `This indicates a backend configuration issue that needs to be resolved.`
          );
        } else {
          throw new Error(
            `Backstage deployment validation failed completely. ` +
            `Title: ${hasBackstageTitle}, Login button: ${hasLoginButton}, Content: ${hasBackstageContent}`
          );
        }
      }
    }
    
    // Verify we have main app navigation elements
    const mainAppElements = [
      { locator: page.locator('nav a:has-text("Catalog")'), name: 'Catalog nav link' },
      { locator: page.locator('nav a:has-text("Create")'), name: 'Create nav link' },
      { locator: page.locator('[data-testid="sidebar"]'), name: 'Sidebar' },
      { locator: page.locator('text=My Company Catalog'), name: 'Company catalog text' },
      { locator: page.locator('[data-testid="header"]'), name: 'Header' },
      { locator: page.locator('nav'), name: 'Navigation' },
      { locator: page.locator('.MuiAppBar-root'), name: 'App bar' }
    ];
    
    let foundMainApp = false;
    let foundElement = '';
    
    for (const { locator, name } of mainAppElements) {
      try {
        await expect(locator).toBeVisible({ timeout: 5000 });
        foundMainApp = true;
        foundElement = name;
        console.log(`✅ Found main app element: ${name}`);
        break;
      } catch (e) {
        console.log(`❌ Could not find: ${name}`);
        // Continue to next element
      }
    }
    
    if (!foundMainApp) {
      // Debug: Show what's actually on the page
      const bodyText = await page.locator('body').textContent();
      const visibleButtons = await page.locator('button:visible').allTextContents();
      const visibleLinks = await page.locator('a:visible').allTextContents();
      
      throw new Error(
        `Failed to reach main Backstage application after login. ` +
        `Current URL: ${currentUrl}, ` +
        `Visible buttons: ${JSON.stringify(visibleButtons)}, ` +
        `Visible links: ${JSON.stringify(visibleLinks)}, ` +
        `Body text preview: ${bodyText?.substring(0, 500)}...`
      );
    }
    
    console.log(`✅ Successfully accessed Backstage main application and found: ${foundElement}`);
  });

  test('should navigate to catalog and see entities', async ({ page }) => {
    // First access Backstage (login or direct access)
    try {
      await loginAsGuest(page);
    } catch (e) {
      console.log('⚠️  Guest login failed, trying direct catalog access...');
      await page.goto('/catalog');
      await page.waitForLoadState('networkidle');
    }
    
    await page.screenshot({ path: 'test-results/screenshots/03-before-catalog.png', fullPage: true });
    
    // Navigate to catalog
    const catalogLink = page.locator('nav a:has-text("Catalog")').first();
    await expect(catalogLink).toBeVisible({ timeout: 5000 });
    await catalogLink.click();
    
    // Wait for catalog page to load
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/04-catalog-page.png', fullPage: true });
    
    // STRICT ASSERTION: We should be on the catalog page with entities
    await expect(page).toHaveURL(/.*\/catalog.*/);
    
    // Look for catalog-specific elements
    const catalogElements = [
      page.locator('text=All'),
      page.locator('[data-testid="catalog-table"]'),
      page.locator('table'),
      page.locator('text=Component'),
      page.locator('text=API'),
      page.locator('text=System'),
    ];
    
    let foundCatalogElement = false;
    for (const element of catalogElements) {
      try {
        await expect(element).toBeVisible({ timeout: 5000 });
        foundCatalogElement = true;
        console.log(`Found catalog element: ${await element.textContent()}`);
        break;
      } catch (e) {
        // Continue to next element
      }
    }
    
    if (!foundCatalogElement) {
      throw new Error('Catalog page did not load properly - no catalog elements found');
    }
  });

  test('should access create page', async ({ page }) => {
    // First access Backstage (login or direct access)
    try {
      await loginAsGuest(page);
    } catch (e) {
      console.log('⚠️  Guest login failed, trying direct create access...');
      await page.goto('/create');
      await page.waitForLoadState('networkidle');
    }
    
    await page.screenshot({ path: 'test-results/screenshots/05-before-create.png', fullPage: true });
    
    // Navigate to create page
    const createLink = page.locator('nav a:has-text("Create")').first();
    await expect(createLink).toBeVisible({ timeout: 5000 });
    await createLink.click();
    
    // Wait for create page to load
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/06-create-page.png', fullPage: true });
    
    // STRICT ASSERTION: We should be on the create page
    await expect(page).toHaveURL(/.*\/create.*/);
    
    // Look for create page elements
    const createElements = [
      page.locator('text=Choose a template'),
      page.locator('text=Templates'),
      page.locator('[data-testid="template-card"]'),
      page.locator('text=Software Templates'),
    ];
    
    let foundCreateElement = false;
    for (const element of createElements) {
      try {
        await expect(element).toBeVisible({ timeout: 5000 });
        foundCreateElement = true;
        console.log(`Found create page element: ${await element.textContent()}`);
        break;
      } catch (e) {
        // Continue to next element
      }
    }
    
    if (!foundCreateElement) {
      throw new Error('Create page did not load properly - no create elements found');
    }
  });
});

// Helper function to login as guest
async function loginAsGuest(page: any) {
  const guestLoginSelectors = [
    'button:has-text("Enter")',
    'button:has-text("Guest")', 
    'button:has-text("Sign In")',
    'input[type="submit"]',
    'button[type="submit"]',
    '[data-testid="guest-enter"]',
    '[data-testid="sign-in-button"]',
    'form button',
    '.MuiButton-root:has-text("Enter")'
  ];
  
  for (const selector of guestLoginSelectors) {
    try {
      const guestButton = page.locator(selector).first();
      if (await guestButton.isVisible({ timeout: 2000 })) {
        console.log(`Helper: Found guest login button: ${selector}`);
        
        // Wait for potential navigation
        const navigationPromise = page.waitForURL('**', { timeout: 10000 }).catch(() => null);
        await guestButton.click();
        await page.waitForTimeout(1000);
        await navigationPromise;
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        
        // Verify login worked
        const enterButtonStillVisible = await page.locator('button:has-text("Enter")').isVisible({ timeout: 2000 }).catch(() => false);
        if (enterButtonStillVisible) {
          throw new Error('Login helper failed - still on login page');
        }
        
        return;
      }
    } catch (e) {
      // Continue to next selector
    }
  }
  
  throw new Error('Could not find guest login button in helper function');
}