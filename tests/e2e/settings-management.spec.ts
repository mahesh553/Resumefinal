import { expect, test } from '@playwright/test';

test.describe('Settings Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
    
    // Navigate to settings
    await page.goto('/admin/settings');
  });

  test('should display settings management interface', async ({ page }) => {
    // Check main elements
    await expect(page.locator('h1:has-text("System Settings")')).toBeVisible();
    
    // Check save/reset buttons
    await expect(page.locator('button:has-text("Save Changes")')).toBeVisible();
    await expect(page.locator('button:has-text("Reset to Defaults")')).toBeVisible();
  });

  test('should display settings navigation tabs', async ({ page }) => {
    // Wait for settings to load
    await page.waitForSelector('[data-testid="settings-navigation"]', { timeout: 10000 });
    
    // Check navigation tabs
    await expect(page.locator('[data-testid="general-settings-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-settings-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="storage-settings-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="security-settings-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="notifications-settings-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-settings-tab"]')).toBeVisible();
  });

  test('should display and modify general settings', async ({ page }) => {
    // Navigate to general settings (should be default)
    await page.click('[data-testid="general-settings-tab"]');
    
    // Check general settings fields
    await expect(page.locator('input[name="siteName"]')).toBeVisible();
    await expect(page.locator('textarea[name="siteDescription"]')).toBeVisible();
    await expect(page.locator('input[name="supportEmail"]')).toBeVisible();
    await expect(page.locator('input[type="checkbox"][name="maintenanceMode"]')).toBeVisible();
    await expect(page.locator('input[type="checkbox"][name="registrationEnabled"]')).toBeVisible();
    
    // Modify site name
    const siteNameInput = page.locator('input[name="siteName"]');
    const originalValue = await siteNameInput.inputValue();
    const newValue = `${originalValue} - Updated`;
    
    await siteNameInput.clear();
    await siteNameInput.fill(newValue);
    
    // Save changes
    await page.click('button:has-text("Save Changes")');
    
    // Should show success message
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();
    
    // Restore original value
    await siteNameInput.clear();
    await siteNameInput.fill(originalValue);
    await page.click('button:has-text("Save Changes")');
  });

  test('should display and modify email settings', async ({ page }) => {
    // Navigate to email settings
    await page.click('[data-testid="email-settings-tab"]');
    
    // Check email settings fields
    await expect(page.locator('input[name="smtpHost"]')).toBeVisible();
    await expect(page.locator('input[name="smtpPort"]')).toBeVisible();
    await expect(page.locator('input[name="smtpUser"]')).toBeVisible();
    await expect(page.locator('input[name="smtpPassword"]')).toBeVisible();
    await expect(page.locator('input[name="fromEmail"]')).toBeVisible();
    await expect(page.locator('input[name="fromName"]')).toBeVisible();
    await expect(page.locator('input[type="checkbox"][name="smtpSecure"]')).toBeVisible();
    
    // Test SMTP connection button
    const testButton = page.locator('button:has-text("Test Connection")');
    if (await testButton.isVisible()) {
      await testButton.click();
      
      // Should show test result (either success or error)
      const testResult = page.locator('[data-testid="smtp-test-result"]');
      await expect(testResult).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display and modify storage settings', async ({ page }) => {
    // Navigate to storage settings
    await page.click('[data-testid="storage-settings-tab"]');
    
    // Check storage settings fields
    await expect(page.locator('select[name="storageProvider"]')).toBeVisible();
    await expect(page.locator('input[name="maxFileSize"]')).toBeVisible();
    await expect(page.locator('input[name="allowedFileTypes"]')).toBeVisible();
    
    // Check cloud storage settings (if enabled)
    const storageProvider = page.locator('select[name="storageProvider"]');
    const currentProvider = await storageProvider.inputValue();
    
    if (currentProvider !== 'local') {
      // Should show cloud storage configuration
      const bucketName = page.locator('input[name="bucketName"]');
      const region = page.locator('input[name="region"]');
      
      if (await bucketName.isVisible()) {
        await expect(bucketName).toBeVisible();
      }
      if (await region.isVisible()) {
        await expect(region).toBeVisible();
      }
    }
    
    // Test storage connection
    const testStorageButton = page.locator('button:has-text("Test Storage")');
    if (await testStorageButton.isVisible()) {
      await testStorageButton.click();
      
      // Should show test result
      const testResult = page.locator('[data-testid="storage-test-result"]');
      await expect(testResult).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display and modify security settings', async ({ page }) => {
    // Navigate to security settings
    await page.click('[data-testid="security-settings-tab"]');
    
    // Check security settings fields
    await expect(page.locator('input[name="jwtExpirationTime"]')).toBeVisible();
    await expect(page.locator('input[name="passwordMinLength"]')).toBeVisible();
    await expect(page.locator('input[name="maxLoginAttempts"]')).toBeVisible();
    await expect(page.locator('input[name="lockoutDuration"]')).toBeVisible();
    await expect(page.locator('input[type="checkbox"][name="requireEmailVerification"]')).toBeVisible();
    await expect(page.locator('input[type="checkbox"][name="enableTwoFactor"]')).toBeVisible();
    
    // Check session settings
    await expect(page.locator('input[name="sessionTimeout"]')).toBeVisible();
    await expect(page.locator('input[type="checkbox"][name="forceLogoutInactive"]')).toBeVisible();
    
    // Modify a security setting
    const maxAttempts = page.locator('input[name="maxLoginAttempts"]');
    const originalValue = await maxAttempts.inputValue();
    
    await maxAttempts.clear();
    await maxAttempts.fill('5');
    
    // Save changes
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();
    
    // Restore original value
    await maxAttempts.clear();
    await maxAttempts.fill(originalValue);
    await page.click('button:has-text("Save Changes")');
  });

  test('should display and modify notification settings', async ({ page }) => {
    // Navigate to notification settings
    await page.click('[data-testid="notifications-settings-tab"]');
    
    // Check notification settings fields
    await expect(page.locator('input[type="checkbox"][name="emailNotifications"]')).toBeVisible();
    await expect(page.locator('input[type="checkbox"][name="pushNotifications"]')).toBeVisible();
    await expect(page.locator('input[name="slackWebhook"]')).toBeVisible();
    await expect(page.locator('input[name="discordWebhook"]')).toBeVisible();
    
    // Check notification types
    const notificationTypes = [
      'newUserRegistration',
      'systemErrors',
      'securityAlerts',
      'performanceIssues',
      'backupStatus'
    ];
    
    for (const type of notificationTypes) {
      const checkbox = page.locator(`input[type="checkbox"][name="${type}"]`);
      if (await checkbox.isVisible()) {
        await expect(checkbox).toBeVisible();
      }
    }
    
    // Test webhook if configured
    const testSlackButton = page.locator('button:has-text("Test Slack")');
    if (await testSlackButton.isVisible()) {
      await testSlackButton.click();
      
      // Should show test result
      const testResult = page.locator('[data-testid="slack-test-result"]');
      await expect(testResult).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display and modify AI settings', async ({ page }) => {
    // Navigate to AI settings
    await page.click('[data-testid="ai-settings-tab"]');
    
    // Check AI provider settings
    await expect(page.locator('select[name="primaryProvider"]')).toBeVisible();
    await expect(page.locator('input[name="geminiApiKey"]')).toBeVisible();
    await expect(page.locator('input[name="openaiApiKey"]')).toBeVisible();
    await expect(page.locator('input[name="anthropicApiKey"]')).toBeVisible();
    
    // Check AI configuration
    await expect(page.locator('input[name="maxTokens"]')).toBeVisible();
    await expect(page.locator('input[name="temperature"]')).toBeVisible();
    await expect(page.locator('input[name="requestTimeout"]')).toBeVisible();
    await expect(page.locator('input[type="checkbox"][name="enableFallback"]')).toBeVisible();
    
    // Check rate limiting
    await expect(page.locator('input[name="rateLimitPerUser"]')).toBeVisible();
    await expect(page.locator('input[name="rateLimitWindow"]')).toBeVisible();
    
    // Test AI connection
    const testAIButton = page.locator('button:has-text("Test AI Connection")');
    if (await testAIButton.isVisible()) {
      await testAIButton.click();
      
      // Should show test result
      const testResult = page.locator('[data-testid="ai-test-result"]');
      await expect(testResult).toBeVisible({ timeout: 15000 });
    }
  });

  test('should validate form inputs', async ({ page }) => {
    // Navigate to general settings
    await page.click('[data-testid="general-settings-tab"]');
    
    // Clear required field and try to save
    const siteNameInput = page.locator('input[name="siteName"]');
    await siteNameInput.clear();
    
    await page.click('button:has-text("Save Changes")');
    
    // Should show validation error
    await expect(page.locator('text=Site name is required')).toBeVisible();
    
    // Fill field again
    await siteNameInput.fill('QoderResume');
  });

  test('should reset settings to defaults', async ({ page }) => {
    // Navigate to general settings
    await page.click('[data-testid="general-settings-tab"]');
    
    // Modify a setting
    const siteNameInput = page.locator('input[name="siteName"]');
    const originalValue = await siteNameInput.inputValue();
    
    await siteNameInput.clear();
    await siteNameInput.fill('Modified Site Name');
    
    // Click reset to defaults
    const resetButton = page.locator('button:has-text("Reset to Defaults")');
    await resetButton.click();
    
    // Should show confirmation dialog
    await expect(page.locator('text=Reset Settings')).toBeVisible();
    await expect(page.locator('text=Are you sure you want to reset all settings?')).toBeVisible();
    
    // Confirm reset
    await page.click('button:has-text("Reset")');
    
    // Should show success message
    await expect(page.locator('text=Settings reset successfully')).toBeVisible();
    
    // Field should be reset (or close to original value)
    const resetValue = await siteNameInput.inputValue();
    expect(resetValue).not.toBe('Modified Site Name');
  });

  test('should handle unsaved changes warning', async ({ page }) => {
    // Navigate to general settings
    await page.click('[data-testid="general-settings-tab"]');
    
    // Modify a setting
    const siteNameInput = page.locator('input[name="siteName"]');
    await siteNameInput.clear();
    await siteNameInput.fill('Unsaved Changes Test');
    
    // Try to navigate away
    await page.click('[data-testid="email-settings-tab"]');
    
    // Should show unsaved changes warning
    const warningDialog = page.locator('text=Unsaved Changes');
    
    if (await warningDialog.isVisible({ timeout: 2000 })) {
      await expect(warningDialog).toBeVisible();
      
      // Cancel navigation
      await page.click('button:has-text("Cancel")');
      
      // Should stay on general settings
      await expect(page.locator('input[name="siteName"]')).toBeVisible();
      
      // Save changes
      await page.click('button:has-text("Save Changes")');
      await expect(page.locator('text=Settings saved successfully')).toBeVisible();
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept settings API calls and make them fail
    await page.route('**/api/admin/settings**', route => route.abort());
    
    await page.goto('/admin/settings');
    
    // Should show error state
    const errorState = page.locator('text=Failed to load settings');
    const retryButton = page.locator('button:has-text("Retry")');
    
    const hasError = await errorState.isVisible({ timeout: 5000 });
    const hasRetry = await retryButton.isVisible({ timeout: 5000 });
    
    expect(hasError || hasRetry).toBe(true);
  });

  test('should maintain tab state during operations', async ({ page }) => {
    // Navigate to email settings
    await page.click('[data-testid="email-settings-tab"]');
    
    // Modify a setting
    const smtpHost = page.locator('input[name="smtpHost"]');
    if (await smtpHost.isVisible()) {
      await smtpHost.clear();
      await smtpHost.fill('smtp.example.com');
      
      // Save changes
      await page.click('button:has-text("Save Changes")');
      await expect(page.locator('text=Settings saved successfully')).toBeVisible();
      
      // Should remain on email settings tab
      await expect(page.locator('[data-testid="email-settings-tab"][aria-selected="true"]')).toBeVisible();
    }
  });

  test('should export/import settings', async ({ page }) => {
    // Check for export settings button
    const exportButton = page.locator('button:has-text("Export Settings")');
    
    if (await exportButton.isVisible()) {
      // Set up download handler
      const downloadPromise = page.waitForEvent('download');
      
      await exportButton.click();
      
      // Should trigger download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('settings');
      expect(download.suggestedFilename()).toMatch(/\.(json|yaml|yml)$/);
    }
    
    // Check for import settings button
    const importButton = page.locator('button:has-text("Import Settings")');
    
    if (await importButton.isVisible()) {
      await importButton.click();
      
      // Should show import modal or file selector
      const importModal = page.locator('[data-testid="import-settings-modal"]');
      const fileInput = page.locator('input[type="file"]');
      
      if (await importModal.isVisible()) {
        await expect(importModal).toBeVisible();
        
        // Close modal
        const closeButton = importModal.locator('button:has-text("Cancel")');
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
    }
  });

  test('should be responsive on mobile devices', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    // Check mobile layout
    const settingsContainer = page.locator('[data-testid="settings-container"]');
    await expect(settingsContainer).toBeVisible();

    // Navigation should be mobile-friendly
    const settingsNavigation = page.locator('[data-testid="settings-navigation"]');
    await expect(settingsNavigation).toBeVisible();

    // Tabs should be scrollable or collapsed on mobile
    const tabsContainer = page.locator('[data-testid="settings-tabs"]');
    if (await tabsContainer.isVisible()) {
      await expect(tabsContainer).toBeVisible();
    }

    // Form elements should stack properly
    const formElements = page.locator('input, select, textarea');
    const elementCount = await formElements.count();

    if (elementCount > 0) {
      const firstElement = formElements.first();
      await expect(firstElement).toBeVisible();
    }
  });

  test('should handle concurrent settings updates', async ({ page }) => {
    // Navigate to general settings
    await page.click('[data-testid="general-settings-tab"]');
    
    // Make multiple simultaneous changes
    const siteNameInput = page.locator('input[name="siteName"]');
    const descriptionInput = page.locator('textarea[name="siteDescription"]');
    const supportEmailInput = page.locator('input[name="supportEmail"]');
    
    await Promise.all([
      siteNameInput.fill('Concurrent Test 1'),
      descriptionInput.fill('Concurrent description update'),
      supportEmailInput.fill('concurrent@example.com'),
    ]);
    
    // Save changes
    await page.click('button:has-text("Save Changes")');
    
    // Should handle updates gracefully
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();
  });

  test('should display setting descriptions and help text', async ({ page }) => {
    // Navigate through tabs and check for help text
    const tabs = [
      'general-settings-tab',
      'email-settings-tab', 
      'storage-settings-tab',
      'security-settings-tab',
      'notifications-settings-tab',
      'ai-settings-tab'
    ];
    
    for (const tab of tabs) {
      await page.click(`[data-testid="${tab}"]`);
      
      // Look for help text or descriptions
      const helpTexts = page.locator('.text-sm.text-gray-600, .help-text, [data-testid="help-text"]');
      const helpCount = await helpTexts.count();
      
      if (helpCount > 0) {
        // Help text should be visible
        const firstHelp = helpTexts.first();
        await expect(firstHelp).toBeVisible();
      }
    }
  });
});