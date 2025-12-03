import { test, expect } from '@playwright/test';

test.describe('Events UI Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have Events link in the left navigation panel', async ({ page }) => {
    // Look for the Events link in the sidebar
    const eventsLink = page.locator('nav a:has-text("Events")');
    
    await expect(eventsLink).toBeVisible();
  });

  test('should display events list when navigating to Events page', async ({ page }) => {
    // Click on the Events link
    await page.click('nav a:has-text("Events")');
    
    // Wait for navigation
    await page.waitForURL(/.*\/catalog\?filters\[kind\]=event/i);
    
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
  });
});
