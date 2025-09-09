#!/usr/bin/env node

const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Configuration
const BASE_URL = process.env.BACKEND_URL || "http://localhost:3002";
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS) || 10;
const TEST_DURATION = parseInt(process.env.TEST_DURATION) || 300; // 5 minutes in seconds
const REPORTS_DIR = path.join(__dirname, "reports", "results");

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Test results storage
const results = {
  startTime: new Date(),
  endTime: null,
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: [],
  endpoints: {},
};

// Test data
const testUsers = [
  { email: "user1@example.com", password: "testpass123" },
  { email: "user2@example.com", password: "testpass123" },
  { email: "admin@example.com", password: "admin123" },
];

// Color codes for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTP client with timeout
const client = axios.create({
  timeout: 10000,
  validateStatus: () => true, // Accept all status codes
});

// Track endpoint performance
function trackEndpoint(endpoint, responseTime, success) {
  if (!results.endpoints[endpoint]) {
    results.endpoints[endpoint] = {
      requests: 0,
      successes: 0,
      failures: 0,
      responseTimes: [],
    };
  }

  results.endpoints[endpoint].requests++;
  results.endpoints[endpoint].responseTimes.push(responseTime);

  if (success) {
    results.endpoints[endpoint].successes++;
  } else {
    results.endpoints[endpoint].failures++;
  }
}

// Test authentication
async function testAuth(user) {
  const startTime = Date.now();

  try {
    const response = await client.post(`${BASE_URL}/api/auth/login`, {
      email: user.email,
      password: user.password,
    });

    const responseTime = Date.now() - startTime;
    const success = response.status === 200;

    results.totalRequests++;
    results.responseTimes.push(responseTime);
    trackEndpoint("/api/auth/login", responseTime, success);

    if (success) {
      results.successfulRequests++;
      return response.data.access_token;
    } else {
      results.failedRequests++;
      results.errors.push(
        `Login failed: ${response.status} - ${response.statusText}`
      );
      return null;
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    results.totalRequests++;
    results.failedRequests++;
    results.responseTimes.push(responseTime);
    results.errors.push(`Login error: ${error.message}`);
    trackEndpoint("/api/auth/login", responseTime, false);
    return null;
  }
}

// Test protected endpoints
async function testProtectedEndpoints(token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const endpoints = [
    "/api/auth/profile",
    "/api/resume/list",
    "/api/job-tracker",
    "/api/health",
  ];

  for (const endpoint of endpoints) {
    const startTime = Date.now();

    try {
      const response = await client.get(`${BASE_URL}${endpoint}`, { headers });
      const responseTime = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 400;

      results.totalRequests++;
      results.responseTimes.push(responseTime);
      trackEndpoint(endpoint, responseTime, success);

      if (success) {
        results.successfulRequests++;
      } else {
        results.failedRequests++;
        results.errors.push(`${endpoint} failed: ${response.status}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      results.totalRequests++;
      results.failedRequests++;
      results.responseTimes.push(responseTime);
      results.errors.push(`${endpoint} error: ${error.message}`);
      trackEndpoint(endpoint, responseTime, false);
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// Test health endpoint
async function testHealth() {
  const startTime = Date.now();

  try {
    const response = await client.get(`${BASE_URL}/api/health`);
    const responseTime = Date.now() - startTime;
    const success = response.status === 200;

    results.totalRequests++;
    results.responseTimes.push(responseTime);
    trackEndpoint("/api/health", responseTime, success);

    if (success) {
      results.successfulRequests++;
      return true;
    } else {
      results.failedRequests++;
      results.errors.push(`Health check failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    results.totalRequests++;
    results.failedRequests++;
    results.responseTimes.push(responseTime);
    results.errors.push(`Health check error: ${error.message}`);
    trackEndpoint("/api/health", responseTime, false);
    return false;
  }
}

// User simulation function
async function simulateUser(userId) {
  log(`User ${userId} starting...`, "blue");

  const endTime = Date.now() + TEST_DURATION * 1000;
  let requestCount = 0;

  while (Date.now() < endTime) {
    // Select random user
    const user = testUsers[Math.floor(Math.random() * testUsers.length)];

    // Test authentication
    const token = await testAuth(user);
    requestCount++;

    if (token) {
      // Test protected endpoints
      await testProtectedEndpoints(token);
      requestCount += 4; // 4 protected endpoints tested
    }

    // Test health endpoint
    await testHealth();
    requestCount++;

    // Random delay between iterations (1-3 seconds)
    const delay = Math.random() * 2000 + 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  log(`User ${userId} completed ${requestCount} requests`, "green");
}

// Calculate statistics
function calculateStats() {
  if (results.responseTimes.length === 0) return {};

  const sorted = results.responseTimes.sort((a, b) => a - b);
  const len = sorted.length;

  return {
    average: Math.round(sorted.reduce((a, b) => a + b, 0) / len),
    min: sorted[0],
    max: sorted[len - 1],
    p50: sorted[Math.floor(len * 0.5)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)],
  };
}

// Generate HTML report
function generateReport() {
  const stats = calculateStats();
  const successRate = (
    (results.successfulRequests / results.totalRequests) *
    100
  ).toFixed(2);
  const duration = (results.endTime - results.startTime) / 1000;
  const rps = (results.totalRequests / duration).toFixed(2);

  const reportPath = path.join(REPORTS_DIR, `load-test-${Date.now()}.html`);

  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>QoderResume Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #007acc; color: white; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; border-radius: 5px; background: #f8f9fa; }
        .success { background-color: #d4edda; }
        .warning { background-color: #fff3cd; }
        .error { background-color: #f8d7da; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
        th { background: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>QoderResume Load Test Report</h1>
        <p>Generated: ${new Date().toISOString()}</p>
        <p>Test Duration: ${duration.toFixed(2)} seconds</p>
        <p>Concurrent Users: ${CONCURRENT_USERS}</p>
    </div>
    
    <div class="section">
        <h2>Test Summary</h2>
        <div class="metric ${successRate > 95 ? "success" : successRate > 85 ? "warning" : "error"}">
            <strong>Success Rate:</strong> ${successRate}%
        </div>
        <div class="metric">
            <strong>Total Requests:</strong> ${results.totalRequests}
        </div>
        <div class="metric">
            <strong>Requests/Second:</strong> ${rps}
        </div>
        <div class="metric">
            <strong>Failed Requests:</strong> ${results.failedRequests}
        </div>
    </div>
    
    <div class="section">
        <h2>Response Time Statistics</h2>
        <table>
            <tr>
                <th>Metric</th>
                <th>Value (ms)</th>
            </tr>
            <tr><td>Average</td><td>${stats.average || "N/A"}</td></tr>
            <tr><td>Minimum</td><td>${stats.min || "N/A"}</td></tr>
            <tr><td>Maximum</td><td>${stats.max || "N/A"}</td></tr>
            <tr><td>50th Percentile</td><td>${stats.p50 || "N/A"}</td></tr>
            <tr><td>95th Percentile</td><td>${stats.p95 || "N/A"}</td></tr>
            <tr><td>99th Percentile</td><td>${stats.p99 || "N/A"}</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h2>Endpoint Performance</h2>
        <table>
            <tr>
                <th>Endpoint</th>
                <th>Requests</th>
                <th>Success Rate</th>
                <th>Avg Response Time</th>
            </tr>
            ${Object.entries(results.endpoints)
              .map(([endpoint, data]) => {
                const endpointSuccessRate = (
                  (data.successes / data.requests) *
                  100
                ).toFixed(2);
                const avgResponseTime = Math.round(
                  data.responseTimes.reduce((a, b) => a + b, 0) /
                    data.responseTimes.length
                );
                return `<tr>
                    <td>${endpoint}</td>
                    <td>${data.requests}</td>
                    <td>${endpointSuccessRate}%</td>
                    <td>${avgResponseTime}ms</td>
                </tr>`;
              })
              .join("")}
        </table>
    </div>
    
    ${
      results.errors.length > 0
        ? `
    <div class="section error">
        <h2>Errors</h2>
        <ul>
            ${results.errors
              .slice(0, 10)
              .map((error) => `<li>${error}</li>`)
              .join("")}
            ${results.errors.length > 10 ? `<li>... and ${results.errors.length - 10} more errors</li>` : ""}
        </ul>
    </div>
    `
        : ""
    }
</body>
</html>`;

  fs.writeFileSync(reportPath, html);
  log(`Report generated: ${reportPath}`, "green");

  // Also save JSON results
  const jsonPath = path.join(REPORTS_DIR, `load-test-${Date.now()}.json`);
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        ...results,
        stats,
        successRate: parseFloat(successRate),
        requestsPerSecond: parseFloat(rps),
        duration,
      },
      null,
      2
    )
  );

  return reportPath;
}

// Main execution
async function main() {
  log("Starting QoderResume Load Test", "blue");
  log(`Target: ${BASE_URL}`, "blue");
  log(`Concurrent Users: ${CONCURRENT_USERS}`, "blue");
  log(`Duration: ${TEST_DURATION} seconds`, "blue");

  // First check if the application is available
  log("Checking application health...", "yellow");
  const isHealthy = await testHealth();

  if (!isHealthy) {
    log(
      "Application health check failed. Please ensure the backend is running.",
      "red"
    );
    process.exit(1);
  }

  log("Application is healthy. Starting load test...", "green");

  // Start concurrent users
  const userPromises = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    userPromises.push(simulateUser(i + 1));
  }

  // Wait for all users to complete
  await Promise.all(userPromises);

  results.endTime = new Date();

  log("Load test completed!", "green");
  log(`Total Requests: ${results.totalRequests}`, "blue");
  log(`Successful: ${results.successfulRequests}`, "green");
  log(`Failed: ${results.failedRequests}`, "red");

  const reportPath = generateReport();
  log(`Detailed report available at: ${reportPath}`, "blue");
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  log("\nReceived SIGINT. Generating partial results...", "yellow");
  results.endTime = new Date();
  generateReport();
  process.exit(0);
});

// Run the load test
if (require.main === module) {
  main().catch((error) => {
    log(`Load test failed: ${error.message}`, "red");
    console.error(error);
    process.exit(1);
  });
}

module.exports = { main, testAuth, testHealth };
