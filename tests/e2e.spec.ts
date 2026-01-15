import { test, expect } from '@playwright/test';

test.describe('Files Converting App', () => {
  test('should load the app', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Turn a list of paths into a project');
  });

  test('should paste paths, preview, and download zip', async ({ page }) => {
    await page.goto('/');

    // Paste paths with a duplicate and invalid name
    const testPaths = `src/components/
src/components/Button.tsx
src/components/Button.tsx
src/utils/helpers.ts
src/utils/invalid<>name.ts
src/README.md`;

    const textarea = page.locator('#path-input');
    await textarea.fill(testPaths);

    // Check line counter
    await expect(page.locator('#line-counter')).toContainText('6 lines');

    // Click preview
    await page.locator('#preview-btn').click();

    // Wait for preview to appear
    await expect(page.locator('#preview-section')).toBeVisible();

    // Check that preview shows structure
    await expect(page.locator('.tree-container')).toBeVisible();

    // Check that issues are flagged (duplicate and invalid)
    const summary = page.locator('#preview-summary');
    await expect(summary).toBeVisible();
    const summaryText = await summary.textContent();
    expect(summaryText).toMatch(/\d+ folder/);
    expect(summaryText).toMatch(/\d+ file/);

    // Check for issue badges
    const issueBadges = page.locator('.issue-badge');
    const badgeCount = await issueBadges.count();
    expect(badgeCount).toBeGreaterThan(0);

    // Download zip
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#download-zip-btn').click();
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toBe('project-structure.zip');
    expect(download.url()).toBeTruthy();
  });

  test('should handle empty input', async ({ page }) => {
    await page.goto('/');
    await page.locator('#preview-btn').click();

    // Should show alert or handle gracefully
    // Note: This test may need adjustment based on actual alert handling
    const previewSection = page.locator('#preview-section');
    await expect(previewSection).toHaveAttribute('hidden', '');
  });

  test('should clear input', async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('#path-input');
    await textarea.fill('test/path/');
    
    await page.locator('#clear-btn').click();
    
    // Handle confirmation dialog
    page.on('dialog', dialog => dialog.accept());
    
    await expect(textarea).toHaveValue('');
    await expect(page.locator('#line-counter')).toContainText('0 lines');
  });

  test('should copy cleaned list', async ({ page, context }) => {
    await page.goto('/');
    
    const testPaths = `src/components/
src/utils/helpers.ts`;
    
    await page.locator('#path-input').fill(testPaths);
    await page.locator('#preview-btn').click();
    await page.locator('#copy-cleaned-btn').click();
    
    // Verify button text changes
    await expect(page.locator('#copy-cleaned-btn')).toContainText('Copied!');
    
    // Note: Clipboard API access in Playwright requires special setup
    // This test verifies the UI feedback
  });

  test('should navigate to input with paste CTA', async ({ page }) => {
    await page.goto('/');
    
    await page.locator('#paste-cta').click();
    
    // Check that textarea is focused or scrolled into view
    const textarea = page.locator('#path-input');
    await expect(textarea).toBeFocused();
  });
});
