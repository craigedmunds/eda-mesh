import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Image Factory Template Test', () => {
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

  test('should find the enroll managed image template', async ({ page }) => {
    // Helper function for taking organized screenshots
    const takeScreenshot = async (name: string, fullPage = true) => {
      const filename = path.join(screenshotDir, `${name}.png`);
      await page.screenshot({ path: filename, fullPage });
      console.log(`📸 Screenshot saved: ${filename}`);
      return filename;
    };

    console.log('🚀 Starting template test...');
    
    // Step 1: Load the initial page and authenticate
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await takeScreenshot('01-initial-load');
    
    // Wait for React to render and look for auth button
    await page.waitForSelector('button, [role="button"], a', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Check if we need to authenticate
    const isSignInPage = await page.locator('text="Sign in"').isVisible() || 
                        await page.locator('text="Guest"').isVisible() ||
                        await page.locator('text="GitHub"').isVisible();
    
    if (isSignInPage) {
      console.log('🔐 Authenticating as guest...');
      
      // Look for auth button (Enter or Guest)
      const allButtons = await page.locator('button').all();
      for (let i = 0; i < allButtons.length; i++) {
        const text = await allButtons[i].textContent();
        if (text && (text.toLowerCase().includes('guest') || text.toLowerCase().includes('enter'))) {
          console.log(`✅ Found auth button: "${text}"`);
          await allButtons[i].click({ force: true });
          break;
        }
      }
      
      // Wait for authentication to complete
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }
    
    await takeScreenshot('02-authenticated');
    
    // Step 2: Navigate to the create page
    console.log('🎯 Navigating to create page...');
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot('03-create-page');
    
    // Step 3: Look for the template
    console.log('🔍 Looking for Enroll Managed Image template...');
    
    // Check page content
    const pageText = await page.locator('body').textContent();
    console.log('📄 Page content preview:', pageText?.substring(0, 500) + '...');
    
    // Look for the template by various selectors
    const templateSelectors = [
      'text="Enroll Managed Image"',
      'text="Register a container image"',
      '[data-testid*="template"]',
      '.MuiCard-root',
      '[role="button"]'
    ];
    
    let templateFound = false;
    for (const selector of templateSelectors) {
      const elements = await page.locator(selector).count();
      if (elements > 0) {
        console.log(`✅ Found ${elements} elements matching: ${selector}`);
        
        // Get text content of matching elements
        const matchingElements = await page.locator(selector).all();
        for (let i = 0; i < Math.min(matchingElements.length, 5); i++) {
          const text = await matchingElements[i].textContent();
          console.log(`  Element ${i}: "${text?.substring(0, 100)}..."`);
          
          if (text && (text.includes('Enroll') || text.includes('Managed Image') || text.includes('container image'))) {
            templateFound = true;
            console.log(`🎯 Found template-related content: "${text.substring(0, 100)}..."`);
          }
        }
      }
    }
    
    // Look for any cards or templates on the page
    const cards = await page.locator('.MuiCard-root, [data-testid*="template"], [role="button"]').all();
    console.log(`🃏 Found ${cards.length} potential template cards`);
    
    for (let i = 0; i < Math.min(cards.length, 10); i++) {
      const cardText = await cards[i].textContent();
      console.log(`  Card ${i}: "${cardText?.substring(0, 150)}..."`);
      
      if (cardText && (cardText.includes('Enroll') || cardText.includes('Image') || cardText.includes('container'))) {
        templateFound = true;
        console.log(`🎯 Found image factory template card!`);
        await takeScreenshot(`04-template-card-${i}`);
      }
    }
    
    await takeScreenshot('05-final-create-page');
    
    // Step 4: Check if we can access the scaffolder API (for debugging)
    console.log('🔧 Checking scaffolder actions...');
    try {
      await page.goto('/api/scaffolder/v2/actions');
      await page.waitForLoadState('networkidle');
      const actionsText = await page.locator('body').textContent();
      
      if (actionsText?.includes('image-factory:enroll')) {
        console.log('✅ Found image-factory:enroll action in API');
        templateFound = true;
      } else {
        console.log('❌ image-factory:enroll action not found in API');
        console.log('Available actions preview:', actionsText?.substring(0, 500) + '...');
      }
      
      await takeScreenshot('06-scaffolder-actions');
    } catch (e) {
      console.log('⚠️ Could not access scaffolder actions API:', e);
    }
    
    // Final verification
    console.log('🏁 Template test results:');
    console.log('  - Template found:', templateFound);
    
    if (templateFound) {
      console.log('✅ Test passed - Image Factory template is available');
    } else {
      console.log('❌ Test failed - Could not find Image Factory template');
    }
    
    expect(templateFound).toBe(true);
  });
});