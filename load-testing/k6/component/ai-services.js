import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for AI processing
const aiAnalysisSuccessRate = new Rate('ai_analysis_success_rate');
const aiAnalysisDuration = new Trend('ai_analysis_duration');
const aiCacheHitRate = new Rate('ai_cache_hit_rate');
const aiProcessingQueue = new Counter('ai_processing_queue');

export const options = {
  stages: [
    { duration: '1m', target: 5 },    // Start with low load for AI
    { duration: '3m', target: 20 },   // Ramp up to 20 concurrent AI requests
    { duration: '5m', target: 20 },   // Maintain 20 users
    { duration: '2m', target: 50 },   // Stress test - 50 concurrent AI requests
    { duration: '3m', target: 50 },   // Maintain stress load
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    ai_analysis_duration: ['p(95)<30000'], // 30 seconds for P95
    ai_analysis_success_rate: ['rate>0.95'], // 95% success rate
    ai_cache_hit_rate: ['rate>0.3'], // At least 30% cache hits
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BACKEND_URL || 'http://localhost:3001';
const AI_TIMEOUT = 45000; // 45 second timeout for AI operations

// Sample resume content for testing
const sampleResumeContent = `
John Doe
Software Engineer
Email: john.doe@email.com
Phone: (555) 123-4567

EXPERIENCE
Software Developer at Tech Corp (2020-2023)
- Developed web applications using React and Node.js
- Implemented REST APIs and microservices
- Collaborated with cross-functional teams
- Improved application performance by 30%

EDUCATION
Bachelor of Science in Computer Science
University of Technology (2016-2020)

SKILLS
- JavaScript, Python, Java
- React, Node.js, Express
- PostgreSQL, MongoDB
- AWS, Docker, Kubernetes
`;

export default function () {
  const token = getAuthToken();
  if (!token) {
    console.error('Failed to authenticate');
    return;
  }
  
  // Test AI analysis with different scenarios
  testAIAnalysis(token);
  
  sleep(2);
  
  // Test cached AI response (should be faster)
  testCachedAIResponse(token);
  
  sleep(1);
  
  // Test AI analysis status check
  testAIStatusCheck(token);
  
  sleep(Math.random() * 3 + 1);
}

function getAuthToken() {
  const loginPayload = {
    email: __ENV.TEST_USER_EMAIL || 'testuser@example.com',
    password: __ENV.TEST_USER_PASSWORD || 'testpass123',
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

function testAIAnalysis(token) {
  aiProcessingQueue.add(1);
  
  const analysisPayload = {
    content: sampleResumeContent,
    options: {
      includeATS: true,
      includeKeywords: true,
      includeSuggestions: true,
      jobDescription: 'Software Engineer position requiring React, Node.js, and cloud experience.',
    },
  };
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  const startTime = Date.now();
  
  const response = http.post(
    `${BASE_URL}/api/ai/analyze`,
    JSON.stringify(analysisPayload),
    {
      headers,
      timeout: `${AI_TIMEOUT}ms`,
    }
  );
  
  const duration = Date.now() - startTime;
  aiAnalysisDuration.add(duration);
  
  const success = check(response, {
    'AI analysis status is 200 or 202': (r) => r.status === 200 || r.status === 202,
    'AI analysis response has analysis data': (r) => {
      if (r.status === 202) return true; // Accepted for processing
      try {
        const body = JSON.parse(r.body);
        return body.atsScore !== undefined || body.analysisId !== undefined;
      } catch (e) {
        return false;
      }
    },
    'AI analysis completes within timeout': (r) => duration < AI_TIMEOUT,
  });
  
  // Check if response indicates cached result
  const isCached = check(response, {
    'AI response is from cache': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.cached === true || r.headers['x-cache'] === 'HIT';
      } catch (e) {
        return false;
      }
    },
  });
  
  aiAnalysisSuccessRate.add(success);
  aiCacheHitRate.add(isCached);
}

function testCachedAIResponse(token) {
  // Send the same content again to test caching
  const analysisPayload = {
    content: sampleResumeContent,
    options: {
      includeATS: true,
      includeKeywords: true,
      includeSuggestions: true,
    },
  };
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  const response = http.post(
    `${BASE_URL}/api/ai/analyze`,
    JSON.stringify(analysisPayload),
    { headers, timeout: '10000ms' }
  );
  
  check(response, {
    'cached AI response is fast': (r) => r.timings.duration < 5000, // Should be under 5s for cached
    'cached response status is 200': (r) => r.status === 200,
  });
}

function testAIStatusCheck(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
  };
  
  // Test AI service health check
  const healthResponse = http.get(`${BASE_URL}/api/ai/health`, { headers });
  
  check(healthResponse, {
    'AI health check status is 200': (r) => r.status === 200,
    'AI service is healthy': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'healthy' || body.gemini === 'healthy';
      } catch (e) {
        return false;
      }
    },
    'AI health check is fast': (r) => r.timings.duration < 1000,
  });
}

export function handleSummary(data) {
  const report = {
    timestamp: new Date().toISOString(),
    test_type: 'AI Services Load Test',
    summary: {
      total_requests: data.metrics.http_reqs?.count || 0,
      failed_requests: data.metrics.http_req_failed?.count || 0,
      ai_analysis_avg_duration: (data.metrics.ai_analysis_duration?.values?.avg || 0).toFixed(2),
      ai_analysis_p95_duration: (data.metrics.ai_analysis_duration?.values?.['p(95)'] || 0).toFixed(2),
      ai_success_rate: ((data.metrics.ai_analysis_success_rate?.values?.rate || 0) * 100).toFixed(2),
      cache_hit_rate: ((data.metrics.ai_cache_hit_rate?.values?.rate || 0) * 100).toFixed(2),
    },
    metrics: data.metrics,
  };
  
  return {
    'load-testing/reports/results/ai-services-load-test.json': JSON.stringify(report, null, 2),
    'load-testing/reports/results/ai-services-summary.json': JSON.stringify(report.summary, null, 2),
  };
}