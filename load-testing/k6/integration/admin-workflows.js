import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for admin workflows
const adminWorkflowSuccessRate = new Rate('admin_workflow_success_rate');
const adminOperationDuration = new Trend('admin_operation_duration');
const userManagementSuccessRate = new Rate('user_management_success_rate');
const analyticsLoadSuccessRate = new Rate('analytics_load_success_rate');
const systemMonitoringSuccessRate = new Rate('system_monitoring_success_rate');

export const options = {
  stages: [
    { duration: '2m', target: 5 },    // Start with few admin users
    { duration: '5m', target: 15 },   // Moderate admin load
    { duration: '5m', target: 25 },   // High admin concurrent operations
    { duration: '3m', target: 10 },   // Ramp down
    { duration: '1m', target: 0 },    // Complete shutdown
  ],
  thresholds: {
    admin_workflow_success_rate: ['rate>0.98'],
    admin_operation_duration: ['p(95)<3000'], // Admin ops should be under 3s
    user_management_success_rate: ['rate>0.99'],
    analytics_load_success_rate: ['rate>0.95'],
    system_monitoring_success_rate: ['rate>0.99'],
  },
};

const BASE_URL = __ENV.BACKEND_URL || 'http://localhost:3001';

export default function () {
  const adminToken = authenticateAdmin();
  if (!adminToken) {
    console.error('Failed to authenticate admin user');
    return;
  }
  
  let workflowSuccess = true;
  
  // Complete Admin Workflow Test
  group('Dashboard and Analytics', () => {
    const success = testAdminDashboard(adminToken);
    if (!success) workflowSuccess = false;
  });
  
  group('User Management Operations', () => {
    const success = testUserManagement(adminToken);
    if (!success) workflowSuccess = false;
  });
  
  group('System Monitoring', () => {
    const success = testSystemMonitoring(adminToken);
    if (!success) workflowSuccess = false;
  });
  
  group('Settings Management', () => {
    const success = testSettingsManagement(adminToken);
    if (!success) workflowSuccess = false;
  });
  
  adminWorkflowSuccessRate.add(workflowSuccess);
  
  sleep(2);
}

function authenticateAdmin() {
  const loginPayload = {
    email: __ENV.TEST_ADMIN_EMAIL || 'admin@example.com',
    password: __ENV.TEST_ADMIN_PASSWORD || 'admin123',
  };
  
  const response = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(loginPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const success = check(response, {
    'admin login successful': (r) => r.status === 200,
    'admin token received': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.access_token !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  if (success) {
    try {
      const body = JSON.parse(response.body);
      return body.access_token;
    } catch (e) {
      return null;
    }
  }
  
  return null;
}

function testAdminDashboard(token) {
  const headers = { 'Authorization': `Bearer ${token}` };
  const startTime = Date.now();
  
  // Load dashboard metrics
  const metricsResponse = http.get(`${BASE_URL}/api/admin/analytics/metrics`, { headers });
  
  const metricsSuccess = check(metricsResponse, {
    'admin metrics loaded': (r) => r.status === 200,
    'metrics response time < 2s': (r) => r.timings.duration < 2000,
    'metrics has required data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.totalUsers !== undefined && body.totalResumes !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  // Load user activity data
  const activityResponse = http.get(`${BASE_URL}/api/admin/analytics/user-activity?days=30`, { headers });
  
  const activitySuccess = check(activityResponse, {
    'user activity data loaded': (r) => r.status === 200,
    'activity response time < 3s': (r) => r.timings.duration < 3000,
  });
  
  // Load popular features
  const featuresResponse = http.get(`${BASE_URL}/api/admin/analytics/popular-features`, { headers });
  
  const featuresSuccess = check(featuresResponse, {
    'popular features loaded': (r) => r.status === 200,
    'features response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  const totalTime = Date.now() - startTime;
  adminOperationDuration.add(totalTime);
  
  const overallSuccess = metricsSuccess && activitySuccess && featuresSuccess;
  analyticsLoadSuccessRate.add(overallSuccess);
  
  return overallSuccess;
}

function testUserManagement(token) {
  const headers = { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // Load users list with pagination and filters
  const usersListResponse = http.get(`${BASE_URL}/api/admin/users?page=1&limit=50&sortBy=createdAt&sortOrder=DESC`, { headers });
  
  const listSuccess = check(usersListResponse, {
    'users list loaded': (r) => r.status === 200,
    'users list response time < 2s': (r) => r.timings.duration < 2000,
    'users list has pagination': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.pagination !== undefined || body.total !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  // Search users
  const searchResponse = http.get(`${BASE_URL}/api/admin/users?search=test&page=1&limit=20`, { headers });
  
  const searchSuccess = check(searchResponse, {
    'user search works': (r) => r.status === 200,
    'search response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  // Create test user
  const newUserPayload = {
    firstName: `LoadTest${Math.floor(Math.random() * 10000)}`,
    lastName: 'User',
    email: `loadtest${Math.floor(Math.random() * 10000)}@example.com`,
    role: 'user',
    sendWelcomeEmail: false
  };
  
  const createResponse = http.post(`${BASE_URL}/api/admin/users`, JSON.stringify(newUserPayload), { headers });
  
  const createSuccess = check(createResponse, {
    'user creation successful': (r) => r.status === 200 || r.status === 201,
    'created user has ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  // Get user stats
  const statsResponse = http.get(`${BASE_URL}/api/admin/users/stats`, { headers });
  
  const statsSuccess = check(statsResponse, {
    'user stats loaded': (r) => r.status === 200,
    'stats response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  const overallSuccess = listSuccess && searchSuccess && createSuccess && statsSuccess;
  userManagementSuccessRate.add(overallSuccess);
  
  return overallSuccess;
}

function testSystemMonitoring(token) {
  const headers = { 'Authorization': `Bearer ${token}` };
  
  // Load system health
  const healthResponse = http.get(`${BASE_URL}/api/admin/monitoring/health`, { headers });
  
  const healthSuccess = check(healthResponse, {
    'system health loaded': (r) => r.status === 200,
    'health response time < 1s': (r) => r.timings.duration < 1000,
    'health data complete': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status !== undefined && body.services !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  // Load performance metrics
  const metricsResponse = http.get(`${BASE_URL}/api/admin/monitoring/metrics`, { headers });
  
  const metricsSuccess = check(metricsResponse, {
    'performance metrics loaded': (r) => r.status === 200,
    'metrics response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  // Load error logs
  const logsResponse = http.get(`${BASE_URL}/api/admin/monitoring/errors?limit=100`, { headers });
  
  const logsSuccess = check(logsResponse, {
    'error logs loaded': (r) => r.status === 200,
    'logs response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  const overallSuccess = healthSuccess && metricsSuccess && logsSuccess;
  systemMonitoringSuccessRate.add(overallSuccess);
  
  return overallSuccess;
}

function testSettingsManagement(token) {
  const headers = { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // Load current settings
  const settingsResponse = http.get(`${BASE_URL}/api/admin/settings`, { headers });
  
  const loadSuccess = check(settingsResponse, {
    'settings loaded': (r) => r.status === 200,
    'settings response time < 1s': (r) => r.timings.duration < 1000,
    'settings has configuration': (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body === 'object' && body !== null;
      } catch (e) {
        return false;
      }
    }
  });
  
  // Test settings validation (dry run)
  const validationPayload = {
    general: {
      siteName: 'QoderResume Load Test',
      maintenanceMode: false,
    },
    email: {
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
    }
  };
  
  const validateResponse = http.post(`${BASE_URL}/api/admin/settings/validate`, JSON.stringify(validationPayload), { headers });
  
  const validateSuccess = check(validateResponse, {
    'settings validation works': (r) => r.status === 200,
    'validation response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  return loadSuccess && validateSuccess;
}

export function handleSummary(data) {
  const report = {
    timestamp: new Date().toISOString(),
    test_type: 'Admin Portal Integration Test',
    summary: {
      total_admin_workflows: data.metrics.admin_workflow_success_rate?.count || 0,
      successful_workflows: Math.round((data.metrics.admin_workflow_success_rate?.values?.rate || 0) * (data.metrics.admin_workflow_success_rate?.count || 0)),
      workflow_success_rate: ((data.metrics.admin_workflow_success_rate?.values?.rate || 0) * 100).toFixed(2),
      avg_operation_time: (data.metrics.admin_operation_duration?.values?.avg || 0).toFixed(2),
      p95_operation_time: (data.metrics.admin_operation_duration?.values?.['p(95)'] || 0).toFixed(2),
      user_management_success: ((data.metrics.user_management_success_rate?.values?.rate || 0) * 100).toFixed(2),
      analytics_load_success: ((data.metrics.analytics_load_success_rate?.values?.rate || 0) * 100).toFixed(2),
      system_monitoring_success: ((data.metrics.system_monitoring_success_rate?.values?.rate || 0) * 100).toFixed(2),
    },
    performance_analysis: {
      admin_operations_performance: data.metrics.admin_operation_duration?.values?.['p(95)'] < 3000 ? 'PASS' : 'FAIL',
      user_management_reliability: data.metrics.user_management_success_rate?.values?.rate > 0.99 ? 'PASS' : 'FAIL',
      analytics_reliability: data.metrics.analytics_load_success_rate?.values?.rate > 0.95 ? 'PASS' : 'FAIL',
      monitoring_reliability: data.metrics.system_monitoring_success_rate?.values?.rate > 0.99 ? 'PASS' : 'FAIL',
      overall_admin_reliability: data.metrics.admin_workflow_success_rate?.values?.rate > 0.98 ? 'PASS' : 'FAIL',
    },
    recommendations: []
  };
  
  // Add performance recommendations
  if (report.performance_analysis.admin_operations_performance === 'FAIL') {
    report.recommendations.push('Admin operations taking too long - optimize database queries and caching');
  }
  
  if (report.performance_analysis.analytics_reliability === 'FAIL') {
    report.recommendations.push('Analytics loading issues detected - check database performance and query optimization');
  }
  
  if (report.performance_analysis.overall_admin_reliability === 'FAIL') {
    report.recommendations.push('Overall admin reliability below threshold - investigate system bottlenecks');
  }
  
  return {
    'load-testing/reports/results/admin-portal-integration-test.json': JSON.stringify(report, null, 2),
    'load-testing/reports/results/admin-portal-summary.json': JSON.stringify(report.summary, null, 2),
  };
}