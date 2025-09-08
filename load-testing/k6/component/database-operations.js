import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for database operations
const dbQuerySuccessRate = new Rate('db_query_success_rate');
const dbQueryDuration = new Trend('db_query_duration');
const dbConnectionErrors = new Counter('db_connection_errors');
const dbSlowQueries = new Counter('db_slow_queries');

export const options = {
  stages: [
    { duration: '2m', target: 20 },   // Ramp up to 20 concurrent DB operations
    { duration: '5m', target: 50 },   // Increase to 50 concurrent operations
    { duration: '3m', target: 100 },  // Stress test with 100 concurrent operations
    { duration: '5m', target: 100 },  // Maintain high load
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    db_query_duration: ['p(95)<1000'],     // 95% of queries under 1 second
    db_query_success_rate: ['rate>0.99'],  // 99% success rate
    db_slow_queries: ['count<100'],        // Less than 100 slow queries
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BACKEND_URL || 'http://localhost:3001';

// Database-intensive operations to test
const dbOperations = [
  'users',
  'resumes', 
  'job-applications',
  'analytics/metrics',
  'admin/users',
];

export default function () {
  const token = getAuthToken();
  if (!token) {
    console.error('Failed to authenticate for DB tests');
    return;
  }
  
  // Test different database operations
  testUserQueries(token);
  testResumeQueries(token);
  testJobApplicationQueries(token);
  testAnalyticsQueries(token);
  testPaginatedQueries(token);
  
  sleep(1);
}

function getAuthToken() {
  const loginPayload = {
    email: __ENV.TEST_ADMIN_EMAIL || 'admin@example.com',
    password: __ENV.TEST_ADMIN_PASSWORD || 'admin123',
  };
  
  const response = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(loginPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
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

function testUserQueries(token) {
  const headers = { 'Authorization': `Bearer ${token}` };
  
  // Test user listing (should hit user table with joins)
  const startTime = Date.now();
  
  const userListResponse = http.get(`${BASE_URL}/api/admin/users?page=1&limit=50&sortBy=createdAt`, { headers });
  
  const duration = Date.now() - startTime;
  dbQueryDuration.add(duration);
  
  if (duration > 2000) {
    dbSlowQueries.add(1);
  }
  
  const success = check(userListResponse, {
    'user list query status is 200': (r) => r.status === 200,
    'user list query response time < 2s': (r) => r.timings.duration < 2000,
    'user list has pagination': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.pagination !== undefined || body.total !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  dbQuerySuccessRate.add(success);
  
  // Test user search (full-text search)
  const searchResponse = http.get(`${BASE_URL}/api/admin/users?search=john&page=1&limit=20`, { headers });
  
  check(searchResponse, {
    'user search query status is 200': (r) => r.status === 200,
    'user search response time < 1s': (r) => r.timings.duration < 1000,
  });
}

function testResumeQueries(token) {
  const headers = { 'Authorization': `Bearer ${token}` };
  
  // Test resume listing with complex joins
  const resumeResponse = http.get(`${BASE_URL}/api/resumes?includeAnalysis=true&sortBy=uploadedAt`, { headers });
  
  const success = check(resumeResponse, {
    'resume query status is 200': (r) => r.status === 200,
    'resume query response time < 1.5s': (r) => r.timings.duration < 1500,
    'resume query returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) || Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    },
  });
  
  dbQuerySuccessRate.add(success);
  
  // Test resume analytics aggregation
  const analyticsResponse = http.get(`${BASE_URL}/api/resumes/analytics`, { headers });
  
  check(analyticsResponse, {
    'resume analytics status is 200': (r) => r.status === 200,
    'resume analytics response time < 3s': (r) => r.timings.duration < 3000,
  });
}

function testJobApplicationQueries(token) {
  const headers = { 'Authorization': `Bearer ${token}` };
  
  // Test job application queries with filters
  const jobAppResponse = http.get(`${BASE_URL}/api/job-applications?status=active&sortBy=appliedAt&order=DESC`, { headers });
  
  const success = check(jobAppResponse, {
    'job application query status is 200': (r) => r.status === 200,
    'job application query response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  dbQuerySuccessRate.add(success);
  
  // Test job application statistics (complex aggregation)
  const statsResponse = http.get(`${BASE_URL}/api/job-applications/stats`, { headers });
  
  check(statsResponse, {
    'job application stats status is 200': (r) => r.status === 200,
    'job application stats response time < 2s': (r) => r.timings.duration < 2000,
  });
}

function testAnalyticsQueries(token) {
  const headers = { 'Authorization': `Bearer ${token}` };
  
  // Test heavy analytics queries
  const metricsResponse = http.get(`${BASE_URL}/api/admin/analytics/metrics`, { headers });
  
  const duration = metricsResponse.timings.duration;
  dbQueryDuration.add(duration);
  
  if (duration > 3000) {
    dbSlowQueries.add(1);
  }
  
  const success = check(metricsResponse, {
    'analytics metrics status is 200': (r) => r.status === 200,
    'analytics metrics response time < 5s': (r) => r.timings.duration < 5000,
    'analytics has required fields': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.totalUsers !== undefined && body.totalResumes !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  dbQuerySuccessRate.add(success);
  
  // Test user activity data (time-based aggregation)
  const activityResponse = http.get(`${BASE_URL}/api/admin/analytics/user-activity?days=30`, { headers });
  
  check(activityResponse, {
    'user activity status is 200': (r) => r.status === 200,
    'user activity response time < 3s': (r) => r.timings.duration < 3000,
  });
}

function testPaginatedQueries(token) {
  const headers = { 'Authorization': `Bearer ${token}` };
  
  // Test large pagination scenarios
  const pages = [1, 5, 10, 20];
  
  pages.forEach(page => {
    const paginatedResponse = http.get(`${BASE_URL}/api/admin/users?page=${page}&limit=100`, { headers });
    
    check(paginatedResponse, {
      [`pagination page ${page} status is 200`]: (r) => r.status === 200,
      [`pagination page ${page} response time < 2s`]: (r) => r.timings.duration < 2000,
    });
    
    if (paginatedResponse.timings.duration > 2000) {
      dbSlowQueries.add(1);
    }
  });
}

export function handleSummary(data) {
  const report = {
    timestamp: new Date().toISOString(),
    test_type: 'Database Operations Load Test',
    summary: {
      total_requests: data.metrics.http_reqs?.count || 0,
      failed_requests: data.metrics.http_req_failed?.count || 0,
      db_query_avg_duration: (data.metrics.db_query_duration?.values?.avg || 0).toFixed(2),
      db_query_p95_duration: (data.metrics.db_query_duration?.values?.['p(95)'] || 0).toFixed(2),
      db_success_rate: ((data.metrics.db_query_success_rate?.values?.rate || 0) * 100).toFixed(2),
      slow_queries_count: data.metrics.db_slow_queries?.count || 0,
      connection_errors: data.metrics.db_connection_errors?.count || 0,
    },
    recommendations: [],
  };
  
  // Add performance recommendations
  if (report.summary.db_query_p95_duration > 1000) {
    report.recommendations.push('Consider database query optimization - P95 response time exceeds 1 second');
  }
  
  if (report.summary.slow_queries_count > 50) {
    report.recommendations.push('High number of slow queries detected - review database indexes');
  }
  
  if (report.summary.db_success_rate < 99) {
    report.recommendations.push('Database success rate below 99% - investigate connection issues');
  }
  
  return {
    'load-testing/reports/results/database-load-test.json': JSON.stringify(report, null, 2),
    'load-testing/reports/results/database-summary.json': JSON.stringify(report.summary, null, 2),
  };
}