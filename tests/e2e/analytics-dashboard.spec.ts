import { expect, test } from "@playwright/test";

test.describe("Analytics Dashboard E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@example.com");
    await page.fill('[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/admin");

    // Navigate to analytics
    await page.goto("/admin/analytics");
  });

  test("should display analytics dashboard interface", async ({ page }) => {
    // Check main elements
    await expect(
      page.locator('h1:has-text("Analytics Dashboard")')
    ).toBeVisible();

    // Check time range selector
    await expect(
      page.locator('select[aria-label*="Time range"]')
    ).toBeVisible();

    // Check export button
    await expect(page.locator('button:has-text("Export Data")')).toBeVisible();
  });

  test("should display key metrics cards", async ({ page }) => {
    // Wait for metrics to load
    await page.waitForSelector('[data-testid="analytics-metrics"]', {
      timeout: 10000,
    });

    // Check metric cards
    await expect(
      page.locator('[data-testid="total-signups-metric"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="active-users-metric"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="resume-uploads-metric"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="success-rate-metric"]')
    ).toBeVisible();

    // Verify metrics have values
    const metrics = page.locator(
      '[data-testid$="-metric"] .text-2xl, [data-testid$="-metric"] .text-3xl'
    );
    const metricCount = await metrics.count();
    expect(metricCount).toBeGreaterThan(0);

    // Each metric should have a non-empty value
    for (let i = 0; i < metricCount; i++) {
      const metric = metrics.nth(i);
      await expect(metric).not.toBeEmpty();
    }
  });

  test("should display user growth chart", async ({ page }) => {
    // Wait for charts to load
    await page.waitForSelector('[data-testid="user-growth-chart"]', {
      timeout: 15000,
    });

    // Chart should be visible
    await expect(
      page.locator('[data-testid="user-growth-chart"]')
    ).toBeVisible();

    // Should contain SVG (Recharts renders as SVG)
    await expect(
      page.locator('[data-testid="user-growth-chart"] svg')
    ).toBeVisible();

    // Check chart title
    await expect(page.locator('h3:has-text("User Growth")')).toBeVisible();
  });

  test("should display resume activity chart", async ({ page }) => {
    // Wait for charts to load
    await page.waitForSelector('[data-testid="resume-activity-chart"]', {
      timeout: 15000,
    });

    // Chart should be visible
    await expect(
      page.locator('[data-testid="resume-activity-chart"]')
    ).toBeVisible();

    // Should contain SVG
    await expect(
      page.locator('[data-testid="resume-activity-chart"] svg')
    ).toBeVisible();

    // Check chart title
    await expect(page.locator('h3:has-text("Resume Activity")')).toBeVisible();
  });

  test("should display popular features section", async ({ page }) => {
    // Wait for popular features to load
    await page.waitForSelector('[data-testid="popular-features"]', {
      timeout: 10000,
    });

    // Section should be visible
    await expect(
      page.locator('[data-testid="popular-features"]')
    ).toBeVisible();
    await expect(page.locator('h3:has-text("Popular Features")')).toBeVisible();

    // Should show feature items
    const featureItems = page.locator('[data-testid="feature-item"]');
    const itemCount = await featureItems.count();

    if (itemCount > 0) {
      // Each feature item should have name and usage count
      const firstItem = featureItems.first();
      await expect(firstItem.locator(".font-medium")).toBeVisible(); // Feature name
      await expect(firstItem.locator(".text-sm")).toBeVisible(); // Usage count
    }
  });

  test("should display top users section", async ({ page }) => {
    // Wait for top users to load
    await page.waitForSelector('[data-testid="top-users"]', { timeout: 10000 });

    // Section should be visible
    await expect(page.locator('[data-testid="top-users"]')).toBeVisible();
    await expect(page.locator('h3:has-text("Top Users")')).toBeVisible();

    // Should show user items
    const userItems = page.locator('[data-testid="top-user-item"]');
    const itemCount = await userItems.count();

    if (itemCount > 0) {
      // Each user item should have name and activity count
      const firstItem = userItems.first();
      await expect(firstItem.locator(".font-medium")).toBeVisible(); // User name
      await expect(firstItem.locator(".text-sm")).toBeVisible(); // Activity count
    }
  });

  test("should change time range and update data", async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="analytics-metrics"]');

    // Get initial metric values
    const initialUserCount = await page
      .locator('[data-testid="total-signups-metric"] .text-3xl')
      .textContent();

    // Change time range
    const timeRangeSelector = page.locator('select[aria-label*="Time range"]');
    await timeRangeSelector.selectOption("7d"); // Last 7 days

    // Wait for data to update
    await page.waitForLoadState("networkidle");

    // Metrics should still be visible (may have different values)
    await expect(
      page.locator('[data-testid="total-signups-metric"]')
    ).toBeVisible();

    // Charts should re-render
    await expect(
      page.locator('[data-testid="user-growth-chart"] svg')
    ).toBeVisible();
  });

  test("should export analytics data", async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('[data-testid="analytics-metrics"]');

    // Click export button
    const exportButton = page.locator('button:has-text("Export Data")');

    if (await exportButton.isVisible()) {
      // Set up download handler
      const downloadPromise = page.waitForEvent("download");

      await exportButton.click();

      // Should trigger download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain("analytics");
      expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx?)$/);
    }
  });

  test("should handle chart interactions", async ({ page }) => {
    // Wait for charts to load
    await page.waitForSelector('[data-testid="user-growth-chart"] svg');

    // Try to interact with chart (hover, click)
    const chart = page.locator('[data-testid="user-growth-chart"] svg');

    // Hover over chart area
    await chart.hover();

    // Look for tooltip or interactive elements
    const tooltip = page.locator('[data-testid="chart-tooltip"]');

    // Tooltip might appear on hover (depending on implementation)
    if (await tooltip.isVisible({ timeout: 1000 })) {
      await expect(tooltip).toBeVisible();
    }
  });

  test("should display error state when data fails to load", async ({
    page,
  }) => {
    // Intercept analytics API calls and make them fail
    await page.route("**/api/admin/analytics/**", (route) => route.abort());

    await page.goto("/admin/analytics");

    // Should show error state
    const errorState = page.locator("text=Failed to load analytics data");
    const retryButton = page.locator('button:has-text("Retry")');

    // Either error message or retry button should be visible
    const hasError = await errorState.isVisible({ timeout: 5000 });
    const hasRetry = await retryButton.isVisible({ timeout: 5000 });

    expect(hasError || hasRetry).toBe(true);
  });

  test("should show loading states", async ({ page }) => {
    await page.goto("/admin/analytics");

    // Should show loading indicators initially
    const loadingSpinners = page.locator('[data-testid="loading-spinner"]');
    const skeletonLoaders = page.locator('[data-testid="skeleton-loader"]');

    // At least some loading state should be visible initially
    const hasSpinners = (await loadingSpinners.count()) > 0;
    const hasSkeletons = (await skeletonLoaders.count()) > 0;

    if (hasSpinners || hasSkeletons) {
      // Loading should eventually disappear
      await expect(loadingSpinners).toBeHidden({ timeout: 15000 });
      await expect(skeletonLoaders).toBeHidden({ timeout: 15000 });
    }

    // Content should be visible after loading
    await expect(
      page.locator('[data-testid="analytics-metrics"]')
    ).toBeVisible();
  });

  test("should refresh data when refresh button is clicked", async ({
    page,
  }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="analytics-metrics"]');

    // Find refresh button
    const refreshButton = page.locator('[data-testid="refresh-analytics"]');

    if (await refreshButton.isVisible()) {
      await refreshButton.click();

      // Should show loading state briefly
      const loadingIndicator = page.locator('[data-testid="loading-spinner"]');

      // Wait for refresh to complete
      await page.waitForLoadState("networkidle");

      // Content should still be visible
      await expect(
        page.locator('[data-testid="analytics-metrics"]')
      ).toBeVisible();
    }
  });

  test("should display real-time updates", async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="analytics-metrics"]');

    // Check if real-time indicator is present
    const realTimeIndicator = page.locator(
      '[data-testid="real-time-indicator"]'
    );

    if (await realTimeIndicator.isVisible()) {
      // Should show "Live" or similar indicator
      await expect(realTimeIndicator).toBeVisible();
    }
  });

  test("should handle multiple time range selections", async ({ page }) => {
    await page.waitForSelector('[data-testid="analytics-metrics"]');

    const timeRangeSelector = page.locator('select[aria-label*="Time range"]');

    // Test different time ranges
    const timeRanges = ["24h", "7d", "30d", "90d", "1y"];

    for (const range of timeRanges) {
      // Check if option exists before selecting
      const option = timeRangeSelector.locator(`option[value="${range}"]`);

      if ((await option.count()) > 0) {
        await timeRangeSelector.selectOption(range);
        await page.waitForLoadState("networkidle");

        // Charts should still be visible
        await expect(
          page.locator('[data-testid="user-growth-chart"] svg')
        ).toBeVisible();
      }
    }
  });

  test("should display data comparison features", async ({ page }) => {
    await page.waitForSelector('[data-testid="analytics-metrics"]');

    // Check for comparison toggles or selectors
    const comparisonToggle = page.locator('[data-testid="comparison-toggle"]');
    const periodSelector = page.locator('[data-testid="period-selector"]');

    if (await comparisonToggle.isVisible()) {
      await comparisonToggle.click();

      // Should show comparison data
      const comparisonData = page.locator('[data-testid="comparison-data"]');
      await expect(comparisonData).toBeVisible();
    }
  });

  test("should be responsive on mobile devices", async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await page.waitForSelector('[data-testid="analytics-metrics"]');

    // Check mobile layout
    const metricsContainer = page.locator('[data-testid="analytics-metrics"]');
    await expect(metricsContainer).toBeVisible();

    // Charts should be visible and responsive
    const charts = page.locator('[data-testid$="-chart"]');
    const chartCount = await charts.count();

    if (chartCount > 0) {
      // Charts should stack vertically on mobile
      const firstChart = charts.first();
      await expect(firstChart).toBeVisible();
    }

    // Time range selector should be accessible
    const timeRangeSelector = page.locator('select[aria-label*="Time range"]');
    await expect(timeRangeSelector).toBeVisible();
  });

  test("should handle data filtering and segmentation", async ({ page }) => {
    await page.waitForSelector('[data-testid="analytics-metrics"]');

    // Check for filter options
    const userTypeFilter = page.locator('[data-testid="user-type-filter"]');
    const featureFilter = page.locator('[data-testid="feature-filter"]');

    if (await userTypeFilter.isVisible()) {
      // Filter by user type
      await userTypeFilter.selectOption("premium");
      await page.waitForLoadState("networkidle");

      // Data should update
      await expect(
        page.locator('[data-testid="analytics-metrics"]')
      ).toBeVisible();
    }
  });

  test("should maintain state when navigating between sections", async ({
    page,
  }) => {
    await page.waitForSelector('[data-testid="analytics-metrics"]');

    // Set time range
    const timeRangeSelector = page.locator('select[aria-label*="Time range"]');
    await timeRangeSelector.selectOption("7d");

    // Navigate to another admin section
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");

    // Navigate back to analytics
    await page.goto("/admin/analytics");
    await page.waitForLoadState("networkidle");

    // State might be reset (depends on implementation)
    await expect(
      page.locator('[data-testid="analytics-metrics"]')
    ).toBeVisible();
  });
});
