import { chromium, FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  // Launch browser for global setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the application to be ready
    console.log("🔄 Waiting for application to start...");
    await page.goto(baseURL || "http://localhost:3000");
    await page.waitForLoadState("networkidle");

    console.log("✅ Application is ready for testing");

    // Create admin user if it doesn't exist
    // This would typically be done via API call or database seeding
    console.log("🔄 Setting up test data...");

    // You can add database seeding or API calls here
    // For now, we'll assume the admin user exists

    console.log("✅ Test data setup complete");
  } catch (error) {
    console.error("❌ Global setup failed:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
