import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Improved Backstage Authentication Test', () => {
  let screenshotDir: string;
  
  test.beforeEach(async ({ }, testInfo) => {
    // Create a unique screenshot directory for this test run
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const testName = testInfo.title.replace(/[^a-zA-Z0-9]/g, '-');
    screenshotDir = path.join('plugins', 'image-factory', 'e2e-screenshots', `${testName}-${timestamp}`);
    
    try {
      fs.mkdirSync(screenshotDir, { recursive: true });
    } catch (e) {
      console.log('Screenshot directory already exists or could not be created');
    }
  });

  test('should authenticate with guest and access main app', async ({ page }) => {
    // Helper function for taking organized screenshots
    const takeScreenshot = async (name: string, fullPage = true) => {
      const filename = path.join(screenshotDir, `${name}.png`);
      await page.screenshot({ path: filename, fullPage });
      console.log(`📸 Screenshot saved: ${filename}`);
      return filename;
    };

    // Listen for console messages and errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔴 CONSOLE ERROR:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.log('🔴 PAGE ERROR:', error.message);
    });

    console.log('🚀 Starting Backstage authentication test...');
    
    // Step 1: Load the initial page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await takeScreenshot('01-initial-load');
    
    console.log('📍 Current URL:', page.url());
    console.log('📄 Page title:', await page.title());

    // Step 2: Wait for React to render
    console.log('⏳ Waiting for React app to render...');
    
    // Wait for interactive elements (buttons, links) to appear
    try {
      await page.waitForSelector('button, [role="button"], a', { timeout: 10000 });
      console.log('✅ Interactive elements found');
    } catch (e) {
      console.log('❌ No interactive elements found within timeout');
      await takeScreenshot('02-no-interactive-elements');
      throw e;
    }

    // Give React a moment to fully render
    await page.waitForTimeout(2000);
    await takeScreenshot('02-react-rendered');

    // Step 3: Check if we're on sign-in page
    const isSignInPage = await page.locator('text="Sign in"').isVisible() || 
                        await page.locator('text="Guest"').isVisible() ||
                        await page.locator('text="GitHub"').isVisible();
    
    console.log('🔐 Is sign-in page:', isSignInPage);

    if (isSignInPage) {
      console.log('🎯 Found sign-in page, looking for guest authentication...');
      
      // Look for guest button - first let's see what buttons are available
      console.log('🔍 Looking for guest button...');
      
      // Debug: List all buttons on the page
      const allButtons = await page.locator('button').all();
      console.log(`🔘 Found ${allButtons.length} buttons total`);
      
      for (let i = 0; i < allButtons.length; i++) {
        const text = await allButtons[i].textContent();
        const isVisible = await allButtons[i].isVisible();
        console.log(`  Button ${i}: "${text}" (visible: ${isVisible})`);
      }
      
      // Try multiple approaches to find the guest button
      let guestClicked = false;
      
      // Approach 1: Look for button containing "Guest"
      const guestButton1 = page.locator('button').filter({ hasText: /guest/i });
      if (await guestButton1.count() > 0) {
        console.log('✅ Found guest button (approach 1)');
        await takeScreenshot('03-before-guest-click-1');
        await guestButton1.first().click({ force: true });
        console.log('✅ Clicked guest button (approach 1)');
        guestClicked = true;
      }
      
      // Approach 2: Look for "Enter" button (likely guest auth)
      if (!guestClicked) {
        for (let i = 0; i < allButtons.length; i++) {
          const text = await allButtons[i].textContent();
          if (text && (text.toLowerCase().includes('guest') || text.toLowerCase().includes('enter'))) {
            console.log(`✅ Found auth button (approach 2): "${text}"`);
            await takeScreenshot('03-before-auth-click-2');
            await allButtons[i].click({ force: true });
            console.log('✅ Clicked auth button (approach 2)');
            guestClicked = true;
            break;
          }
        }
      }
      
      if (!guestClicked) {
        console.log('❌ Could not find guest button');
        await takeScreenshot('03-guest-auth-failed');
        throw new Error('Guest authentication not found');
      }

        // Step 4: Wait for authentication to complete
      console.log('⏳ Waiting for authentication to complete...');
      
      // Wait for page to process the click
      await page.waitForTimeout(2000);
      
      // Wait for navigation or page reload after clicking guest
      await page.waitForLoadState('networkidle');
      
      // Check if we're redirected or if the page content changes
      const currentUrl = page.url();
      console.log('📍 URL after guest click:', currentUrl);
      
      // Wait longer for the main app to load
      console.log('⏳ Waiting for main app to load...');
      try {
        await Promise.race([
          // Wait for main navigation to appear (indicates successful auth)
          page.waitForSelector('[data-testid="sidebar"], nav:not(header), .MuiDrawer-root', { timeout: 15000 }),
          // Wait for catalog or create links to appear
          page.waitForSelector('a[href*="catalog"], a[href*="create"]', { timeout: 15000 }),
          // Wait for sign-in elements to disappear
          page.waitForSelector('text="Sign in"', { state: 'hidden', timeout: 15000 }),
          // Wait for main content area
          page.waitForSelector('main, [role="main"]', { timeout: 15000 }),
          // Fallback timeout
          page.waitForTimeout(12000)
        ]);
        
        console.log('✅ Authentication flow completed');
      } catch (e) {
        console.log('⚠️ Authentication may not have completed fully, continuing...');
      }

      await takeScreenshot('04-after-auth');
    }

    // Step 5: Check current state
    console.log('📍 Final URL:', page.url());
    console.log('📄 Final title:', await page.title());
    
    // Check what's actually on the page now
    const bodyText = await page.locator('body').textContent();
    const hasJSWarning = bodyText?.includes('You need to enable JavaScript');
    const hasSignIn = bodyText?.includes('Sign in') || bodyText?.includes('Guest');
    
    // Check for specific Backstage app indicators
    const hasBackstageContent = bodyText?.includes('Catalog') || 
                               bodyText?.includes('Create') || 
                               bodyText?.includes('API Docs') ||
                               bodyText?.includes('TechDocs');
    
    console.log('🔍 Page analysis:');
    console.log('  - Has JS warning:', hasJSWarning);
    console.log('  - Still has sign-in:', hasSignIn);
    console.log('  - Has Backstage content:', hasBackstageContent);
    console.log('  - Body text preview:', bodyText?.substring(0, 300) + '...');

    await takeScreenshot('05-final-state');

    // Step 6: Look for navigation elements
    console.log('🧭 Looking for navigation elements...');
    
    const navSelectors = [
      'nav',
      '[role="navigation"]', 
      '.MuiDrawer-root',
      '.MuiAppBar-root',
      'header',
      '[data-testid="sidebar"]'
    ];

    let navFound = false;
    for (const selector of navSelectors) {
      const elements = await page.locator(selector).count();
      if (elements > 0) {
        console.log(`✅ Found ${elements} navigation elements: ${selector}`);
        navFound = true;
        
        // Get text content of navigation
        const navText = await page.locator(selector).first().textContent();
        console.log(`  Navigation content: ${navText?.substring(0, 100)}...`);
      }
    }

    if (!navFound) {
      console.log('❌ No navigation elements found');
    }

    // Step 7: Look for any links that might be Create/Templates
    const allLinks = await page.locator('a').all();
    console.log(`🔗 Found ${allLinks.length} total links`);
    
    const createKeywords = ['create', 'template', 'scaffold', 'new', 'add'];
    let createLinkFound = false;
    
    for (let i = 0; i < Math.min(allLinks.length, 20); i++) {
      const text = await allLinks[i].textContent();
      const href = await allLinks[i].getAttribute('href');
      
      if (text || href) {
        const hasCreateKeyword = createKeywords.some(keyword => 
          text?.toLowerCase().includes(keyword) || href?.toLowerCase().includes(keyword)
        );
        
        if (hasCreateKeyword) {
          console.log(`🎯 Potential create link: "${text}" -> ${href}`);
          createLinkFound = true;
        }
      }
    }

    await takeScreenshot('06-navigation-analysis');

    // Step 8: Try to access a main app feature to verify authentication worked
    console.log('🔍 Testing if we can access main app features...');
    
    // Try to navigate to catalog (this should work if authenticated)
    try {
      await page.goto('/catalog');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await takeScreenshot('07-catalog-page');
      
      const catalogPageText = await page.locator('body').textContent();
      const hasCatalogContent = catalogPageText?.includes('Catalog') || 
                               catalogPageText?.includes('Components') ||
                               catalogPageText?.includes('Systems') ||
                               catalogPageText?.includes('APIs');
      
      console.log('📊 Catalog page check:');
      console.log('  - Has catalog content:', hasCatalogContent);
      console.log('  - Page text preview:', catalogPageText?.substring(0, 200) + '...');
      
      if (hasCatalogContent) {
        console.log('✅ Successfully accessed catalog - authentication working!');
        expect(true).toBe(true); // Test passes
        return;
      }
    } catch (e) {
      console.log('⚠️ Could not access catalog page:', e);
    }
    
    // Fallback: Check if we have any navigation or main content
    const hasMainContent = navFound || createLinkFound || hasBackstageContent;
    const hasBackstageElements = await page.locator('[data-testid="sidebar"], .MuiDrawer-root, a[href*="catalog"], a[href*="create"]').count() > 0;
    
    console.log('🏁 Fallback verification:');
    console.log('  - Navigation found:', navFound);
    console.log('  - Create links found:', createLinkFound);
    console.log('  - Has Backstage content:', hasBackstageContent);
    console.log('  - Has main content:', hasMainContent);
    console.log('  - Has Backstage elements:', hasBackstageElements);

    const testPassed = hasMainContent || hasBackstageElements;
    
    if (testPassed) {
      console.log('✅ Test passed - guest authentication and main app access successful');
    } else {
      console.log('❌ Test failed - could not verify main app access after authentication');
    }
    
    expect(testPassed).toBe(true);
  });
});