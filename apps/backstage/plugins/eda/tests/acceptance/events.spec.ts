import { test, expect } from '@playwright/test';
import { authenticateWithBackstage, suppressConsoleNoise, navigateAfterAuth } from '../../../../tests/acceptance/lib/auth-helper';

test.describe('Events UI Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup console noise suppression
    suppressConsoleNoise(page);
    
    // Navigate to home page and authenticate
    await page.goto('/');
    await authenticateWithBackstage(page);
    
    console.log('✅ Authenticated and ready for testing');
  });

  test('should have Events link in the left navigation panel', async ({ page }, testInfo) => {
    console.log('Arrived in test');
    // 1. Take screenshot of authenticated main page
    const authenticatedPage = await page.screenshot({ fullPage: true });
    await testInfo.attach('1-authenticated-main-page.png', { 
      body: authenticatedPage, 
      contentType: 'image/png' 
    });
    
    // Look for the Events link in the sidebar
    const eventsLink = page.locator('nav a:has-text("Events")');
    
    await expect(eventsLink).toBeVisible();
    
    // 2. Take screenshot showing the Events link found
    const eventsLinkVisible = await page.screenshot({ fullPage: true });
    await testInfo.attach('2-events-link-visible.png', { 
      body: eventsLinkVisible, 
      contentType: 'image/png' 
    });

    console.log('End of test');
  });

  test('should display events list when navigating to Events page', async ({ page }, testInfo) => {
    // Click on the Events link
    await page.click('nav a:has-text("Events")');
    
    // Wait for navigation - be more flexible with URL pattern
    await page.waitForURL(/.*\/catalog.*event/i, { timeout: 10000 });
    
    // 1. Take screenshot of events page after navigation
    const eventsPageLoaded = await page.screenshot({ fullPage: true });
    await testInfo.attach('1-events-page-loaded.png', { 
      body: eventsPageLoaded, 
      contentType: 'image/png' 
    });
    
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
    
    // 2. Take screenshot showing the populated events list
    const eventsListPopulated = await page.screenshot({ fullPage: true });
    await testInfo.attach('2-events-list-populated.png', { 
      body: eventsListPopulated, 
      contentType: 'image/png' 
    });
  });

  test('should display correct fields on first event details page', async ({ page }, testInfo) => {
    // Navigate to Events
    await page.click('nav a:has-text("Events")');
    await page.waitForURL(/.*\/catalog.*event/i, { timeout: 10000 });
    
    // Click on the first event in the list
    const firstEventLink = page.locator('tbody tr a, [role="row"] a').first();
    await firstEventLink.click();
    
    // Wait for the event details page to load
    await page.waitForLoadState('networkidle');
    
    // 1. Take screenshot of event details page after loading
    const eventDetailsLoaded = await page.screenshot({ fullPage: true });
    await testInfo.attach('1-event-details-loaded.png', { 
      body: eventDetailsLoaded, 
      contentType: 'image/png' 
    });
    
    // Verify the About card is present
    const aboutCard = page.locator('text=About').first();
    await expect(aboutCard).toBeVisible();
    
    // Check for key fields in the About section
    // These should be links (EntityRefLink components)
    const ownerLabel = page.locator('text=OWNER').first();
    await expect(ownerLabel).toBeVisible();
    
    const typeLabel = page.locator('text=TYPE').first();
    await expect(typeLabel).toBeVisible();
    
    const lifecycleLabel = page.locator('text=LIFECYCLE').first();
    await expect(lifecycleLabel).toBeVisible();
    
    // Verify that Owner is a link (EntityRefLink)
    const ownerSection = page.locator('text=OWNER').first().locator('..');
    const ownerLink = ownerSection.locator('a');
    await expect(ownerLink).toBeVisible();
    
    // Check for optional fields that should be links when present
    const domainLabel = page.locator('text=DOMAIN').first();
    if (await domainLabel.isVisible()) {
      const domainSection = domainLabel.locator('..');
      const domainLink = domainSection.locator('a');
      await expect(domainLink).toBeVisible();
    }
    
    const subdomainLabel = page.locator('text=SUBDOMAIN').first();
    if (await subdomainLabel.isVisible()) {
      const subdomainSection = subdomainLabel.locator('..');
      const subdomainLink = subdomainSection.locator('a');
      await expect(subdomainLink).toBeVisible();
    }
    
    const systemLabel = page.locator('text=SYSTEM').first();
    if (await systemLabel.isVisible()) {
      const systemSection = systemLabel.locator('..');
      const systemLink = systemSection.locator('a');
      await expect(systemLink).toBeVisible();
    }
    
    // 2. Take final screenshot showing all verified fields
    const fieldsVerified = await page.screenshot({ fullPage: true });
    await testInfo.attach('2-fields-verified.png', { 
      body: fieldsVerified, 
      contentType: 'image/png' 
    });
  });
});

// Authentication is now handled by the shared auth-helper.ts
