import { Page } from '@playwright/test';

/**
 * Shared authentication helper for Backstage E2E tests
 * 
 * This helper handles the common authentication flow across all plugin tests.
 * It tries multiple authentication strategies and provides consistent error handling.
 */

export interface AuthOptions {
  timeout?: number;
  retries?: number;
  skipDirectAccess?: boolean;
}

/**
 * Authenticate with Backstage using guest login or direct access
 * 
 * @param page - Playwright page object
 * @param options - Authentication options
 * @returns Promise<void>
 * @throws Error if authentication fails after all attempts
 */
export async function authenticateWithBackstage(page: Page, options: AuthOptions = {}): Promise<void> {
  const { timeout = 10000 } = options;
  
  console.log('🔐 Starting Backstage authentication...');
  
  // Always start from the home page and go through proper login
  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout });
  
  // Try guest login
  await loginAsGuest(page, timeout);
  console.log('✅ Guest authentication successful');
}

/**
 * Primary guest login method using common selectors
 */
async function loginAsGuest(page: Page, timeout: number = 10000): Promise<void> {
  const guestLoginSelectors = [
    'button:has-text("Enter")',
    'button:has-text("Sign In")',
    'button:has-text("Guest")', 
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
        console.log(`🎯 Found guest login button: ${selector}`);
        
        // Click the button and wait for authentication to complete
        await guestButton.click();
        console.log('✅ Clicked login button, waiting for authentication...');
        
        // Wait for navigation or page change
        await page.waitForTimeout(5000);
        await page.waitForLoadState('networkidle', { timeout });
        
        // Check if we're now authenticated by looking for main app elements
        // Try multiple indicators of successful authentication
        const authSuccess = await Promise.race([
          // Look for main content area (this works!)
          page.locator('main').isVisible({ timeout: 8000 }),
          // Look for Backstage-specific navigation links
          page.locator('a:has-text("APIs"), a:has-text("Events"), a:has-text("Create")').first().isVisible({ timeout: 8000 }),
          // Look for catalog elements
          page.locator('[data-testid="catalog"], .catalog-page').isVisible({ timeout: 8000 })
        ]).catch(() => false);
        
        if (authSuccess) {
          console.log('✅ Authentication successful - main app elements found');
          return;
        }
        
        // If no main elements found, check if we're still on login page
        const stillOnLoginPage = await page.locator('button:has-text("Enter"), button:has-text("Sign In")').isVisible({ timeout: 2000 }).catch(() => false);
        
        if (stillOnLoginPage) {
          console.log(`⚠️ Still on login page after clicking ${selector}`);
          continue; // Try next selector
        }
        
        // Check if URL changed (indicates successful navigation)
        const currentUrl = page.url();
        if (currentUrl.includes('/catalog') || currentUrl !== '/') {
          console.log('✅ Authentication successful - URL changed to:', currentUrl);
          return;
        }
        
        throw new Error(`Authentication verification failed for ${selector}`);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.log(`⚠️ Selector ${selector} failed:`, errorMessage);
      continue;
    }
  }
  
  throw new Error('Could not find guest login button with primary selectors');
}



/**
 * Verify that authentication was successful by checking for main app elements
 */
export async function verifyAuthentication(page: Page, timeout: number = 5000): Promise<boolean> {
  try {
    // Check for main content area
    const hasMainContent = await page.locator('main').isVisible({ timeout });
    
    // Check for Backstage navigation links (APIs, Events, Create, etc.)
    const hasBackstageLinks = await page.locator('a:has-text("APIs"), a:has-text("Events"), a:has-text("Create")').first().isVisible({ timeout });
    
    // Check that we're not on a login page
    const notOnLoginPage = !(await page.locator('button:has-text("Enter"), button:has-text("Sign In")').isVisible({ timeout: 2000 }).catch(() => false));
    
    // Check URL is not login page
    const urlNotLogin = !page.url().includes('sign-in') && page.url() !== '/';
    
    return (hasMainContent || hasBackstageLinks || urlNotLogin) && notOnLoginPage;
  } catch (e) {
    return false;
  }
}

/**
 * Navigate to a specific page after authentication, with retry logic
 */
export async function navigateAfterAuth(page: Page, path: string, timeout: number = 10000): Promise<void> {
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await page.goto(path);
      await page.waitForLoadState('networkidle', { timeout });
      
      // Verify we're not redirected back to login
      const currentUrl = page.url();
      if (!currentUrl.includes('sign-in') && !currentUrl.includes('login')) {
        return;
      }
      
      throw new Error(`Redirected to login page: ${currentUrl}`);
    } catch (e) {
      if (attempt === maxRetries) {
        throw new Error(`Failed to navigate to ${path} after ${maxRetries} attempts: ${e.message}`);
      }
      
      console.log(`⚠️ Navigation attempt ${attempt} failed, retrying...`);
      await page.waitForTimeout(2000);
    }
  }
}

/**
 * Setup console noise suppression for cleaner test output
 */
export function suppressConsoleNoise(page: Page): void {
  page.on('console', msg => {
    // Only log actual errors, not React warnings or deprecation notices
    if (msg.type() === 'error' && 
        !msg.text().includes('React') && 
        !msg.text().includes('Warning') &&
        !msg.text().includes('deprecated') &&
        !msg.text().includes('DevTools')) {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    // Log actual page errors
    console.log('PAGE ERROR:', error.message);
  });
}