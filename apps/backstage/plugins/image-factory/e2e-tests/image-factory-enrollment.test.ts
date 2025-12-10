import { test, expect } from '@playwright/test';

test.describe('Image Factory Enrollment Template E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to Create Component page and find Image Factory template', async ({ page }) => {
    // Navigate to Create Component page
    await page.click('nav a:has-text("Create")');
    
    // Wait for the create page to load
    await page.waitForURL(/.*\/create/);
    
    // Look for the Image Factory enrollment template
    const templateCard = page.locator('[data-testid="template-card"], .MuiCard-root').filter({
      hasText: 'Enroll Managed Image'
    });
    
    await expect(templateCard).toBeVisible();
    
    // Verify template description
    await expect(templateCard).toContainText('Register a container image for automated dependency tracking');
  });

  test('should complete the full enrollment workflow for craigedmunds/docker-example', async ({ page }) => {
    // Navigate to Create Component page
    await page.click('nav a:has-text("Create")');
    await page.waitForURL(/.*\/create/);
    
    // Click on the Image Factory enrollment template
    const templateCard = page.locator('[data-testid="template-card"], .MuiCard-root').filter({
      hasText: 'Enroll Managed Image'
    });
    await templateCard.click();
    
    // Wait for the template form to load
    await page.waitForLoadState('networkidle');
    
    // Step 1: Image Information
    await expect(page.locator('text=Image Information')).toBeVisible();
    
    // Fill in Image Name
    const imageNameField = page.locator('input[name="name"], input[id*="name"]').first();
    await imageNameField.fill('docker-example');
    
    // Select Registry (should default to ghcr.io)
    const registrySelect = page.locator('select[name="registry"], [role="combobox"]:has-text("Registry")').first();
    if (await registrySelect.isVisible()) {
      await registrySelect.selectOption('ghcr.io');
    }
    
    // Fill in Repository Path
    const repositoryField = page.locator('input[name="repository"], input[id*="repository"]').first();
    await repositoryField.fill('craigedmunds/docker-example');
    
    // Click Next or continue to next step
    const nextButton = page.locator('button:has-text("Next"), button[type="submit"]').first();
    if (await nextButton.isVisible()) {
      await nextButton.click();
    }
    
    // Step 2: Source Information
    await expect(page.locator('text=Source Information')).toBeVisible();
    
    // Source Provider should default to GitHub
    const sourceProviderSelect = page.locator('select[name="sourceProvider"], [role="combobox"]:has-text("Provider")').first();
    if (await sourceProviderSelect.isVisible()) {
      await sourceProviderSelect.selectOption('github');
    }
    
    // Fill in Source Repository
    const sourceRepoField = page.locator('input[name="sourceRepo"], input[id*="sourceRepo"]').first();
    await sourceRepoField.fill('craigedmunds/docker-example');
    
    // Branch should default to main
    const branchField = page.locator('input[name="sourceBranch"], input[id*="branch"]').first();
    await expect(branchField).toHaveValue('main');
    
    // Dockerfile should default to Dockerfile
    const dockerfileField = page.locator('input[name="dockerfile"], input[id*="dockerfile"]').first();
    await expect(dockerfileField).toHaveValue('Dockerfile');
    
    // Fill in Build Workflow
    const workflowField = page.locator('input[name="workflow"], input[id*="workflow"]').first();
    await workflowField.fill('docker-image.yml');
    
    // Continue to next step
    const nextButton2 = page.locator('button:has-text("Next"), button[type="submit"]').first();
    if (await nextButton2.isVisible()) {
      await nextButton2.click();
    }
    
    // Step 3: Rebuild Policy
    await expect(page.locator('text=Rebuild Policy')).toBeVisible();
    
    // Rebuild Delay should default to 7d
    const rebuildDelaySelect = page.locator('select[name="rebuildDelay"], [role="combobox"]:has-text("Delay")').first();
    if (await rebuildDelaySelect.isVisible()) {
      await expect(rebuildDelaySelect).toHaveValue('7d');
    }
    
    // Auto-rebuild should be enabled by default
    const autoRebuildCheckbox = page.locator('input[name="autoRebuild"], input[type="checkbox"]').first();
    await expect(autoRebuildCheckbox).toBeChecked();
    
    // Continue to next step
    const nextButton3 = page.locator('button:has-text("Next"), button[type="submit"]').first();
    if (await nextButton3.isVisible()) {
      await nextButton3.click();
    }
    
    // Step 4: Metadata (Optional)
    await expect(page.locator('text=Metadata')).toBeVisible();
    
    // Fill in optional metadata
    const titleField = page.locator('input[name="title"], input[id*="title"]').first();
    await titleField.fill('Docker Example Application');
    
    const descriptionField = page.locator('textarea[name="description"], textarea[id*="description"]').first();
    await descriptionField.fill('A simple Docker example application demonstrating containerization best practices');
    
    const ownerField = page.locator('input[name="owner"], input[id*="owner"]').first();
    await ownerField.fill('craigedmunds');
    
    // System should default to image-factory
    const systemField = page.locator('input[name="system"], input[id*="system"]').first();
    await expect(systemField).toHaveValue('image-factory');
    
    // Lifecycle should default to production
    const lifecycleSelect = page.locator('select[name="lifecycle"], [role="combobox"]:has-text("Lifecycle")').first();
    if (await lifecycleSelect.isVisible()) {
      await expect(lifecycleSelect).toHaveValue('production');
    }
    
    // Submit the form
    const submitButton = page.locator('button:has-text("Create"), button:has-text("Enroll"), button[type="submit"]').last();
    await submitButton.click();
    
    // Wait for the enrollment to process
    await page.waitForLoadState('networkidle');
    
    // Check for success indicators
    // Look for success message, progress completion, or redirect to results
    const successIndicators = [
      page.locator('text=Success'),
      page.locator('text=Completed'),
      page.locator('text=Pull Request'),
      page.locator('text=enrolled'),
      page.locator('[data-testid="success"]'),
      page.locator('.MuiAlert-standardSuccess')
    ];
    
    let successFound = false;
    for (const indicator of successIndicators) {
      if (await indicator.isVisible({ timeout: 5000 }).catch(() => false)) {
        successFound = true;
        break;
      }
    }
    
    // If no success indicator found, check for task completion or results page
    if (!successFound) {
      // Look for task completion or results
      const taskCompleted = page.locator('text=Task completed', { timeout: 30000 });
      const resultsPage = page.locator('text=Next Steps', { timeout: 10000 });
      
      if (await taskCompleted.isVisible().catch(() => false)) {
        successFound = true;
      } else if (await resultsPage.isVisible().catch(() => false)) {
        successFound = true;
      }
    }
    
    expect(successFound).toBe(true);
  });

  test('should validate required fields and show errors', async ({ page }) => {
    // Navigate to Create Component page
    await page.click('nav a:has-text("Create")');
    await page.waitForURL(/.*\/create/);
    
    // Click on the Image Factory enrollment template
    const templateCard = page.locator('[data-testid="template-card"], .MuiCard-root').filter({
      hasText: 'Enroll Managed Image'
    });
    await templateCard.click();
    
    // Wait for the template form to load
    await page.waitForLoadState('networkidle');
    
    // Try to submit without filling required fields
    const submitButton = page.locator('button:has-text("Next"), button[type="submit"]').first();
    await submitButton.click();
    
    // Check for validation errors
    const errorMessages = [
      page.locator('text=required'),
      page.locator('text=This field is required'),
      page.locator('.MuiFormHelperText-error'),
      page.locator('[role="alert"]'),
      page.locator('.error')
    ];
    
    let errorFound = false;
    for (const error of errorMessages) {
      if (await error.isVisible({ timeout: 2000 }).catch(() => false)) {
        errorFound = true;
        break;
      }
    }
    
    expect(errorFound).toBe(true);
  });

  test('should validate image name pattern', async ({ page }) => {
    // Navigate to Create Component page
    await page.click('nav a:has-text("Create")');
    await page.waitForURL(/.*\/create/);
    
    // Click on the Image Factory enrollment template
    const templateCard = page.locator('[data-testid="template-card"], .MuiCard-root').filter({
      hasText: 'Enroll Managed Image'
    });
    await templateCard.click();
    
    // Wait for the template form to load
    await page.waitForLoadState('networkidle');
    
    // Test invalid image name (uppercase, spaces, special chars)
    const imageNameField = page.locator('input[name="name"], input[id*="name"]').first();
    await imageNameField.fill('Invalid Name!');
    
    // Try to continue
    const nextButton = page.locator('button:has-text("Next"), button[type="submit"]').first();
    await nextButton.click();
    
    // Check for validation error
    const errorMessages = [
      page.locator('text=invalid'),
      page.locator('text=pattern'),
      page.locator('text=lowercase'),
      page.locator('.MuiFormHelperText-error'),
      page.locator('[role="alert"]')
    ];
    
    let errorFound = false;
    for (const error of errorMessages) {
      if (await error.isVisible({ timeout: 2000 }).catch(() => false)) {
        errorFound = true;
        break;
      }
    }
    
    expect(errorFound).toBe(true);
    
    // Test valid image name
    await imageNameField.fill('valid-image-name');
    
    // Fill other required fields
    const repositoryField = page.locator('input[name="repository"], input[id*="repository"]').first();
    await repositoryField.fill('test/repo');
    
    // Should be able to continue now
    await nextButton.click();
    
    // Should progress to next step without errors
    await expect(page.locator('text=Source Information')).toBeVisible({ timeout: 5000 });
  });
});