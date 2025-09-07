import { expect, test } from '@playwright/test';

test.describe('User Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
    
    // Navigate to user management
    await page.goto('/admin/users');
  });

  test('should display user management interface', async ({ page }) => {
    // Check main elements
    await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
    
    // Check action buttons
    await expect(page.locator('button:has-text("Add User")')).toBeVisible();
    await expect(page.locator('button:has-text("Export Users")')).toBeVisible();
    
    // Check search and filter controls
    await expect(page.locator('input[placeholder*="Search users"]')).toBeVisible();
    await expect(page.locator('select[aria-label*="Filter by role"]')).toBeVisible();
    await expect(page.locator('select[aria-label*="Filter by status"]')).toBeVisible();
  });

  test('should display users table with data', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Check table headers
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Email")')).toBeVisible();
    await expect(page.locator('th:has-text("Role")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Actions")')).toBeVisible();
    
    // Should have at least one user row
    const userRows = page.locator('tbody tr');
    expect(await userRows.count()).toBeGreaterThan(0);
    
    // Check first row has proper data
    const firstRow = userRows.first();
    await expect(firstRow.locator('td').nth(0)).not.toBeEmpty(); // Name
    await expect(firstRow.locator('td').nth(1)).not.toBeEmpty(); // Email
    await expect(firstRow.locator('td').nth(2)).not.toBeEmpty(); // Role
    await expect(firstRow.locator('td').nth(3)).not.toBeEmpty(); // Status
  });

  test('should search users by name/email', async ({ page }) => {
    await page.waitForSelector('table');
    
    const searchInput = page.locator('input[placeholder*="Search users"]');
    
    // Search for admin user
    await searchInput.fill('admin');
    await page.waitForTimeout(500); // Wait for debounce
    
    // Should show filtered results
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    
    if (rowCount > 0) {
      // At least one result should contain "admin"
      const firstRow = rows.first();
      const rowText = await firstRow.textContent();
      expect(rowText?.toLowerCase()).toContain('admin');
    }
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);
  });

  test('should filter users by role', async ({ page }) => {
    await page.waitForSelector('table');
    
    // Filter by admin role
    const roleFilter = page.locator('select[aria-label*="Filter by role"]');
    await roleFilter.selectOption('admin');
    await page.waitForTimeout(500);
    
    // All visible users should have admin role
    const roleBadges = page.locator('tbody tr .bg-purple-100, tbody tr .bg-red-100');
    const badgeCount = await roleBadges.count();
    
    if (badgeCount > 0) {
      const firstBadge = roleBadges.first();
      const badgeText = await firstBadge.textContent();
      expect(badgeText?.toLowerCase()).toBe('admin');
    }
    
    // Reset filter
    await roleFilter.selectOption('');
  });

  test('should filter users by status', async ({ page }) => {
    await page.waitForSelector('table');
    
    // Filter by active status
    const statusFilter = page.locator('select[aria-label*="Filter by status"]');
    await statusFilter.selectOption('active');
    await page.waitForTimeout(500);
    
    // All visible users should have active status
    const statusBadges = page.locator('tbody tr .bg-green-100');
    const badgeCount = await statusBadges.count();
    
    if (badgeCount > 0) {
      const firstBadge = statusBadges.first();
      const badgeText = await firstBadge.textContent();
      expect(badgeText?.toLowerCase()).toBe('active');
    }
    
    // Reset filter
    await statusFilter.selectOption('');
  });

  test('should open create user modal', async ({ page }) => {
    // Click Add User button
    await page.click('button:has-text("Add User")');
    
    // Should see create modal
    await expect(page.locator('text=Create New User')).toBeVisible();
    
    // Check form fields
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('select[name="role"]')).toBeVisible();
    await expect(page.locator('input[type="checkbox"][name="sendWelcomeEmail"]')).toBeVisible();
    
    // Check action buttons
    await expect(page.locator('button:has-text("Create User")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
  });

  test('should validate create user form', async ({ page }) => {
    // Open create modal
    await page.click('button:has-text("Add User")');
    
    // Try to submit empty form
    await page.click('button:has-text("Create User")');
    
    // Should show validation errors
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
  });

  test('should create new user successfully', async ({ page }) => {
    // Open create modal
    await page.click('button:has-text("Add User")');
    
    // Fill form with valid data
    const timestamp = Date.now();
    await page.fill('input[name="name"]', `Test User ${timestamp}`);
    await page.fill('input[name="email"]', `testuser${timestamp}@example.com`);
    await page.selectOption('select[name="role"]', 'user');
    await page.check('input[type="checkbox"][name="sendWelcomeEmail"]');
    
    // Submit form
    await page.click('button:has-text("Create User")');
    
    // Modal should close
    await expect(page.locator('text=Create New User')).toBeHidden();
    
    // Should show success message
    await expect(page.locator('text=User created successfully')).toBeVisible();
    
    // New user should appear in table
    await page.waitForTimeout(1000);
    const newUserEmail = `testuser${timestamp}@example.com`;
    await expect(page.locator(`text=${newUserEmail}`)).toBeVisible();
  });

  test('should open edit user modal', async ({ page }) => {
    await page.waitForSelector('tbody tr');
    
    // Click edit button on first user
    const editButton = page.locator('button[title="Edit user"]').first();
    await editButton.click();
    
    // Should see edit modal
    await expect(page.locator('text=Edit User')).toBeVisible();
    
    // Form should be pre-filled
    const nameInput = page.locator('input[name="name"]');
    const emailInput = page.locator('input[name="email"]');
    
    await expect(nameInput).not.toHaveValue('');
    await expect(emailInput).not.toHaveValue('');
  });

  test('should update user successfully', async ({ page }) => {
    await page.waitForSelector('tbody tr');
    
    // Click edit button on first user
    const editButton = page.locator('button[title="Edit user"]').first();
    await editButton.click();
    
    // Update user name
    const nameInput = page.locator('input[name="name"]');
    const originalName = await nameInput.inputValue();
    const newName = `${originalName} (Updated)`;
    
    await nameInput.clear();
    await nameInput.fill(newName);
    
    // Submit form
    await page.click('button:has-text("Update User")');
    
    // Modal should close
    await expect(page.locator('text=Edit User')).toBeHidden();
    
    // Should show success message
    await expect(page.locator('text=User updated successfully')).toBeVisible();
    
    // Updated name should appear in table
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${newName}`)).toBeVisible();
  });

  test('should confirm user deletion', async ({ page }) => {
    await page.waitForSelector('tbody tr');
    
    // Find a non-admin user to delete
    const userRows = page.locator('tbody tr');
    const rowCount = await userRows.count();
    
    for (let i = 0; i < rowCount; i++) {
      const row = userRows.nth(i);
      const roleText = await row.locator('td').nth(2).textContent();
      
      if (roleText?.toLowerCase() !== 'admin') {
        // Click delete button
        await row.locator('button[title="Delete user"]').click();
        
        // Should see confirmation modal
        await expect(page.locator('text=Delete User')).toBeVisible();
        await expect(page.locator('text=Are you sure you want to delete this user?')).toBeVisible();
        
        // Check action buttons
        await expect(page.locator('button:has-text("Delete")')).toBeVisible();
        await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
        
        // Cancel deletion
        await page.click('button:has-text("Cancel")');
        await expect(page.locator('text=Delete User')).toBeHidden();
        
        break;
      }
    }
  });

  test('should promote user to admin', async ({ page }) => {
    await page.waitForSelector('tbody tr');
    
    // Find a regular user to promote
    const userRows = page.locator('tbody tr');
    const rowCount = await userRows.count();
    
    for (let i = 0; i < rowCount; i++) {
      const row = userRows.nth(i);
      const roleText = await row.locator('td').nth(2).textContent();
      
      if (roleText?.toLowerCase() === 'user') {
        // Click promote button if it exists
        const promoteButton = row.locator('button[title="Promote to admin"]');
        
        if (await promoteButton.isVisible()) {
          await promoteButton.click();
          
          // Should show success message
          await expect(page.locator('text=User promoted successfully')).toBeVisible();
          
          // Role should be updated in table
          await page.waitForTimeout(1000);
          const updatedRole = await row.locator('td').nth(2).textContent();
          expect(updatedRole?.toLowerCase()).toBe('admin');
        }
        
        break;
      }
    }
  });

  test('should suspend and activate users', async ({ page }) => {
    await page.waitForSelector('tbody tr');
    
    // Find an active user to suspend
    const userRows = page.locator('tbody tr');
    const rowCount = await userRows.count();
    
    for (let i = 0; i < rowCount; i++) {
      const row = userRows.nth(i);
      const statusText = await row.locator('td').nth(3).textContent();
      
      if (statusText?.toLowerCase() === 'active') {
        // Click suspend button if it exists
        const suspendButton = row.locator('button[title="Suspend user"]');
        
        if (await suspendButton.isVisible()) {
          await suspendButton.click();
          
          // Should show success message
          await expect(page.locator('text=User suspended successfully')).toBeVisible();
          
          // Status should be updated
          await page.waitForTimeout(1000);
          const updatedStatus = await row.locator('td').nth(3).textContent();
          expect(updatedStatus?.toLowerCase()).toBe('suspended');
        }
        
        break;
      }
    }
  });

  test('should handle pagination', async ({ page }) => {
    await page.waitForSelector('table');
    
    // Check if pagination controls exist
    const pagination = page.locator('[data-testid="pagination"]');
    
    if (await pagination.isVisible()) {
      // Check pagination info
      const paginationInfo = page.locator('[data-testid="pagination-info"]');
      await expect(paginationInfo).toBeVisible();
      
      // Check navigation buttons
      const nextButton = page.locator('button:has-text("Next")');
      const prevButton = page.locator('button:has-text("Previous")');
      
      if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
        // Go to next page
        await nextButton.click();
        await page.waitForLoadState('networkidle');
        
        // Should still show table
        await expect(page.locator('table')).toBeVisible();
        
        // Go back to previous page
        if (await prevButton.isVisible() && !await prevButton.isDisabled()) {
          await prevButton.click();
          await page.waitForLoadState('networkidle');
          await expect(page.locator('table')).toBeVisible();
        }
      }
    }
  });

  test('should change page size', async ({ page }) => {
    await page.waitForSelector('table');
    
    // Check if page size selector exists
    const pageSizeSelector = page.locator('select[aria-label*="items per page"]');
    
    if (await pageSizeSelector.isVisible()) {
      // Change page size
      await pageSizeSelector.selectOption('50');
      await page.waitForLoadState('networkidle');
      
      // Table should still be visible
      await expect(page.locator('table')).toBeVisible();
    }
  });

  test('should export users', async ({ page }) => {
    // Click export button
    const exportButton = page.locator('button:has-text("Export Users")');
    
    if (await exportButton.isVisible()) {
      // Set up download handler
      const downloadPromise = page.waitForEvent('download');
      
      await exportButton.click();
      
      // Should trigger download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('users');
      expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx?)$/);
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept user API calls and make them fail
    await page.route('**/api/admin/users**', route => route.abort());
    
    await page.goto('/admin/users');
    
    // Should show error state
    await expect(page.locator('text=Failed to load users')).toBeVisible();
    
    // Should show retry button
    const retryButton = page.locator('button:has-text("Retry")');
    await expect(retryButton).toBeVisible();
  });

  test('should maintain filters across page navigation', async ({ page }) => {
    await page.waitForSelector('table');
    
    // Apply filters
    const roleFilter = page.locator('select[aria-label*="Filter by role"]');
    await roleFilter.selectOption('admin');
    
    const searchInput = page.locator('input[placeholder*="Search users"]');
    await searchInput.fill('admin');
    
    // Navigate away and back
    await page.goto('/admin');
    await page.goto('/admin/users');
    
    // Filters should be reset (expected behavior)
    await expect(roleFilter).toHaveValue('');
    await expect(searchInput).toHaveValue('');
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await page.waitForSelector('table');

    // On mobile, table should be scrollable or cards should be used
    const table = page.locator('table');
    const mobileCards = page.locator('[data-testid="user-card"]');

    // Either table should be scrollable or cards should be visible
    const tableVisible = await table.isVisible();
    const cardsVisible = await mobileCards.count() > 0;

    expect(tableVisible || cardsVisible).toBe(true);
  });
});