import { check, sleep } from "k6";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";

// Custom metrics
const loginSuccessRate = new Rate("login_success_rate");
const loginDuration = new Trend("login_duration");
const loginAttempts = new Counter("login_attempts");

// Test configuration
export const options = {
  stages: [
    { duration: "2m", target: 10 }, // Ramp up to 10 users
    { duration: "5m", target: 50 }, // Stay at 50 users
    { duration: "2m", target: 100 }, // Ramp up to 100 users
    { duration: "5m", target: 100 }, // Stay at 100 users
    { duration: "2m", target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    login_success_rate: ["rate>0.99"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BACKEND_URL || "http://localhost:3001";

// Test data
const testUsers = [
  { email: "user1@example.com", password: "testpass123" },
  { email: "user2@example.com", password: "testpass123" },
  { email: "user3@example.com", password: "testpass123" },
  { email: "admin@example.com", password: "admin123" },
];

export default function () {
  // Select random user
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];

  // Test authentication endpoint
  testLogin(user);

  sleep(1);

  // Test other API endpoints if login successful
  const token = getAuthToken(user);
  if (token) {
    testProtectedEndpoints(token);
  }

  sleep(Math.random() * 2 + 1); // Random sleep 1-3 seconds
}

function testLogin(user) {
  loginAttempts.add(1);

  const loginPayload = {
    email: user.email,
    password: user.password,
  };

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const response = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify(loginPayload),
    params
  );

  const success = check(response, {
    "login status is 200": (r) => r.status === 200,
    "login response has token": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.access_token !== undefined;
      } catch (e) {
        return false;
      }
    },
    "login response time < 500ms": (r) => r.timings.duration < 500,
  });

  loginSuccessRate.add(success);
  loginDuration.add(response.timings.duration);
}

function getAuthToken(user) {
  const loginPayload = {
    email: user.email,
    password: user.password,
  };

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const response = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify(loginPayload),
    params
  );

  if (response.status === 200) {
    try {
      const body = JSON.parse(response.body);
      return body.access_token;
    } catch (e) {
      return null;
    }
  }

  return null;
}

function testProtectedEndpoints(token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Test user profile endpoint
  const profileResponse = http.get(`${BASE_URL}/api/users/profile`, {
    headers,
  });
  check(profileResponse, {
    "profile status is 200": (r) => r.status === 200,
    "profile response time < 300ms": (r) => r.timings.duration < 300,
  });

  // Test resumes endpoint
  const resumesResponse = http.get(`${BASE_URL}/api/resumes`, { headers });
  check(resumesResponse, {
    "resumes status is 200": (r) => r.status === 200,
    "resumes response time < 500ms": (r) => r.timings.duration < 500,
    "resumes response is array": (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) || Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    },
  });

  // Test job applications endpoint
  const jobAppsResponse = http.get(`${BASE_URL}/api/job-applications`, {
    headers,
  });
  check(jobAppsResponse, {
    "job applications status is 200": (r) => r.status === 200,
    "job applications response time < 500ms": (r) => r.timings.duration < 500,
  });
}

export function handleSummary(data) {
  return {
    "load-testing/reports/results/api-endpoints-load-test.html":
      htmlReport(data),
    "load-testing/reports/results/api-endpoints-load-test.json": JSON.stringify(
      data,
      null,
      2
    ),
  };
}

function htmlReport(data) {
  const template = `
<!DOCTYPE html>
<html>
<head>
    <title>API Endpoints Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .metric { background: #f5f5f5; padding: 10px; margin: 10px 0; border-left: 4px solid #007acc; }
        .passed { border-left-color: #28a745; }
        .failed { border-left-color: #dc3545; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>API Endpoints Load Test Report</h1>
    <h2>Test Summary</h2>
    <div class="metric">
        <strong>Total Requests:</strong> ${data.metrics.http_reqs?.count || 0}
    </div>
    <div class="metric">
        <strong>Failed Requests:</strong> ${data.metrics.http_req_failed?.count || 0}
    </div>
    <div class="metric ${(data.metrics.http_req_duration?.values?.["p(95)"] || 0) < 500 ? "passed" : "failed"}">
        <strong>95th Percentile Response Time:</strong> ${(data.metrics.http_req_duration?.values?.["p(95)"] || 0).toFixed(2)}ms
    </div>
    <div class="metric">
        <strong>Login Success Rate:</strong> ${((data.metrics.login_success_rate?.values?.rate || 0) * 100).toFixed(2)}%
    </div>
    
    <h2>Performance Metrics</h2>
    <table>
        <tr>
            <th>Metric</th>
            <th>Average</th>
            <th>95th Percentile</th>
            <th>99th Percentile</th>
        </tr>
        <tr>
            <td>HTTP Request Duration</td>
            <td>${(data.metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms</td>
            <td>${(data.metrics.http_req_duration?.values?.["p(95)"] || 0).toFixed(2)}ms</td>
            <td>${(data.metrics.http_req_duration?.values?.["p(99)"] || 0).toFixed(2)}ms</td>
        </tr>
        <tr>
            <td>Login Duration</td>
            <td>${(data.metrics.login_duration?.values?.avg || 0).toFixed(2)}ms</td>
            <td>${(data.metrics.login_duration?.values?.["p(95)"] || 0).toFixed(2)}ms</td>
            <td>${(data.metrics.login_duration?.values?.["p(99)"] || 0).toFixed(2)}ms</td>
        </tr>
    </table>
    
    <h2>Test Status</h2>
    <p>Generated on: ${new Date().toISOString()}</p>
</body>
</html>
  `;

  return template;
}
