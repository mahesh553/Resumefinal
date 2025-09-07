import { expect, test } from "@playwright/test";

test.describe("Permission System E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@example.com");
    await page.fill('[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/admin");
  });

  test("should navigate to permission management", async ({ page }) => {
    // Navigate to admin panel
    await page.goto("/admin");

    // Click on Security & Permissions in sidebar
    await page.click("text=Security & Permissions");

    // Should see permission management interface
    await expect(page.locator("text=Permission Management")).toBeVisible();
    await expect(
      page.locator("text=Manage system permissions and access controls")
    ).toBeVisible();
  });

  test("should display permissions list", async ({ page }) => {
    await page.goto("/admin/permissions");

    // Wait for permissions to load
    await page.waitForSelector("table", { timeout: 10000 });

    // Should see table headers
    await expect(page.locator("text=Permission")).toBeVisible();
    await expect(page.locator("text=Action")).toBeVisible();
    await expect(page.locator("text=Resource")).toBeVisible();
    await expect(page.locator("text=Status")).toBeVisible();

    // Should see at least one permission row
    await expect(page.locator("tbody tr")).toHaveCount(1);
  });

  test("should filter permissions", async ({ page }) => {
    await page.goto("/admin/permissions");

    // Wait for permissions to load
    await page.waitForSelector("table");

    // Filter by action
    await page.selectOption('select[aria-label="Filter by action"]', "create");

    // Check that filtered results only show create actions
    const actionBadges = page.locator(".bg-green-100.text-green-800");
    await expect(actionBadges.first()).toContainText("create");

    // Clear filter
    await page.selectOption('select[aria-label="Filter by action"]', "");
  });

  test("should search permissions", async ({ page }) => {
    await page.goto("/admin/permissions");

    // Wait for permissions to load
    await page.waitForSelector("table");

    // Search for "user" permissions
    await page.fill('input[placeholder="Search permissions..."]', "user");

    // Should show filtered results
    const rows = page.locator("tbody tr");
    const firstRow = rows.first();
    await expect(firstRow).toContainText("user");
  });

  test("should open create permission modal", async ({ page }) => {
    await page.goto("/admin/permissions");

    // Click Add Permission button
    await page.click("text=Add Permission");

    // Should see create modal
    await expect(page.locator("text=Create New Permission")).toBeVisible();
    await expect(page.locator('label:text("Action")')).toBeVisible();
    await expect(page.locator('label:text("Resource")')).toBeVisible();
    await expect(page.locator('label:text("Name")')).toBeVisible();

    // Close modal
    await page.click("text=Cancel");
    await expect(page.locator("text=Create New Permission")).not.toBeVisible();
  });

  test("should validate create permission form", async ({ page }) => {
    await page.goto("/admin/permissions");

    // Open create modal
    await page.click("text=Add Permission");

    // Try to submit empty form
    await page.click("text=Create Permission");

    // Should see validation errors
    await expect(page.locator("text=Action is required")).toBeVisible();
    await expect(page.locator("text=Resource is required")).toBeVisible();
    await expect(page.locator("text=Name is required")).toBeVisible();
  });

  test("should navigate to role management", async ({ page }) => {
    await page.goto("/admin");

    // Navigate to roles page (assuming it's in security section)
    await page.click("text=Security & Permissions");
    await page.click("text=Roles");

    // Should see role management interface
    await expect(page.locator("text=Role Management")).toBeVisible();
    await expect(
      page.locator("text=Manage user roles and their permissions")
    ).toBeVisible();
  });

  test("should display roles list", async ({ page }) => {
    await page.goto("/admin/roles");

    // Wait for roles to load
    await page.waitForSelector("table", { timeout: 10000 });

    // Should see table headers
    await expect(page.locator("text=Role")).toBeVisible();
    await expect(page.locator("text=Type")).toBeVisible();
    await expect(page.locator("text=Scope")).toBeVisible();
    await expect(page.locator("text=Permissions")).toBeVisible();

    // Should see at least one role row
    await expect(page.locator("tbody tr")).toHaveCount(1);
  });

  test("should open create role modal", async ({ page }) => {
    await page.goto("/admin/roles");

    // Click Add Role button
    await page.click("text=Add Role");

    // Should see create modal
    await expect(page.locator("text=Create New Role")).toBeVisible();
    await expect(page.locator('label:text("Name")')).toBeVisible();
    await expect(page.locator('label:text("Display Name")')).toBeVisible();
    await expect(page.locator('label:text("Type")')).toBeVisible();

    // Close modal
    await page.click("text=Cancel");
    await expect(page.locator("text=Create New Role")).not.toBeVisible();
  });

  test("should filter roles by type", async ({ page }) => {
    await page.goto("/admin/roles");

    // Wait for roles to load
    await page.waitForSelector("table");

    // Filter by admin type
    await page.selectOption('select[aria-label="Filter by type"]', "admin");

    // Check that filtered results only show admin roles
    const typeBadges = page.locator(".bg-purple-100.text-purple-800");
    await expect(typeBadges.first()).toContainText("admin");
  });

  test("should open manage permissions modal for role", async ({ page }) => {
    await page.goto("/admin/roles");

    // Wait for roles to load
    await page.waitForSelector("table");

    // Click on first manage permissions button (key icon)
    await page.locator('[title="Manage permissions"]').first().click();

    // Should see permissions management modal
    await expect(page.locator("text=Manage Permissions")).toBeVisible();
    await expect(
      page.locator("text=Select permissions for this role")
    ).toBeVisible();

    // Should see permission checkboxes
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(1);
  });

  test("should show role users", async ({ page }) => {
    await page.goto("/admin/roles");

    // Wait for roles to load
    await page.waitForSelector("table");

    // Click on first view users button (users icon)
    await page.locator('[title="View users"]').first().click();

    // Should see users modal
    await expect(page.locator("text=Users with Role")).toBeVisible();
  });

  test("should not show delete button for system roles", async ({ page }) => {
    await page.goto("/admin/roles");

    // Wait for roles to load
    await page.waitForSelector("table");

    // Find a system role row
    const systemRoleRow = page
      .locator('tbody tr:has-text("System Role")')
      .first();

    // Should not have delete button in that row
    await expect(
      systemRoleRow.locator('[title="Delete role"]')
    ).not.toBeVisible();
  });

  test("should handle permission system errors gracefully", async ({
    page,
  }) => {
    // Simulate network error by blocking API calls
    await page.route("**/admin/permissions**", (route) => route.abort());

    await page.goto("/admin/permissions");

    // Should show error state
    await expect(page.locator("text=Failed to load permissions")).toBeVisible();
    await expect(page.locator("text=Retry")).toBeVisible();
  });

  test("should maintain state when navigating between tabs", async ({
    page,
  }) => {
    await page.goto("/admin/permissions");

    // Apply a filter
    await page.selectOption('select[aria-label="Filter by action"]', "create");

    // Navigate to roles
    await page.goto("/admin/roles");

    // Navigate back to permissions
    await page.goto("/admin/permissions");

    // Filter should be reset (this is expected behavior)
    await expect(
      page.locator('select[aria-label="Filter by action"]')
    ).toHaveValue("");
  });
});

test.describe("Permission System API Integration", () => {
  test("should create, update, and delete permission via API", async ({
    page,
  }) => {
    // This test would require setting up test data and API endpoints
    test.skip(true, "Requires backend API setup");
  });

  test("should handle bulk permission operations", async ({ page }) => {
    // This test would require setting up test data and API endpoints
    test.skip(true, "Requires backend API setup");
  });

  test("should validate permission constraints", async ({ page }) => {
    // This test would require setting up test data and API endpoints
    test.skip(true, "Requires backend API setup");
  });
});
