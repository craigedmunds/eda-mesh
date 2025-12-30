import { TestInfo, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Custom screenshot helper that saves screenshots in the same directory
 * as Playwright's auto-generated artifacts, ensuring they appear together
 * in the HTML report without needing a custom reporter.
 */

/**
 * Takes a custom screenshot and saves it in Playwright's output directory
 * alongside auto-generated artifacts like traces and videos.
 * 
 * @param page - Playwright page object
 * @param testInfo - Playwright test info object
 * @param filename - Name for the screenshot file (without extension)
 * @param options - Screenshot options (optional)
 */
export async function takeCustomScreenshot(
  page: Page, 
  testInfo: TestInfo, 
  filename: string, 
  options: { fullPage?: boolean; clip?: { x: number; y: number; width: number; height: number } } = {}
): Promise<void> {
  try {
    // Take the screenshot
    const screenshot = await page.screenshot({ 
      fullPage: options.fullPage ?? true,
      clip: options.clip,
      type: 'png'
    });
    
    // Get the test's output directory (where Playwright saves traces, videos, etc.)
    const testOutputDir = testInfo.outputDir;
    
    // Ensure the directory exists
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
    
    // Create the screenshot filename with .png extension
    const screenshotFilename = filename.endsWith('.png') ? filename : `${filename}.png`;
    const screenshotPath = path.join(testOutputDir, screenshotFilename);
    
    // Save the screenshot to the same directory as other test artifacts
    fs.writeFileSync(screenshotPath, screenshot);
    
    // Also attach it to the test for the HTML report
    await testInfo.attach(screenshotFilename, {
      body: screenshot,
      contentType: 'image/png'
    });
    
    console.log(`📸 Custom screenshot saved: ${screenshotPath}`);
  } catch (error) {
    console.error(`❌ Failed to save custom screenshot "${filename}":`, error);
  }
}

/**
 * Takes a screenshot with automatic naming based on test context
 * 
 * @param page - Playwright page object
 * @param testInfo - Playwright test info object
 * @param description - Description for the screenshot (will be sanitized for filename)
 * @param options - Screenshot options (optional)
 */
export async function takeNamedScreenshot(
  page: Page,
  testInfo: TestInfo,
  description: string,
  options: { fullPage?: boolean; clip?: { x: number; y: number; width: number; height: number } } = {}
): Promise<void> {
  // Sanitize the description for use as a filename
  const sanitizedDescription = description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  
  // Create a timestamp for uniqueness
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  
  // Create filename with test context
  const filename = `custom-${sanitizedDescription}-${timestamp}`;
  
  await takeCustomScreenshot(page, testInfo, filename, options);
}

/**
 * Takes a screenshot at a specific step in the test flow
 * 
 * @param page - Playwright page object
 * @param testInfo - Playwright test info object
 * @param stepNumber - Step number (e.g., "01", "02")
 * @param stepDescription - Description of the step
 * @param options - Screenshot options (optional)
 */
export async function takeStepScreenshot(
  page: Page,
  testInfo: TestInfo,
  stepNumber: string,
  stepDescription: string,
  options: { fullPage?: boolean; clip?: { x: number; y: number; width: number; height: number } } = {}
): Promise<void> {
  // Sanitize the step description
  const sanitizedDescription = stepDescription
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Create filename with step number
  const filename = `${stepNumber}-${sanitizedDescription}`;
  
  await takeCustomScreenshot(page, testInfo, filename, options);
}