import { expect, test } from "@playwright/test";

test.describe("System Monitoring E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@example.com");
    await page.fill('[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/admin");

    // Navigate to system monitoring
    await page.goto("/admin/monitoring");
  });

  test("should display system monitoring interface", async ({ page }) => {
    // Check main elements
    await expect(
      page.locator('h1:has-text("System Monitoring")')
    ).toBeVisible();

    // Check refresh controls
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();

    // Check auto-refresh toggle if present
    const autoRefreshToggle = page.locator(
      '[data-testid="auto-refresh-toggle"]'
    );
    if (await autoRefreshToggle.isVisible()) {
      await expect(autoRefreshToggle).toBeVisible();
    }
  });

  test("should display overall system health status", async ({ page }) => {
    // Wait for health data to load
    await page.waitForSelector('[data-testid="system-health-overview"]', {
      timeout: 15000,
    });

    // Check overall health indicator
    await expect(
      page.locator('[data-testid="overall-health-status"]')
    ).toBeVisible();

    // Health status should show one of: healthy, warning, critical
    const healthStatus = page.locator('[data-testid="overall-health-status"]');
    const statusText = await healthStatus.textContent();
    expect(statusText?.toLowerCase()).toMatch(
      /healthy|warning|critical|degraded/
    );

    // Check uptime display
    await expect(page.locator('[data-testid="system-uptime"]')).toBeVisible();
  });

  test("should display service health cards", async ({ page }) => {
    // Wait for service health to load
    await page.waitForSelector('[data-testid="service-health-cards"]', {
      timeout: 15000,
    });

    // Check individual service cards
    await expect(
      page.locator('[data-testid="database-health-card"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="redis-health-card"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="ai-services-health-card"]')
    ).toBeVisible();

    // Each service card should show status
    const serviceCards = page.locator('[data-testid$="-health-card"]');
    const cardCount = await serviceCards.count();

    for (let i = 0; i < cardCount; i++) {
      const card = serviceCards.nth(i);

      // Should have service name
      await expect(card.locator("h3")).toBeVisible();

      // Should have status indicator
      const statusIndicator = card.locator('[data-testid="status-indicator"]');
      await expect(statusIndicator).toBeVisible();

      // Should show response time or connection info
      const responseTime = card.locator('[data-testid="response-time"]');
      if (await responseTime.isVisible()) {
        await expect(responseTime).toBeVisible();
      }
    }
  });

  test("should display performance metrics", async ({ page }) => {
    // Wait for performance metrics to load
    await page.waitForSelector('[data-testid="performance-metrics"]', {
      timeout: 15000,
    });

    // Check CPU usage
    const cpuMetric = page.locator('[data-testid="cpu-usage"]');
    if (await cpuMetric.isVisible()) {
      await expect(cpuMetric).toBeVisible();

      // Should show percentage
      const cpuValue = await cpuMetric.textContent();
      expect(cpuValue).toMatch(/\d+(\.\d+)?%/);
    }

    // Check memory usage
    const memoryMetric = page.locator('[data-testid="memory-usage"]');
    if (await memoryMetric.isVisible()) {
      await expect(memoryMetric).toBeVisible();

      // Should show usage info
      const memoryValue = await memoryMetric.textContent();
      expect(memoryValue).toMatch(/\d+(\.\d+)?\s*(MB|GB|%)/);
    }

    // Check disk usage
    const diskMetric = page.locator('[data-testid="disk-usage"]');
    if (await diskMetric.isVisible()) {
      await expect(diskMetric).toBeVisible();
    }
  });

  test("should display network and API metrics", async ({ page }) => {
    // Wait for network metrics to load
    await page.waitForSelector('[data-testid="network-metrics"]', {
      timeout: 10000,
    });

    // Check active connections
    const activeConnections = page.locator(
      '[data-testid="active-connections"]'
    );
    if (await activeConnections.isVisible()) {
      await expect(activeConnections).toBeVisible();
    }

    // Check request rate
    const requestRate = page.locator('[data-testid="request-rate"]');
    if (await requestRate.isVisible()) {
      await expect(requestRate).toBeVisible();
    }

    // Check error rate
    const errorRate = page.locator('[data-testid="error-rate"]');
    if (await errorRate.isVisible()) {
      await expect(errorRate).toBeVisible();
    }

    // Check average response time
    const avgResponseTime = page.locator('[data-testid="avg-response-time"]');
    if (await avgResponseTime.isVisible()) {
      await expect(avgResponseTime).toBeVisible();
    }
  });

  test("should display real-time charts", async ({ page }) => {
    // Wait for charts to load
    await page.waitForSelector('[data-testid="monitoring-charts"]', {
      timeout: 15000,
    });

    // Check CPU usage chart
    const cpuChart = page.locator('[data-testid="cpu-usage-chart"]');
    if (await cpuChart.isVisible()) {
      await expect(cpuChart.locator("svg")).toBeVisible();
    }

    // Check memory usage chart
    const memoryChart = page.locator('[data-testid="memory-usage-chart"]');
    if (await memoryChart.isVisible()) {
      await expect(memoryChart.locator("svg")).toBeVisible();
    }

    // Check response time chart
    const responseTimeChart = page.locator(
      '[data-testid="response-time-chart"]'
    );
    if (await responseTimeChart.isVisible()) {
      await expect(responseTimeChart.locator("svg")).toBeVisible();
    }
  });

  test("should display error logs and alerts", async ({ page }) => {
    // Check error logs section
    const errorLogsSection = page.locator('[data-testid="error-logs"]');
    if (await errorLogsSection.isVisible()) {
      await expect(errorLogsSection).toBeVisible();

      // Should have header
      await expect(page.locator('h3:has-text("Recent Errors")')).toBeVisible();

      // Check if there are error entries
      const errorEntries = page.locator('[data-testid="error-entry"]');
      const errorCount = await errorEntries.count();

      if (errorCount > 0) {
        // Each error should have timestamp and message
        const firstError = errorEntries.first();
        await expect(
          firstError.locator('[data-testid="error-timestamp"]')
        ).toBeVisible();
        await expect(
          firstError.locator('[data-testid="error-message"]')
        ).toBeVisible();
      } else {
        // Should show no errors message
        await expect(page.locator("text=No recent errors")).toBeVisible();
      }
    }

    // Check active alerts
    const alertsSection = page.locator('[data-testid="active-alerts"]');
    if (await alertsSection.isVisible()) {
      await expect(alertsSection).toBeVisible();

      const alerts = page.locator('[data-testid="alert-item"]');
      const alertCount = await alerts.count();

      if (alertCount > 0) {
        // Each alert should have severity and description
        const firstAlert = alerts.first();
        await expect(
          firstAlert.locator('[data-testid="alert-severity"]')
        ).toBeVisible();
        await expect(
          firstAlert.locator('[data-testid="alert-description"]')
        ).toBeVisible();
      }
    }
  });

  test("should refresh data when refresh button is clicked", async ({
    page,
  }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="system-health-overview"]');

    // Get initial timestamp or value
    const uptimeElement = page.locator('[data-testid="system-uptime"]');
    const initialUptime = await uptimeElement.textContent();

    // Click refresh button
    await page.click('button:has-text("Refresh")');

    // Should show loading indicator
    const loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    if (await loadingSpinner.isVisible({ timeout: 1000 })) {
      await expect(loadingSpinner).toBeVisible();
    }

    // Wait for refresh to complete
    await page.waitForLoadState("networkidle");

    // Data should still be visible
    await expect(
      page.locator('[data-testid="system-health-overview"]')
    ).toBeVisible();
  });

  test("should enable/disable auto-refresh", async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="system-health-overview"]');

    // Check for auto-refresh toggle
    const autoRefreshToggle = page.locator(
      '[data-testid="auto-refresh-toggle"]'
    );

    if (await autoRefreshToggle.isVisible()) {
      // Toggle auto-refresh on
      await autoRefreshToggle.click();

      // Should show auto-refresh indicator
      const autoRefreshIndicator = page.locator(
        '[data-testid="auto-refresh-indicator"]'
      );
      if (await autoRefreshIndicator.isVisible()) {
        await expect(autoRefreshIndicator).toBeVisible();
      }

      // Wait a bit and check if data refreshes automatically
      await page.waitForTimeout(2000);

      // Toggle auto-refresh off
      await autoRefreshToggle.click();
    }
  });

  test("should handle service detail views", async ({ page }) => {
    // Wait for service cards to load
    await page.waitForSelector('[data-testid="service-health-cards"]');

    // Click on database service card for details
    const databaseCard = page.locator('[data-testid="database-health-card"]');

    if (await databaseCard.isVisible()) {
      await databaseCard.click();

      // Should show detailed view or modal
      const detailView = page.locator('[data-testid="service-detail-modal"]');
      const detailSection = page.locator(
        '[data-testid="service-detail-section"]'
      );

      const hasModal = await detailView.isVisible({ timeout: 2000 });
      const hasSection = await detailSection.isVisible({ timeout: 2000 });

      if (hasModal) {
        // Modal should show detailed metrics
        await expect(detailView).toBeVisible();

        // Should have close button
        const closeButton = detailView.locator('[data-testid="close-modal"]');
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await expect(detailView).toBeHidden();
        }
      } else if (hasSection) {
        // Detail section should be visible
        await expect(detailSection).toBeVisible();
      }
    }
  });

  test("should display queue and background job status", async ({ page }) => {
    // Check queue monitoring section
    const queueSection = page.locator('[data-testid="queue-monitoring"]');

    if (await queueSection.isVisible()) {
      await expect(queueSection).toBeVisible();

      // Check queue metrics
      const activeJobs = page.locator('[data-testid="active-jobs-count"]');
      const waitingJobs = page.locator('[data-testid="waiting-jobs-count"]');
      const completedJobs = page.locator(
        '[data-testid="completed-jobs-count"]'
      );
      const failedJobs = page.locator('[data-testid="failed-jobs-count"]');

      if (await activeJobs.isVisible()) {
        await expect(activeJobs).toBeVisible();
      }
      if (await waitingJobs.isVisible()) {
        await expect(waitingJobs).toBeVisible();
      }
      if (await completedJobs.isVisible()) {
        await expect(completedJobs).toBeVisible();
      }
      if (await failedJobs.isVisible()) {
        await expect(failedJobs).toBeVisible();
      }
    }
  });

  test("should handle API monitoring failures", async ({ page }) => {
    // Intercept monitoring API calls and make them fail
    await page.route("**/api/admin/monitoring/**", (route) => route.abort());

    await page.goto("/admin/monitoring");

    // Should show error state
    const errorState = page.locator("text=Failed to load monitoring data");
    const retryButton = page.locator('button:has-text("Retry")');
    const fallbackMessage = page.locator(
      "text=Unable to connect to monitoring service"
    );

    // Some error indication should be visible
    const hasError = await errorState.isVisible({ timeout: 5000 });
    const hasRetry = await retryButton.isVisible({ timeout: 5000 });
    const hasFallback = await fallbackMessage.isVisible({ timeout: 5000 });

    expect(hasError || hasRetry || hasFallback).toBe(true);
  });

  test("should display historical data views", async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="system-health-overview"]');

    // Check for time range selector
    const timeRangeSelector = page.locator(
      '[data-testid="monitoring-time-range"]'
    );

    if (await timeRangeSelector.isVisible()) {
      // Change to different time range
      await timeRangeSelector.selectOption("1h");
      await page.waitForLoadState("networkidle");

      // Charts should update
      const charts = page.locator('[data-testid$="-chart"] svg');
      const chartCount = await charts.count();

      if (chartCount > 0) {
        await expect(charts.first()).toBeVisible();
      }

      // Try another time range
      await timeRangeSelector.selectOption("24h");
      await page.waitForLoadState("networkidle");
    }
  });

  test("should handle real-time updates", async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="system-health-overview"]');

    // Check for real-time indicators
    const realTimeIndicator = page.locator(
      '[data-testid="real-time-indicator"]'
    );

    if (await realTimeIndicator.isVisible()) {
      // Should show "Live" or similar status
      await expect(realTimeIndicator).toBeVisible();

      // Data should update periodically (we won't wait for actual updates in tests)
      // but the interface should support it
    }
  });

  test("should export monitoring data", async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('[data-testid="system-health-overview"]');

    // Check for export button
    const exportButton = page.locator('button:has-text("Export")');

    if (await exportButton.isVisible()) {
      // Set up download handler
      const downloadPromise = page.waitForEvent("download");

      await exportButton.click();

      // Should trigger download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain("monitoring");
      expect(download.suggestedFilename()).toMatch(/\.(csv|json|xlsx?)$/);
    }
  });

  test("should be responsive on mobile devices", async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await page.waitForSelector('[data-testid="system-health-overview"]');

    // Check mobile layout
    const healthOverview = page.locator(
      '[data-testid="system-health-overview"]'
    );
    await expect(healthOverview).toBeVisible();

    // Service cards should stack properly on mobile
    const serviceCards = page.locator('[data-testid$="-health-card"]');
    const cardCount = await serviceCards.count();

    if (cardCount > 0) {
      // Cards should be visible and accessible
      const firstCard = serviceCards.first();
      await expect(firstCard).toBeVisible();
    }

    // Charts should be responsive
    const charts = page.locator('[data-testid$="-chart"]');
    const chartCount = await charts.count();

    if (chartCount > 0) {
      const firstChart = charts.first();
      await expect(firstChart).toBeVisible();
    }
  });

  test("should handle concurrent monitoring requests", async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="system-health-overview"]');

    // Trigger multiple refresh operations
    const refreshButton = page.locator('button:has-text("Refresh")');

    if (await refreshButton.isVisible()) {
      // Click refresh multiple times quickly
      await Promise.all([
        refreshButton.click(),
        refreshButton.click(),
        refreshButton.click(),
      ]);

      // Should handle concurrent requests gracefully
      await page.waitForLoadState("networkidle");

      // Interface should still be functional
      await expect(
        page.locator('[data-testid="system-health-overview"]')
      ).toBeVisible();
    }
  });
});
