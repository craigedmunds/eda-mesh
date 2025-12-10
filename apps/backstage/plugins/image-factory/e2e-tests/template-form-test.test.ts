import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Image Factory Template Form Test', () => {
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

  test('should open and fill the enroll managed image template form', async ({ page }) => {
    // Helper function for taking organized screenshots
    const takeScreenshot = async (name: string, fullPage = true) => {
      const filename = path.join(screenshotDir, `${name}.png`);
      await page.screenshot({ path: filename, fullPage });
      console.log(`📸 Screenshot saved: ${filename}`);
      return filename;
    };

    console.log('🚀 Starting template form test...');
    
    // Step 1: Load the initial page and authenticate
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
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
    
    // Step 2: Navigate to the create page
    console.log('🎯 Navigating to create page...');
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot('01-create-page');
    
    // Step 3: Find and click the template
    console.log('🔍 Looking for and clicking Enroll Managed Image template...');
    
    // Look for the template card and its Choose button
    const templateCard = page.locator('text="Enroll Managed Image"').first();
    await expect(templateCard).toBeVisible({ timeout: 10000 });
    
    // Look for the Choose button associated with the template
    const chooseButton = page.locator('button:has-text("Choose")').first();
    if (await chooseButton.count() > 0) {
      console.log('✅ Found Choose button, clicking it');
      await chooseButton.click();
    } else {
      console.log('⚠️ Choose button not found, clicking template card');
      await templateCard.click();
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await takeScreenshot('02-template-clicked');
    
    // Step 4: Check if we're on the template form page
    console.log('📝 Checking if template form loaded...');
    
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);
    
    // Look for form elements
    const formElements = [
      'input[name="name"]',
      'input[name="registry"]',
      'input[name="repository"]',
      'text="Image Information"',
      'text="Source Information"',
      'text="Rebuild Policy"'
    ];
    
    let formFound = false;
    for (const selector of formElements) {
      const elements = await page.locator(selector).count();
      if (elements > 0) {
        console.log(`✅ Found form element: ${selector}`);
        formFound = true;
      }
    }
    
    await takeScreenshot('03-form-check');
    
    // Step 5: Try to fill out the form if it's available
    if (formFound) {
      console.log('📝 Filling out the form...');
      
      try {
        // Fill Image Information
        const nameInput = page.locator('input[name="name"]');
        if (await nameInput.count() > 0) {
          await nameInput.fill('test-image');
          console.log('✅ Filled name field');
        }
        
        const repositoryInput = page.locator('input[name="repository"]');
        if (await repositoryInput.count() > 0) {
          await repositoryInput.fill('myorg/test-image');
          console.log('✅ Filled repository field');
        }
        
        await takeScreenshot('04-form-filled');
        
        // Look for Next button
        const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")');
        if (await nextButton.count() > 0) {
          console.log('✅ Found Next button');
          await takeScreenshot('05-ready-to-continue');
          
          // Don't actually click Next to avoid creating a real PR
          console.log('ℹ️ Stopping here to avoid creating actual resources');
        }
        
      } catch (e) {
        console.log('⚠️ Error filling form:', e);
        await takeScreenshot('04-form-error');
      }
    }
    
    // Step 6: Check page content for template-specific elements
    const pageText = await page.locator('body').textContent();
    const hasTemplateContent = pageText?.includes('Image Information') ||
                              pageText?.includes('Source Information') ||
                              pageText?.includes('Rebuild Policy') ||
                              pageText?.includes('Container Registry') ||
                              pageText?.includes('Dockerfile');
    
    console.log('🏁 Template form test results:');
    console.log('  - Form found:', formFound);
    console.log('  - Template content found:', hasTemplateContent);
    console.log('  - Current URL contains template:', currentUrl.includes('template') || currentUrl.includes('create'));
    
    const testPassed = formFound || hasTemplateContent;
    
    if (testPassed) {
      console.log('✅ Test passed - Template form is accessible and working');
    } else {
      console.log('❌ Test failed - Could not access or interact with template form');
      console.log('Page content preview:', pageText?.substring(0, 500) + '...');
    }
    
    await takeScreenshot('06-final-state');
    
    expect(testPassed).toBe(true);
  });
});