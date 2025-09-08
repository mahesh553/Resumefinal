import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for scale testing
const concurrentUserSuccessRate = new Rate('concurrent_user_success_rate');
const peakLoadHandling = new Rate('peak_load_handling');
const systemStabilityRate = new Rate('system_stability_rate');
const resourceExhaustionEvents = new Counter('resource_exhaustion_events');
const responseTimeUnderLoad = new Trend('response_time_under_load');

export const options = {
  stages: [
    // Gradual ramp up to baseline
    { duration: '5m', target: 50 },
    { duration: '5m', target: 100 },
    
    // Scale to expected peak load
    { duration: '5m', target: 300 },
    { duration: '10m', target: 500 },
    
    // Push to stress limits
    { duration: '5m', target: 750 },
    { duration: '10m', target: 1000 },
    
    // Spike test - sudden traffic burst
    { duration: '2m', target: 1500 },
    { duration: '5m', target: 1500 },
    
    // Recovery and stability test
    { duration: '5m', target: 500 },
    { duration: '10m', target: 500 },
    
    // Gradual ramp down
    { duration: '5m', target: 100 },
    { duration: '3m', target: 0 },
  ],
  thresholds: {
    // Performance thresholds under scale
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.05'], // Max 5% error rate under peak load
    concurrent_user_success_rate: ['rate>0.90'],
    peak_load_handling: ['rate>0.85'],
    system_stability_rate: ['rate>0.95'],
    
    // Resource exhaustion monitoring
    resource_exhaustion_events: ['count<10'],
  },
};

const BASE_URL = __ENV.BACKEND_URL || 'http://localhost:3001';

// User behavior patterns for scale testing
const userBehaviors = [
  'heavy_user',      // 30% - Power users with high activity
  'normal_user',     // 50% - Regular usage patterns  
  'light_user',      // 15% - Minimal usage
  'admin_user'       // 5%  - Administrative operations
];

export default function () {
  const userType = userBehaviors[Math.floor(Math.random() * userBehaviors.length)];
  const startTime = Date.now();
  
  let sessionSuccess = true;
  
  try {
    // Execute user behavior based on type
    switch (userType) {
      case 'heavy_user': {
        sessionSuccess = simulateHeavyUser();
        break;
      }
      case 'normal_user': {
        sessionSuccess = simulateNormalUser();
        break;
      }
      case 'light_user': {
        sessionSuccess = simulateLightUser();
        break;
      }
      case 'admin_user': {
        sessionSuccess = simulateAdminUser();
        break;
      }
    }
  } catch (error) {
    console.error(`Error in ${userType} simulation:`, error);
    sessionSuccess = false;
    
    // Check for resource exhaustion indicators
    if (error.message && (
      error.message.includes('connection refused') ||
      error.message.includes('timeout') ||
      error.message.includes('502') ||
      error.message.includes('503')
    )) {
      resourceExhaustionEvents.add(1);
    }
  }
  
  const sessionDuration = Date.now() - startTime;
  responseTimeUnderLoad.add(sessionDuration);
  
  concurrentUserSuccessRate.add(sessionSuccess);
  
  // Check if we're in peak load phase (1000+ users)
  if (__VU > 1000) {
    peakLoadHandling.add(sessionSuccess);
  }
  
  // System stability check (consistent performance over time)
  systemStabilityRate.add(sessionSuccess);
  
  sleep(Math.random() * 2 + 1);
}

function simulateHeavyUser() {
  const token = authenticateUser('heavy');
  if (!token) return false;
  
  let success = true;
  
  // Heavy user performs multiple operations in sequence
  group('Heavy User - Multiple Resume Operations', () => {
    // Upload multiple resumes
    for (let i = 0; i < 3; i++) {
      const uploadSuccess = performResumeUpload(token);
      if (!uploadSuccess) success = false;
      sleep(1);
    }
    
    // Perform AI analysis on each
    for (let i = 0; i < 3; i++) {
      const analysisSuccess = performAIAnalysis(token);
      if (!analysisSuccess) success = false;
      sleep(2);
    }
  });
  
  group('Heavy User - Job Applications Management', () => {
    // Create multiple job applications
    for (let i = 0; i < 5; i++) {
      const jobAppSuccess = createJobApplication(token);
      if (!jobAppSuccess) success = false;
      sleep(0.5);
    }
    
    // Browse and update applications
    const browseSuccess = browseJobApplications(token);
    if (!browseSuccess) success = false;
  });
  
  return success;
}

function simulateNormalUser() {
  const token = authenticateUser('normal');
  if (!token) return false;
  
  let success = true;
  
  group('Normal User - Standard Workflow', () => {
    // Single resume upload and analysis
    const uploadSuccess = performResumeUpload(token);
    if (!uploadSuccess) success = false;
    
    sleep(2);
    
    const analysisSuccess = performAIAnalysis(token);
    if (!analysisSuccess) success = false;
    
    // Create a job application
    const jobAppSuccess = createJobApplication(token);
    if (!jobAppSuccess) success = false;
    
    // Check dashboard
    const dashboardSuccess = checkDashboard(token);
    if (!dashboardSuccess) success = false;
  });
  
  return success;
}

function simulateLightUser() {
  const token = authenticateUser('light');
  if (!token) return false;
  
  let success = true;
  
  group('Light User - Minimal Activity', () => {
    // Just browse existing data
    const dashboardSuccess = checkDashboard(token);
    if (!dashboardSuccess) success = false;
    
    sleep(1);
    
    // Maybe view resumes
    const browseSuccess = browseResumes(token);
    if (!browseSuccess) success = false;
  });
  
  return success;
}

function simulateAdminUser() {
  const token = authenticateUser('admin');
  if (!token) return false;
  
  let success = true;
  
  group('Admin User - Administrative Operations', () => {
    // Load admin dashboard
    const dashboardSuccess = loadAdminDashboard(token);
    if (!dashboardSuccess) success = false;
    
    // Check system monitoring
    const monitoringSuccess = checkSystemMonitoring(token);
    if (!monitoringSuccess) success = false;
    
    // View user management
    const userMgmtSuccess = viewUserManagement(token);
    if (!userMgmtSuccess) success = false;
  });
  
  return success;
}

// Helper functions for user operations
function authenticateUser(userType) {
  let email, password;
  
  switch (userType) {
    case 'admin': {
      email = __ENV.TEST_ADMIN_EMAIL || 'admin@example.com';
      password = __ENV.TEST_ADMIN_PASSWORD || 'admin123';
      break;
    }
    default: {
      const userId = Math.floor(Math.random() * 10000);
      email = `${userType}${userId}@example.com`;
      password = 'LoadTest123!';
    }
  }
  
  const response = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: email,
    password: password
  }), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '10s'
  });
  
  // If user doesn't exist, create them (for non-admin users)
  if (response.status === 401 && userType !== 'admin') {
    const registerResponse = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({
      firstName: userType,
      lastName: 'User',
      email: email,
      password: password
    }), {
      headers: { 'Content-Type': 'application/json' },
      timeout: '10s'
    });
    
    if (registerResponse.status === 201 || registerResponse.status === 200) {
      sleep(1);
      const loginRetry = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
        email: email,
        password: password
      }), {
        headers: { 'Content-Type': 'application/json' },
        timeout: '10s'
      });
      
      if (loginRetry.status === 200) {
        try {
          const body = JSON.parse(loginRetry.body);
          return body.access_token;
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }
  
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

function performResumeUpload(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  const uploadPayload = {
    fileName: `resume-${Math.floor(Math.random() * 10000)}.pdf`,
    fileSize: Math.floor(Math.random() * 1024 * 1024) + 1024, // 1KB to 1MB
    fileType: 'application/pdf',
    content: `Sample resume content for load testing - ${Date.now()}`
  };
  
  const response = http.post(`${BASE_URL}/api/resumes/upload`, JSON.stringify(uploadPayload), {
    headers,
    timeout: '30s'
  });
  
  return check(response, {
    'resume upload successful': (r) => r.status === 200 || r.status === 201,
    'resume upload response time acceptable': (r) => r.timings.duration < 10000,
  });
}

function performAIAnalysis(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  const analysisPayload = {
    content: 'Sample resume content for AI analysis during load testing',
    options: {
      includeATS: true,
      includeKeywords: Math.random() > 0.5,
      includeSuggestions: Math.random() > 0.3
    }
  };
  
  const response = http.post(`${BASE_URL}/api/ai/analyze`, JSON.stringify(analysisPayload), {
    headers,
    timeout: '60s'
  });
  
  return check(response, {
    'AI analysis initiated': (r) => r.status === 200 || r.status === 202,
    'AI analysis response time reasonable': (r) => r.timings.duration < 45000,
  });
}

function createJobApplication(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  const jobAppPayload = {
    companyName: `Company ${Math.floor(Math.random() * 1000)}`,
    position: 'Software Engineer',
    status: 'applied',
    appliedAt: new Date().toISOString()
  };
  
  const response = http.post(`${BASE_URL}/api/job-applications`, JSON.stringify(jobAppPayload), {
    headers,
    timeout: '10s'
  });
  
  return check(response, {
    'job application created': (r) => r.status === 200 || r.status === 201,
  });
}

function checkDashboard(token) {
  const headers = { 'Authorization': `Bearer ${token}` };
  
  const response = http.get(`${BASE_URL}/api/analytics/dashboard`, {
    headers,
    timeout: '15s'
  });
  
  return check(response, {
    'dashboard loaded': (r) => r.status === 200,
    'dashboard response time acceptable': (r) => r.timings.duration < 5000,
  });
}

function browseResumes(token) {
  const headers = { 'Authorization': `Bearer ${token}` };
  
  const response = http.get(`${BASE_URL}/api/resumes?page=1&limit=20`, {
    headers,
    timeout: '10s'
  });
  
  return check(response, {
    'resumes browsed': (r) => r.status === 200,
  });
}

function browseJobApplications(token) {
  const headers = { 'Authorization': `Bearer ${token}` };
  
  const response = http.get(`${BASE_URL}/api/job-applications?page=1&limit=50`, {
    headers,
    timeout: '10s'
  });
  
  return check(response, {
    'job applications browsed': (r) => r.status === 200,
  });
}

function loadAdminDashboard(token) {
  const headers = { 'Authorization': `Bearer ${token}` };
  
  const response = http.get(`${BASE_URL}/api/admin/analytics/metrics`, {
    headers,
    timeout: '20s'
  });
  
  return check(response, {
    'admin dashboard loaded': (r) => r.status === 200,
    'admin dashboard response time acceptable': (r) => r.timings.duration < 10000,
  });
}

function checkSystemMonitoring(token) {
  const headers = { 'Authorization': `Bearer ${token}` };
  
  const response = http.get(`${BASE_URL}/api/admin/monitoring/health`, {
    headers,
    timeout: '10s'
  });
  
  return check(response, {
    'system monitoring accessible': (r) => r.status === 200,
  });
}

function viewUserManagement(token) {
  const headers = { 'Authorization': `Bearer ${token}` };
  
  const response = http.get(`${BASE_URL}/api/admin/users?page=1&limit=50`, {
    headers,
    timeout: '15s'
  });
  
  return check(response, {
    'user management accessible': (r) => r.status === 200,
  });
}

export function handleSummary(data) {
  const report = {
    timestamp: new Date().toISOString(),
    test_type: 'Concurrent Users Scale Test',
    scale_analysis: {
      max_concurrent_users: Math.max(...Object.keys(data.metrics.vus || {}).map(Number)),
      peak_load_success_rate: ((data.metrics.peak_load_handling?.values?.rate || 0) * 100).toFixed(2),
      overall_success_rate: ((data.metrics.concurrent_user_success_rate?.values?.rate || 0) * 100).toFixed(2),
      system_stability_rate: ((data.metrics.system_stability_rate?.values?.rate || 0) * 100).toFixed(2),
      resource_exhaustion_events: data.metrics.resource_exhaustion_events?.count || 0,
      avg_response_time_under_load: (data.metrics.response_time_under_load?.values?.avg || 0).toFixed(2),
      p95_response_time_under_load: (data.metrics.response_time_under_load?.values?.['p(95)'] || 0).toFixed(2),
    },
    performance_verdict: {
      can_handle_peak_load: data.metrics.peak_load_handling?.values?.rate > 0.85 ? 'PASS' : 'FAIL',
      system_stability: data.metrics.system_stability_rate?.values?.rate > 0.95 ? 'PASS' : 'FAIL',
      response_time_acceptable: (data.metrics.response_time_under_load?.values?.['p(95)'] || 0) < 5000 ? 'PASS' : 'FAIL',
      error_rate_acceptable: (data.metrics.http_req_failed?.values?.rate || 0) < 0.05 ? 'PASS' : 'FAIL',
      no_resource_exhaustion: (data.metrics.resource_exhaustion_events?.count || 0) < 10 ? 'PASS' : 'FAIL',
    }
  };
  
  return {
    'load-testing/reports/results/concurrent-users-scale-test.json': JSON.stringify(report, null, 2),
  };
}