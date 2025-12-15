import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Events UI Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure screenshots directory exists
    const screenshotsDir = path.join('test-results', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    await page.goto('/');
  });

  test('should have Events link in the left navigation panel', async ({ page }) => {
    // Take screenshot of initial page
    await page.screenshot({ path: 'test-results/screenshots/01-initial-page.png', fullPage: true });
    
    // Look for the Events link in the sidebar
    const eventsLink = page.locator('nav a:has-text("Events")');
    
    await expect(eventsLink).toBeVisible();
    
    // Take screenshot showing the Events link
    await page.screenshot({ path: 'test-results/screenshots/02-events-link-visible.png', fullPage: true });
  });

  test('should display events list when navigating to Events page', async ({ page }) => {
    // Click on the Events link
    await page.click('nav a:has-text("Events")');
    
    // Wait for navigation
    await page.waitForURL(/.*\/catalog\?filters\[kind\]=event/i);
    
    // Take screenshot of events page
    await page.screenshot({ path: 'test-results/screenshots/03-events-page-loaded.png', fullPage: true });
    
    // Check that we have some events in the list
    // Look for the catalog table or list container
    const catalogTable = page.locator('[data-testid="catalog-table"], table, [role="table"]').first();
    await expect(catalogTable).toBeVisible();
    
    // Verify there are event rows
    const eventRows = page.locator('tbody tr, [role="row"]');
    await expect(eventRows.first()).toBeVisible();
    
    // Verify we have at least one event
    const rowCount = await eventRows.count();
    expect(rowCount).toBeGreaterThan(0);
    
    // Take screenshot showing the events list
    await page.screenshot({ path: 'test-results/screenshots/04-events-list-visible.png', fullPage: true });
  });

  test('should display correct fields on first event details page', async ({ page }) => {
    // Navigate to Events
    await page.click('nav a:has-text("Events")');
    await page.waitForURL(/.*\/catalog\?filters\[kind\]=event/i);
    
    // Click on the first event in the list
    const firstEventLink = page.locator('tbody tr a, [role="row"] a').first();
    await firstEventLink.click();
    
    // Wait for the event details page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of event details page
    await page.screenshot({ path: 'test-results/screenshots/05-event-details-page.png', fullPage: true });
    
    // Verify the About card is present
    const aboutCard = page.locator('text=About').first();
    await expect(aboutCard).toBeVisible();
    
    // Check for key fields in the About section
    // These should be links (EntityRefLink components)
    const ownerLabel = page.locator('text=OWNER');
    await expect(ownerLabel).toBeVisible();
    
    const typeLabel = page.locator('text=TYPE');
    await expect(typeLabel).toBeVisible();
    
    const lifecycleLabel = page.locator('text=LIFECYCLE');
    await expect(lifecycleLabel).toBeVisible();
    
    // Verify that Owner is a link (EntityRefLink)
    const ownerSection = page.locator('text=OWNER').locator('..');
    const ownerLink = ownerSection.locator('a');
    await expect(ownerLink).toBeVisible();
    
    // Check for optional fields that should be links when present
    const domainLabel = page.locator('text=DOMAIN');
    if (await domainLabel.isVisible()) {
      const domainSection = domainLabel.locator('..');
      const domainLink = domainSection.locator('a');
      await expect(domainLink).toBeVisible();
    }
    
    const subdomainLabel = page.locator('text=SUBDOMAIN');
    if (await subdomainLabel.isVisible()) {
      const subdomainSection = subdomainLabel.locator('..');
      const subdomainLink = subdomainSection.locator('a');
      await expect(subdomainLink).toBeVisible();
    }
    
    const systemLabel = page.locator('text=SYSTEM');
    if (await systemLabel.isVisible()) {
      const systemSection = systemLabel.locator('..');
      const systemLink = systemSection.locator('a');
      await expect(systemLink).toBeVisible();
    }
    
    // Take final screenshot showing all the fields
    await page.screenshot({ path: 'test-results/screenshots/06-event-fields-verified.png', fullPage: true });
  });
});
