import { expect, test } from "@playwright/test";

test.describe("Admin Dashboard E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@example.com");
    await page.fill('[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/admin");
  });

  test("should display admin dashboard overview", async ({ page }) => {
    await page.goto("/admin");

    // Check main dashboard elements
    await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();

    // Check metrics cards
    await expect(
      page.locator('[data-testid="total-users-metric"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="total-resumes-metric"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="total-applications-metric"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="success-rate-metric"]')
    ).toBeVisible();

    // Verify metrics have values
    const totalUsers = page.locator(
      '[data-testid="total-users-metric"] .text-3xl'
    );
    await expect(totalUsers).not.toBeEmpty();

    const totalResumes = page.locator(
      '[data-testid="total-resumes-metric"] .text-3xl'
    );
    await expect(totalResumes).not.toBeEmpty();
  });

  test("should display quick actions section", async ({ page }) => {
    await page.goto("/admin");

    // Check quick actions
    await expect(page.locator('h2:has-text("Quick Actions")')).toBeVisible();

    // Verify quick action buttons
    await expect(page.locator('a:has-text("Manage Users")')).toBeVisible();
    await expect(page.locator('a:has-text("View Analytics")')).toBeVisible();
    await expect(page.locator('a:has-text("System Health")')).toBeVisible();
    await expect(page.locator('a:has-text("Generate Reports")')).toBeVisible();
  });

  test("should navigate to user management from quick actions", async ({
    page,
  }) => {
    await page.goto("/admin");

    // Click on Manage Users quick action
    await page.click('a:has-text("Manage Users")');

    // Should navigate to users page
    await page.waitForURL("/admin/users");
    await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
  });

  test("should navigate to analytics from quick actions", async ({ page }) => {
    await page.goto("/admin");

    // Click on View Analytics quick action
    await page.click('a:has-text("View Analytics")');

    // Should navigate to analytics page
    await page.waitForURL("/admin/analytics");
    await expect(
      page.locator('h1:has-text("Analytics Dashboard")')
    ).toBeVisible();
  });

  test("should display recent activity section", async ({ page }) => {
    await page.goto("/admin");

    // Check recent activity section
    await expect(page.locator('h2:has-text("Recent Activity")')).toBeVisible();

    // Should show activity items or empty state
    const activityList = page.locator('[data-testid="recent-activity-list"]');
    await expect(activityList).toBeVisible();

    // Check if there are activity items
    const activityItems = page.locator('[data-testid="activity-item"]');
    const count = await activityItems.count();

    if (count > 0) {
      // Verify activity items have proper structure
      const firstItem = activityItems.first();
      await expect(firstItem.locator(".font-medium")).toBeVisible(); // User name
      await expect(firstItem.locator(".text-xs")).toBeVisible(); // Timestamp
    } else {
      // Should show empty state
      await expect(page.locator("text=No recent activity")).toBeVisible();
    }
  });

  test("should display system status indicators", async ({ page }) => {
    await page.goto("/admin");

    // Check system status section if it exists
    const statusSection = page.locator('[data-testid="system-status"]');

    if (await statusSection.isVisible()) {
      // Verify status indicators
      await expect(
        statusSection.locator('[data-testid="database-status"]')
      ).toBeVisible();
      await expect(
        statusSection.locator('[data-testid="redis-status"]')
      ).toBeVisible();
      await expect(
        statusSection.locator('[data-testid="ai-status"]')
      ).toBeVisible();
    }
  });

  test("should refresh data when refresh button is clicked", async ({
    page,
  }) => {
    await page.goto("/admin");

    // Wait for initial load
    await page.waitForLoadState("networkidle");

    // Find and click refresh button if it exists
    const refreshButton = page.locator('[data-testid="refresh-dashboard"]');

    if (await refreshButton.isVisible()) {
      await refreshButton.click();

      // Should show loading state briefly
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible(
        { timeout: 1000 }
      );

      // Wait for data to load again
      await page.waitForLoadState("networkidle");

      // Metrics should still be visible
      await expect(
        page.locator('[data-testid="total-users-metric"]')
      ).toBeVisible();
    }
  });

  test("should handle API errors gracefully", async ({ page }) => {
    // Intercept API calls and make them fail
    await page.route("**/api/admin/analytics/**", (route) => route.abort());

    await page.goto("/admin");

    // Should show error state or fallback content
    const errorState = page.locator("text=Failed to load");
    const retryButton = page.locator('button:has-text("Retry")');

    // Either error message or fallback should be visible
    const hasError = await errorState.isVisible();
    const hasRetry = await retryButton.isVisible();

    expect(hasError || hasRetry).toBe(true);
  });

  test("should display proper loading states", async ({ page }) => {
    await page.goto("/admin");

    // Should show loading indicators initially
    const loadingSpinner = page.locator('[data-testid="loading-spinner"]');

    // Loading should disappear after data loads
    await expect(loadingSpinner).toBeHidden({ timeout: 10000 });

    // Content should be visible
    await expect(
      page.locator('[data-testid="total-users-metric"]')
    ).toBeVisible();
  });

  test("should be responsive on mobile devices", async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await page.goto("/admin");

    // Check mobile-specific elements
    const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(
        page.locator('[data-testid="mobile-sidebar"]')
      ).toBeVisible();
    }

    // Metrics should stack vertically on mobile
    const metricsContainer = page.locator('[data-testid="metrics-container"]');
    await expect(metricsContainer).toBeVisible();
  });

  test("should maintain state when navigating back", async ({ page }) => {
    await page.goto("/admin");

    // Navigate to users page
    await page.click('a:has-text("Manage Users")');
    await page.waitForURL("/admin/users");

    // Navigate back to dashboard
    await page.goBack();
    await page.waitForURL("/admin");

    // Dashboard should load properly
    await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
    await expect(
      page.locator('[data-testid="total-users-metric"]')
    ).toBeVisible();
  });

  test("should handle concurrent data updates", async ({ page }) => {
    await page.goto("/admin");

    // Wait for initial load
    await page.waitForLoadState("networkidle");

    // Get initial metrics
    const initialUserCount = await page
      .locator('[data-testid="total-users-metric"] .text-3xl')
      .textContent();

    // Trigger multiple refreshes
    const refreshButton = page.locator('[data-testid="refresh-dashboard"]');

    if (await refreshButton.isVisible()) {
      // Click refresh multiple times quickly
      await Promise.all([
        refreshButton.click(),
        refreshButton.click(),
        refreshButton.click(),
      ]);

      // Should not break the UI
      await page.waitForLoadState("networkidle");
      await expect(
        page.locator('[data-testid="total-users-metric"]')
      ).toBeVisible();
    }
  });

  test("should display charts and visualizations", async ({ page }) => {
    await page.goto("/admin");

    // Check for chart containers
    const userGrowthChart = page.locator('[data-testid="user-growth-chart"]');
    const applicationChart = page.locator('[data-testid="application-chart"]');

    if (await userGrowthChart.isVisible()) {
      // Charts should render without errors
      await expect(userGrowthChart.locator("svg")).toBeVisible();
    }

    if (await applicationChart.isVisible()) {
      await expect(applicationChart.locator("svg")).toBeVisible();
    }
  });
});
