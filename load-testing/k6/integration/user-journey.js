import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for user workflow
const userWorkflowSuccessRate = new Rate('user_workflow_success_rate');
const workflowCompletionTime = new Trend('workflow_completion_time');
const resumeUploadSuccessRate = new Rate('resume_upload_success_rate');
const aiAnalysisSuccessRate = new Rate('ai_analysis_success_rate');
const jobApplicationSuccessRate = new Rate('job_application_success_rate');

export const options = {
  stages: [
    { duration: '3m', target: 10 },   // Ramp up slowly for complete workflows
    { duration: '5m', target: 25 },   // Maintain moderate load
    { duration: '5m', target: 50 },   // Increase to stress test workflows
    { duration: '3m', target: 25 },   // Ramp down
    { duration: '2m', target: 0 },    // Complete ramp down
  ],
  thresholds: {
    user_workflow_success_rate: ['rate>0.95'],
    workflow_completion_time: ['p(95)<180000'], // 3 minutes for P95
    resume_upload_success_rate: ['rate>0.98'],
    ai_analysis_success_rate: ['rate>0.90'],
    job_application_success_rate: ['rate>0.99'],
  },
};

const BASE_URL = __ENV.BACKEND_URL || 'http://localhost:3001';

// Sample resume file content (base64 encoded)
const sampleResumeContent = `JVBERi0xLjQKJdP0zOEKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCgoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagoKMyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDIgMCBSCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDQgMCBSCj4+Cj4+Ci9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoK`;

export default function () {
  const startTime = Date.now();
  let workflowSuccess = true;
  
  let token;
  
  // Complete User Journey Test
  group('User Registration and Login', () => {
    token = authenticateUser();
    if (!token) {
      workflowSuccess = false;
      return;
    }
  });
  
  if (!token) return;
  
  group('Resume Upload and Processing', () => {
    const resumeSuccess = uploadAndProcessResume(token);
    if (!resumeSuccess) {
      workflowSuccess = false;
    }
  });
  
  group('Job Application Management', () => {
    const jobAppSuccess = manageJobApplications(token);
    if (!jobAppSuccess) {
      workflowSuccess = false;
    }
  });
  
  group('Analytics and Dashboard', () => {
    const analyticsSuccess = accessAnalytics(token);
    if (!analyticsSuccess) {
      workflowSuccess = false;
    }
  });
  
  const totalTime = Date.now() - startTime;
  workflowCompletionTime.add(totalTime);
  userWorkflowSuccessRate.add(workflowSuccess);
  
  sleep(2);
}

function authenticateUser() {
  // Generate unique user credentials for this test
  const userId = Math.floor(Math.random() * 10000);
  const userEmail = `loadtest${userId}@example.com`;
  
  // First try to login (user might already exist)
  let loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: userEmail,
    password: 'LoadTest123!'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  // If login fails, register new user
  if (loginResponse.status !== 200) {
    const registerResponse = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({
      firstName: `LoadTest${userId}`,
      lastName: 'User',
      email: userEmail,
      password: 'LoadTest123!'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const registerSuccess = check(registerResponse, {
      'user registration successful': (r) => r.status === 201 || r.status === 200,
    });
    
    if (!registerSuccess) {
      return null;
    }
    
    // Login after registration
    sleep(1);
    loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
      email: userEmail,
      password: 'LoadTest123!'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const loginSuccess = check(loginResponse, {
    'user login successful': (r) => r.status === 200,
    'login response has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.access_token !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  if (loginSuccess) {
    try {
      const body = JSON.parse(loginResponse.body);
      return body.access_token;
    } catch (e) {
      return null;
    }
  }
  
  return null;
}

function uploadAndProcessResume(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
  };
  
  // Simulate resume upload
  const uploadPayload = {
    fileName: 'test-resume.pdf',
    fileSize: 1024 * 50, // 50KB
    fileType: 'application/pdf',
    content: 'Sample resume content for load testing...'
  };
  
  const uploadResponse = http.post(
    `${BASE_URL}/api/resumes/upload`,
    JSON.stringify(uploadPayload),
    {
      headers: { ...headers, 'Content-Type': 'application/json' }
    }
  );
  
  const uploadSuccess = check(uploadResponse, {
    'resume upload successful': (r) => r.status === 200 || r.status === 201,
    'resume upload response has ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id !== undefined || body.resumeId !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  resumeUploadSuccessRate.add(uploadSuccess);
  
  if (!uploadSuccess) {
    return false;
  }
  
  // Extract resume ID for analysis
  let resumeId;
  try {
    const body = JSON.parse(uploadResponse.body);
    resumeId = body.id || body.resumeId;
  } catch (e) {
    return false;
  }
  
  sleep(2); // Wait before AI analysis
  
  // Trigger AI analysis
  const analysisResponse = http.post(
    `${BASE_URL}/api/ai/analyze`,
    JSON.stringify({
      resumeId: resumeId,
      options: {
        includeATS: true,
        includeKeywords: true,
        includeSuggestions: true
      }
    }),
    {
      headers: { ...headers, 'Content-Type': 'application/json' },
      timeout: '45s'
    }
  );
  
  const analysisSuccess = check(analysisResponse, {
    'AI analysis initiated': (r) => r.status === 200 || r.status === 202,
    'AI analysis response time reasonable': (r) => r.timings.duration < 45000,
  });
  
  aiAnalysisSuccessRate.add(analysisSuccess);
  
  // Check analysis status
  if (analysisResponse.status === 202) {
    sleep(5); // Wait for processing
    
    const statusResponse = http.get(`${BASE_URL}/api/resumes/${resumeId}/analysis`, { headers });
    
    check(statusResponse, {
      'analysis status check successful': (r) => r.status === 200,
    });
  }
  
  return uploadSuccess && analysisSuccess;
}

function manageJobApplications(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  // Create a job application
  const jobAppPayload = {
    companyName: `LoadTest Corp ${Math.floor(Math.random() * 1000)}`,
    position: 'Software Engineer',
    jobDescription: 'Load testing position for QoderResume platform',
    applicationUrl: 'https://example.com/jobs/123',
    status: 'applied',
    appliedAt: new Date().toISOString(),
  };
  
  const createResponse = http.post(
    `${BASE_URL}/api/job-applications`,
    JSON.stringify(jobAppPayload),
    { headers }
  );
  
  const createSuccess = check(createResponse, {
    'job application created': (r) => r.status === 200 || r.status === 201,
    'job application has ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  jobApplicationSuccessRate.add(createSuccess);
  
  if (!createSuccess) {
    return false;
  }
  
  // Get job applications list
  const listResponse = http.get(`${BASE_URL}/api/job-applications?page=1&limit=20`, { headers });
  
  const listSuccess = check(listResponse, {
    'job applications list retrieved': (r) => r.status === 200,
    'job applications list has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) || Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    }
  });
  
  // Update job application status
  let jobAppId;
  try {
    const body = JSON.parse(createResponse.body);
    jobAppId = body.id;
  } catch (e) {
    return createSuccess && listSuccess;
  }
  
  const updateResponse = http.put(
    `${BASE_URL}/api/job-applications/${jobAppId}`,
    JSON.stringify({ status: 'interview' }),
    { headers }
  );
  
  const updateSuccess = check(updateResponse, {
    'job application updated': (r) => r.status === 200,
  });
  
  return createSuccess && listSuccess && updateSuccess;
}

function accessAnalytics(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
  };
  
  // Access user dashboard analytics
  const dashboardResponse = http.get(`${BASE_URL}/api/analytics/dashboard`, { headers });
  
  const dashboardSuccess = check(dashboardResponse, {
    'dashboard analytics retrieved': (r) => r.status === 200,
    'dashboard has metrics': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.totalResumes !== undefined || body.totalApplications !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  // Access resume analytics
  const resumeAnalyticsResponse = http.get(`${BASE_URL}/api/resumes/analytics`, { headers });
  
  const resumeAnalyticsSuccess = check(resumeAnalyticsResponse, {
    'resume analytics retrieved': (r) => r.status === 200,
  });
  
  // Access application statistics
  const appStatsResponse = http.get(`${BASE_URL}/api/job-applications/stats`, { headers });
  
  const appStatsSuccess = check(appStatsResponse, {
    'application stats retrieved': (r) => r.status === 200,
  });
  
  return dashboardSuccess && resumeAnalyticsSuccess && appStatsSuccess;
}

export function handleSummary(data) {
  const report = {
    timestamp: new Date().toISOString(),
    test_type: 'User Journey Integration Test',
    summary: {
      total_workflows: data.metrics.user_workflow_success_rate?.count || 0,
      successful_workflows: Math.round((data.metrics.user_workflow_success_rate?.values?.rate || 0) * (data.metrics.user_workflow_success_rate?.count || 0)),
      workflow_success_rate: ((data.metrics.user_workflow_success_rate?.values?.rate || 0) * 100).toFixed(2),
      avg_completion_time: (data.metrics.workflow_completion_time?.values?.avg || 0).toFixed(2),
      p95_completion_time: (data.metrics.workflow_completion_time?.values?.['p(95)'] || 0).toFixed(2),
      resume_upload_success_rate: ((data.metrics.resume_upload_success_rate?.values?.rate || 0) * 100).toFixed(2),
      ai_analysis_success_rate: ((data.metrics.ai_analysis_success_rate?.values?.rate || 0) * 100).toFixed(2),
      job_application_success_rate: ((data.metrics.job_application_success_rate?.values?.rate || 0) * 100).toFixed(2),
    },
    performance_analysis: {
      workflow_performance: data.metrics.workflow_completion_time?.values?.['p(95)'] < 180000 ? 'PASS' : 'FAIL',
      upload_reliability: data.metrics.resume_upload_success_rate?.values?.rate > 0.98 ? 'PASS' : 'FAIL',
      ai_reliability: data.metrics.ai_analysis_success_rate?.values?.rate > 0.90 ? 'PASS' : 'FAIL',
      overall_reliability: data.metrics.user_workflow_success_rate?.values?.rate > 0.95 ? 'PASS' : 'FAIL',
    }
  };
  
  return {
    'load-testing/reports/results/user-journey-integration-test.json': JSON.stringify(report, null, 2),
    'load-testing/reports/results/user-journey-summary.json': JSON.stringify(report.summary, null, 2),
  };
}