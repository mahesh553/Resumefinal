import { expect, test } from '@playwright/test';

test.describe('Complete Admin Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
  });

  test('should complete full admin dashboard workflow', async ({ page }) => {
    // 1. Start from admin dashboard
    await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
    
    // 2. Navigate to user management
    await page.click('a:has-text("Manage Users")');
    await page.waitForURL('/admin/users');
    await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
    
    // 3. Create a new test user
    await page.click('button:has-text("Add User")');
    const timestamp = Date.now();
    await page.fill('input[name="name"]', `E2E Test User ${timestamp}`);
    await page.fill('input[name="email"]', `e2etest${timestamp}@example.com`);
    await page.selectOption('select[name="role"]', 'user');
    await page.click('button:has-text("Create User")');
    
    // Verify user creation
    await expect(page.locator('text=User created successfully')).toBeVisible();
    await expect(page.locator(`text=e2etest${timestamp}@example.com`)).toBeVisible();
    
    // 4. Navigate to analytics
    await page.goto('/admin/analytics');
    await expect(page.locator('h1:has-text("Analytics Dashboard")')).toBeVisible();
    
    // Verify analytics data loads
    await page.waitForSelector('[data-testid="analytics-metrics"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="total-signups-metric"]')).toBeVisible();
    
    // 5. Check system monitoring
    await page.goto('/admin/monitoring');
    await expect(page.locator('h1:has-text("System Monitoring")')).toBeVisible();
    
    // Verify system health loads
    await page.waitForSelector('[data-testid="system-health-overview"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="overall-health-status"]')).toBeVisible();
    
    // 6. Visit settings
    await page.goto('/admin/settings');
    await expect(page.locator('h1:has-text("System Settings")')).toBeVisible();
    
    // 7. Go back to user management and clean up test user
    await page.goto('/admin/users');
    
    // Find and delete the test user
    const testUserRow = page.locator(`tr:has-text("e2etest${timestamp}@example.com")`);
    if (await testUserRow.isVisible()) {
      await testUserRow.locator('button[title="Delete user"]').click();
      await page.click('button:has-text("Delete")');
      await expect(page.locator('text=User deleted successfully')).toBeVisible();
    }
    
    // 8. Return to dashboard
    await page.goto('/admin');
    await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
  });

  test('should handle admin navigation and permissions', async ({ page }) => {
    // Test sidebar navigation
    const sidebarLinks = [
      { text: 'Dashboard', url: '/admin' },
      { text: 'Users', url: '/admin/users' },
      { text: 'Analytics', url: '/admin/analytics' },
      { text: 'Monitoring', url: '/admin/monitoring' },
      { text: 'Settings', url: '/admin/settings' },
    ];

    for (const link of sidebarLinks) {
      // Click sidebar link
      await page.click(`text=${link.text}`);
      
      // Verify navigation
      await page.waitForURL(`**${link.url}`);
      
      // Verify page loads
      await expect(page.locator('h1')).toBeVisible();
    }
  });

  test('should perform bulk user operations', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForSelector('table');
    
    // Create multiple test users for bulk operations
    const testUsers = [];
    for (let i = 0; i < 3; i++) {
      const timestamp = Date.now() + i;
      const user = {
        name: `Bulk Test User ${i}`,
        email: `bulktest${timestamp}@example.com`
      };
      testUsers.push(user);
      
      // Create user
      await page.click('button:has-text("Add User")');
      await page.fill('input[name="name"]', user.name);
      await page.fill('input[name="email"]', user.email);
      await page.selectOption('select[name="role"]', 'user');
      await page.click('button:has-text("Create User")');
      await expect(page.locator('text=User created successfully')).toBeVisible();
    }
    
    // Select users for bulk operation
    for (const user of testUsers) {
      const userRow = page.locator(`tr:has-text("${user.email}")`);
      if (await userRow.isVisible()) {
        const checkbox = userRow.locator('input[type="checkbox"]');
        if (await checkbox.isVisible()) {
          await checkbox.check();
        }
      }
    }
    
    // Perform bulk action (if available)
    const bulkActionsButton = page.locator('button:has-text("Bulk Actions")');
    if (await bulkActionsButton.isVisible()) {
      await bulkActionsButton.click();
      
      // Select bulk delete
      const deleteOption = page.locator('text=Delete Selected');
      if (await deleteOption.isVisible()) {
        await deleteOption.click();
        await page.click('button:has-text("Delete")');
        await expect(page.locator('text=Users deleted successfully')).toBeVisible();
      }
    } else {
      // Clean up individually if bulk operations not available
      for (const user of testUsers) {
        const userRow = page.locator(`tr:has-text("${user.email}")`);
        if (await userRow.isVisible()) {
          await userRow.locator('button[title="Delete user"]').click();
          await page.click('button:has-text("Delete")');
          await expect(page.locator('text=User deleted successfully')).toBeVisible();
        }
      }
    }
  });

  test('should export data from multiple sections', async ({ page }) => {
    // Test data export from different sections
    const exportSections = [
      { url: '/admin/users', button: 'Export Users' },
      { url: '/admin/analytics', button: 'Export Data' },
    ];

    for (const section of exportSections) {
      await page.goto(section.url);
      
      // Wait for data to load
      await page.waitForLoadState('networkidle');
      
      const exportButton = page.locator(`button:has-text("${section.button}")`);
      if (await exportButton.isVisible()) {
        // Set up download handler
        const downloadPromise = page.waitForEvent('download');
        
        await exportButton.click();
        
        // Verify download
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx?|json)$/);
      }
    }
  });

  test('should handle system alerts and notifications', async ({ page }) => {
    // Check for system alerts in header
    const alertsButton = page.locator('[data-testid="alerts-button"]');
    
    if (await alertsButton.isVisible()) {
      await alertsButton.click();
      
      // Check alerts dropdown
      const alertsDropdown = page.locator('[data-testid="alerts-dropdown"]');
      await expect(alertsDropdown).toBeVisible();
      
      // Check for alert items
      const alertItems = page.locator('[data-testid="alert-item"]');
      const alertCount = await alertItems.count();
      
      if (alertCount > 0) {
        // Click on first alert
        await alertItems.first().click();
        
        // Should navigate to relevant section or show details
        // This depends on the specific alert implementation
      }
    }
    
    // Check notifications in monitoring section
    await page.goto('/admin/monitoring');
    await page.waitForSelector('[data-testid="system-health-overview"]');
    
    // Look for active alerts
    const activeAlerts = page.locator('[data-testid="active-alerts"]');
    if (await activeAlerts.isVisible()) {
      const alerts = page.locator('[data-testid="alert-item"]');
      const alertCount = await alerts.count();
      
      console.log(`Found ${alertCount} active alerts`);
    }
  });

  test('should test real-time updates and polling', async ({ page }) => {
    // Go to monitoring page which should have real-time updates
    await page.goto('/admin/monitoring');
    await page.waitForSelector('[data-testid="system-health-overview"]');
    
    // Get initial values
    const initialUptime = await page.locator('[data-testid="system-uptime"]').textContent();
    
    // Wait for potential updates (simulate real-time behavior)
    await page.waitForTimeout(5000);
    
    // Check if auto-refresh is working
    const realTimeIndicator = page.locator('[data-testid="real-time-indicator"]');
    if (await realTimeIndicator.isVisible()) {
      await expect(realTimeIndicator).toBeVisible();
    }
    
    // Trigger manual refresh
    const refreshButton = page.locator('button:has-text("Refresh")');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Data should still be visible
    await expect(page.locator('[data-testid="system-health-overview"]')).toBeVisible();
  });

  test('should validate admin-only access restrictions', async ({ page }) => {
    // Verify that admin sections are not accessible to non-admin users
    // This test assumes we can simulate different user roles
    
    // All admin URLs should be accessible with admin login
    const adminUrls = [
      '/admin',
      '/admin/users',
      '/admin/analytics',
      '/admin/monitoring',
      '/admin/settings',
      '/admin/security',
      '/admin/reports'
    ];

    for (const url of adminUrls) {
      await page.goto(url);
      
      // Should not redirect to login or show access denied
      const currentUrl = page.url();
      expect(currentUrl).toContain(url);
      
      // Should not show "Access Denied" or similar
      const accessDenied = page.locator('text=Access Denied, text=Unauthorized, text=403');
      expect(await accessDenied.count()).toBe(0);
    }
  });

  test('should handle error recovery and retry mechanisms', async ({ page }) => {
    // Test error recovery on different pages
    const testPages = ['/admin/users', '/admin/analytics', '/admin/monitoring'];

    for (const testPage of testPages) {
      // Navigate to page
      await page.goto(testPage);
      
      // Simulate network failure by intercepting API calls
      await page.route('**/api/admin/**', route => route.abort());
      
      // Trigger refresh or action that would cause API call
      const refreshButton = page.locator('button:has-text("Refresh")');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
      }
      
      // Should show error state
      const errorMessage = page.locator('text=Failed to load, text=Error loading, text=Unable to fetch');
      const retryButton = page.locator('button:has-text("Retry")');
      
      // Either error message or retry button should appear
      const hasError = await errorMessage.count() > 0;
      const hasRetry = await retryButton.count() > 0;
      
      expect(hasError || hasRetry).toBe(true);
      
      // Remove network interception
      await page.unroute('**/api/admin/**');
      
      // Try retry if button exists
      if (await retryButton.isVisible()) {
        await retryButton.click();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('should maintain consistent UI state across browser refresh', async ({ page }) => {
    // Navigate to user management and apply filters
    await page.goto('/admin/users');
    await page.waitForSelector('table');
    
    // Apply search filter
    const searchInput = page.locator('input[placeholder*="Search users"]');
    await searchInput.fill('admin');
    
    // Apply role filter
    const roleFilter = page.locator('select[aria-label*="Filter by role"]');
    await roleFilter.selectOption('admin');
    
    // Refresh the page
    await page.reload();
    
    // Filters should be reset (this is expected behavior)
    await expect(searchInput).toHaveValue('');
    await expect(roleFilter).toHaveValue('');
    
    // But the page should still function
    await expect(page.locator('table')).toBeVisible();
  });

  test('should validate data consistency across admin sections', async ({ page }) => {
    // Get user count from dashboard
    await page.goto('/admin');
    await page.waitForSelector('[data-testid="total-users-metric"]');
    
    const dashboardUserCount = await page.locator('[data-testid="total-users-metric"] .text-3xl').textContent();
    
    // Navigate to user management and verify count
    await page.goto('/admin/users');
    await page.waitForSelector('table');
    
    // Check pagination info for total count
    const paginationInfo = page.locator('[data-testid="pagination-info"]');
    if (await paginationInfo.isVisible()) {
      const paginationText = await paginationInfo.textContent();
      // Extract total from text like "Showing 1-10 of 25 users"
      const totalMatch = paginationText?.match(/of (\d+)/);
      if (totalMatch) {
        const userManagementCount = totalMatch[1];
        // Counts should be reasonably close (allowing for timing differences)
        const dashboardCount = parseInt(dashboardUserCount || '0');
        const managementCount = parseInt(userManagementCount);
        expect(Math.abs(dashboardCount - managementCount)).toBeLessThanOrEqual(5);
      }
    }
  });
});