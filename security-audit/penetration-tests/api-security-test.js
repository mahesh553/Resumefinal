#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API Security & Input Validation Penetration Testing
class APIPenetrationTester {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.results = {
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        vulnerabilities: []
      }
    };
    this.authToken = null;
  }

  async request(config) {
    try {
      const response = await axios({
        ...config,
        timeout: 15000,
        validateStatus: () => true
      });
      return response;
    } catch (error) {
      return {
        status: 0,
        data: null,
        error: error.message
      };
    }
  }

  recordTest(testName, passed, details, vulnerability = null) {
    this.results.tests.push({
      name: testName,
      passed,
      details,
      vulnerability,
      timestamp: new Date().toISOString()
    });
    this.results.summary.total++;
    if (passed) {
      this.results.summary.passed++;
    } else {
      this.results.summary.failed++;
      if (vulnerability) {
        this.results.summary.vulnerabilities.push(vulnerability);
      }
    }
  }

  // Authenticate to get a valid token
  async authenticate() {
    const response = await this.request({
      method: 'POST',
      url: `${this.baseUrl}/api/auth/login`,
      data: {
        email: 'admin@example.com',
        password: 'admin123'
      }
    });

    if (response.status === 200 && response.data?.accessToken) {
      this.authToken = response.data.accessToken;
      return true;
    }
    return false;
  }

  // 1. Test SQL Injection Vulnerabilities
  async testSQLInjection() {
    console.log('\n💉 Testing SQL Injection Vulnerabilities...');

    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' OR 1=1 --",
      "admin'--",
      "' OR 1=1#",
      "1; SELECT * FROM information_schema.tables --"
    ];

    // Test SQL injection in login
    for (const payload of sqlPayloads) {
      const response = await this.request({
        method: 'POST',
        url: `${this.baseUrl}/api/auth/login`,
        data: {
          email: payload,
          password: 'test'
        }
      });

      const testPassed = response.status === 400 || response.status === 401;
      this.recordTest(
        `SQL Injection in Login Email: ${payload.substring(0, 20)}...`,
        testPassed,
        `Response status: ${response.status}`,
        testPassed ? null : {
          severity: 'CRITICAL',
          description: `SQL injection possible in login email field with payload: ${payload}`
        }
      );
    }

    // Test SQL injection in search/filter parameters
    if (this.authToken) {
      const searchPayloads = [
        "test' OR '1'='1",
        "'; SELECT pg_sleep(5); --",
        "1' UNION SELECT version() --"
      ];

      for (const payload of searchPayloads) {
        const response = await this.request({
          method: 'GET',
          url: `${this.baseUrl}/api/admin/users?search=${encodeURIComponent(payload)}`,
          headers: { Authorization: `Bearer ${this.authToken}` }
        });

        const testPassed = response.status === 400 || response.status === 422 || 
                          (response.status === 200 && !this.containsSQLError(response.data));
        
        this.recordTest(
          `SQL Injection in Search: ${payload.substring(0, 20)}...`,
          testPassed,
          `Response status: ${response.status}`,
          testPassed ? null : {
            severity: 'CRITICAL',
            description: `SQL injection possible in search parameter with payload: ${payload}`
          }
        );
      }
    }
  }

  containsSQLError(responseData) {
    const sqlErrorPatterns = [
      /syntax error/i,
      /mysql_fetch/i,
      /pg_query/i,
      /ora-\d+/i,
      /microsoft.*odbc.*sql/i,
      /postgresql.*error/i
    ];

    const responseStr = JSON.stringify(responseData).toLowerCase();
    return sqlErrorPatterns.some(pattern => pattern.test(responseStr));
  }

  // 2. Test XSS (Cross-Site Scripting)
  async testXSS() {
    console.log('\n🏴‍☠️ Testing XSS Vulnerabilities...');

    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src="x" onerror="alert(\'XSS\')">',
      '<svg onload="alert(\'XSS\')">',
      '${alert("XSS")}',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>'
    ];

    // Test XSS in user registration
    for (const payload of xssPayloads) {
      const response = await this.request({
        method: 'POST',
        url: `${this.baseUrl}/api/auth/register`,
        data: {
          email: `test-${Date.now()}@example.com`,
          firstName: payload,
          lastName: 'Test',
          password: 'TestPass123!'
        }
      });

      const testPassed = response.status === 400 || response.status === 422 ||
                        (response.status === 201 && !this.containsXSSPayload(response.data, payload));

      this.recordTest(
        `XSS in Registration FirstName: ${payload.substring(0, 20)}...`,
        testPassed,
        `Response status: ${response.status}`,
        testPassed ? null : {
          severity: 'HIGH',
          description: `XSS vulnerability in registration firstName field with payload: ${payload}`
        }
      );
    }

    // Test XSS in file upload metadata
    if (this.authToken) {
      const formData = new FormData();
      formData.append('file', Buffer.from('test content'), {
        filename: '<script>alert("XSS")</script>.txt',
        contentType: 'text/plain'
      });

      const response = await this.request({
        method: 'POST',
        url: `${this.baseUrl}/api/resume/upload`,
        headers: { 
          Authorization: `Bearer ${this.authToken}`,
        },
        data: formData
      });

      const testPassed = response.status === 400 || response.status === 422 ||
                        !this.containsXSSPayload(response.data, '<script>');

      this.recordTest(
        'XSS in File Upload Name',
        testPassed,
        `Response status: ${response.status}`,
        testPassed ? null : {
          severity: 'MEDIUM',
          description: 'XSS vulnerability in file upload filename'
        }
      );
    }
  }

  containsXSSPayload(responseData, payload) {
    const responseStr = JSON.stringify(responseData);
    return responseStr.includes(payload) && !responseStr.includes('&lt;') && !responseStr.includes('&gt;');
  }

  // 3. Test Input Validation
  async testInputValidation() {
    console.log('\n✅ Testing Input Validation...');

    // Test email validation
    const invalidEmails = [
      'invalid-email',
      'test@',
      '@example.com',
      'test..test@example.com',
      'test@example',
      ''
    ];

    for (const email of invalidEmails) {
      const response = await this.request({
        method: 'POST',
        url: `${this.baseUrl}/api/auth/register`,
        data: {
          email,
          firstName: 'Test',
          lastName: 'User',
          password: 'TestPass123!'
        }
      });

      const testPassed = response.status === 400 || response.status === 422;
      this.recordTest(
        `Email Validation: ${email || 'empty'}`,
        testPassed,
        `Response status: ${response.status}`,
        testPassed ? null : {
          severity: 'MEDIUM',
          description: `Invalid email format accepted: ${email}`
        }
      );
    }

    // Test field length limits
    const longString = 'A'.repeat(1000);
    const response = await this.request({
      method: 'POST',
      url: `${this.baseUrl}/api/auth/register`,
      data: {
        email: `test-${Date.now()}@example.com`,
        firstName: longString,
        lastName: 'Test',
        password: 'TestPass123!'
      }
    });

    const lengthTestPassed = response.status === 400 || response.status === 422;
    this.recordTest(
      'Field Length Validation',
      lengthTestPassed,
      `Response status: ${response.status} for 1000-char firstName`,
      lengthTestPassed ? null : {
        severity: 'LOW',
        description: 'No field length validation on firstName'
      }
    );
  }

  // 4. Test File Upload Security
  async testFileUploadSecurity() {
    console.log('\n📁 Testing File Upload Security...');

    if (!this.authToken) {
      console.log('⚠️ Skipping file upload tests - no auth token');
      return;
    }

    // Test malicious file types
    const maliciousFiles = [
      { name: 'malicious.exe', content: 'MZ\x90\x00', type: 'application/octet-stream' },
      { name: 'script.php', content: '<?php echo "hack"; ?>', type: 'application/x-php' },
      { name: 'malware.bat', content: '@echo off\necho hack', type: 'application/x-bat' },
      { name: 'large-file.txt', content: 'X'.repeat(50 * 1024 * 1024), type: 'text/plain' } // 50MB
    ];

    for (const file of maliciousFiles) {
      const formData = new FormData();
      formData.append('file', Buffer.from(file.content), {
        filename: file.name,
        contentType: file.type
      });

      const response = await this.request({
        method: 'POST',
        url: `${this.baseUrl}/api/resume/upload`,
        headers: { 
          Authorization: `Bearer ${this.authToken}`,
        },
        data: formData
      });

      const testPassed = response.status === 400 || response.status === 413 || response.status === 422;
      this.recordTest(
        `Malicious File Upload: ${file.name}`,
        testPassed,
        `Response status: ${response.status}`,
        testPassed ? null : {
          severity: file.name.includes('large') ? 'MEDIUM' : 'HIGH',
          description: `Malicious file ${file.name} was accepted`
        }
      );
    }

    // Test path traversal in filename
    const pathTraversalFiles = [
      '../../../etc/passwd',
      '..\\..\\windows\\system32\\config\\sam',
      'file.txt%00.exe',
      'file.txt\x00.exe'
    ];

    for (const filename of pathTraversalFiles) {
      const formData = new FormData();
      formData.append('file', Buffer.from('test content'), {
        filename,
        contentType: 'text/plain'
      });

      const response = await this.request({
        method: 'POST',
        url: `${this.baseUrl}/api/resume/upload`,
        headers: { 
          Authorization: `Bearer ${this.authToken}`,
        },
        data: formData
      });

      const testPassed = response.status === 400 || response.status === 422;
      this.recordTest(
        `Path Traversal in Filename: ${filename.substring(0, 20)}...`,
        testPassed,
        `Response status: ${response.status}`,
        testPassed ? null : {
          severity: 'HIGH',
          description: `Path traversal filename accepted: ${filename}`
        }
      );
    }
  }

  // 5. Test API Rate Limiting
  async testAPIRateLimiting() {
    console.log('\n⏱️ Testing API Rate Limiting...');

    // Test registration rate limiting
    const registrationPromises = [];
    for (let i = 0; i < 10; i++) {
      registrationPromises.push(
        this.request({
          method: 'POST',
          url: `${this.baseUrl}/api/auth/register`,
          data: {
            email: `test-${Date.now()}-${i}@example.com`,
            firstName: 'Test',
            lastName: 'User',
            password: 'TestPass123!'
          }
        })
      );
    }

    const responses = await Promise.all(registrationPromises);
    const rateLimitedCount = responses.filter(r => r.status === 429).length;

    const rateLimitTestPassed = rateLimitedCount > 0;
    this.recordTest(
      'Registration Rate Limiting',
      rateLimitTestPassed,
      `${rateLimitedCount} out of 10 requests were rate limited`,
      rateLimitTestPassed ? null : {
        severity: 'MEDIUM',
        description: 'No rate limiting on registration endpoint'
      }
    );

    // Test API endpoint rate limiting
    if (this.authToken) {
      const apiPromises = [];
      for (let i = 0; i < 50; i++) {
        apiPromises.push(
          this.request({
            method: 'GET',
            url: `${this.baseUrl}/api/resume/list`,
            headers: { Authorization: `Bearer ${this.authToken}` }
          })
        );
      }

      const apiResponses = await Promise.all(apiPromises);
      const apiRateLimitedCount = apiResponses.filter(r => r.status === 429).length;

      const apiRateLimitTestPassed = apiRateLimitedCount > 0;
      this.recordTest(
        'API Rate Limiting',
        apiRateLimitTestPassed,
        `${apiRateLimitedCount} out of 50 requests were rate limited`,
        apiRateLimitTestPassed ? null : {
          severity: 'MEDIUM',
          description: 'No rate limiting on API endpoints'
        }
      );
    }
  }

  // 6. Test CORS Configuration
  async testCORS() {
    console.log('\n🌐 Testing CORS Configuration...');

    // Test CORS headers
    const response = await this.request({
      method: 'OPTIONS',
      url: `${this.baseUrl}/api/auth/login`,
      headers: {
        'Origin': 'https://malicious-site.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    const corsHeaders = response.headers;
    const allowOrigin = corsHeaders['access-control-allow-origin'];
    
    const corsTestPassed = !allowOrigin || allowOrigin !== '*';
    this.recordTest(
      'CORS Wildcard Origin',
      corsTestPassed,
      `Access-Control-Allow-Origin: ${allowOrigin || 'not set'}`,
      corsTestPassed ? null : {
        severity: 'MEDIUM',
        description: 'CORS configured with wildcard origin (*)'
      }
    );
  }

  // 7. Test Information Disclosure
  async testInformationDisclosure() {
    console.log('\n🔍 Testing Information Disclosure...');

    // Test error responses for information leakage
    const response = await this.request({
      method: 'GET',
      url: `${this.baseUrl}/api/nonexistent-endpoint`
    });

    const responseStr = JSON.stringify(response.data);
    const containsStackTrace = responseStr.includes('at ') && responseStr.includes('.js:');
    const containsSystemInfo = responseStr.includes('node_modules') || responseStr.includes('Error:');

    const infoDisclosureTestPassed = !containsStackTrace && !containsSystemInfo;
    this.recordTest(
      'Error Information Disclosure',
      infoDisclosureTestPassed,
      `404 response contains system info: ${containsSystemInfo}`,
      infoDisclosureTestPassed ? null : {
        severity: 'LOW',
        description: 'Error responses contain sensitive system information'
      }
    );

    // Test server headers
    const serverHeader = response.headers['server'];
    const xPoweredBy = response.headers['x-powered-by'];
    
    const serverInfoTestPassed = !serverHeader && !xPoweredBy;
    this.recordTest(
      'Server Information Headers',
      serverInfoTestPassed,
      `Server: ${serverHeader || 'not set'}, X-Powered-By: ${xPoweredBy || 'not set'}`,
      serverInfoTestPassed ? null : {
        severity: 'LOW',
        description: 'Server headers expose technology stack information'
      }
    );
  }

  // Run all API security tests
  async runAllTests() {
    console.log('🔍 Starting API Security & Input Validation Testing...');
    console.log(`Target: ${this.baseUrl}`);

    // Try to authenticate first
    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      console.log('⚠️ Could not authenticate - some tests will be skipped');
    }

    await this.testSQLInjection();
    await this.testXSS();
    await this.testInputValidation();
    await this.testFileUploadSecurity();
    await this.testAPIRateLimiting();
    await this.testCORS();
    await this.testInformationDisclosure();

    return this.generateReport();
  }

  generateReport() {
    const { total, passed, failed, vulnerabilities } = this.results.summary;
    const passRate = ((passed / total) * 100).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('🛡️ API SECURITY TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} (${passRate}%)`);
    console.log(`Failed: ${failed}`);
    console.log(`Vulnerabilities Found: ${vulnerabilities.length}`);

    if (vulnerabilities.length > 0) {
      console.log('\n⚠️  VULNERABILITIES FOUND:');
      vulnerabilities.forEach((vuln, index) => {
        console.log(`${index + 1}. ${vuln.severity}: ${vuln.description}`);
      });
    } else {
      console.log('\n✅ NO VULNERABILITIES FOUND - API SECURITY IS ROBUST!');
    }

    let riskLevel = 'LOW';
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
    const highVulns = vulnerabilities.filter(v => v.severity === 'HIGH').length;

    if (criticalVulns > 0) {
      riskLevel = 'CRITICAL';
    } else if (highVulns > 0) {
      riskLevel = 'HIGH';
    } else if (vulnerabilities.length > 0) {
      riskLevel = 'MEDIUM';
    }

    console.log(`\n🎯 OVERALL RISK LEVEL: ${riskLevel}`);

    return {
      timestamp: new Date().toISOString(),
      summary: this.results.summary,
      riskLevel,
      tests: this.results.tests,
      recommendation: this.getRecommendation(riskLevel, vulnerabilities.length)
    };
  }

  getRecommendation(riskLevel, vulnCount) {
    if (riskLevel === 'CRITICAL') {
      return 'IMMEDIATE ACTION REQUIRED - Critical vulnerabilities that could lead to data breach';
    } else if (riskLevel === 'HIGH') {
      return 'HIGH PRIORITY - Significant security issues need immediate attention';
    } else if (riskLevel === 'MEDIUM') {
      return 'MEDIUM PRIORITY - Address security issues before production';
    } else {
      return 'SECURE - API security controls are effective';
    }
  }
}

// Main execution
async function main() {
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  const tester = new APIPenetrationTester(baseUrl);
  
  try {
    const report = await tester.runAllTests();
    
    // Save report
    const reportPath = path.join(__dirname, '../security-reports', 'api-pentest-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    process.exit(report.riskLevel === 'CRITICAL' || report.riskLevel === 'HIGH' ? 1 : 0);
    
  } catch (error) {
    console.error('❌ API penetration testing failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { APIPenetrationTester };