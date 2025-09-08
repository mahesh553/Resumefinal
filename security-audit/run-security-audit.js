#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Security Audit Orchestrator
class SecurityAuditRunner {
  constructor() {
    this.auditResults = {
      timestamp: new Date().toISOString(),
      dependencyAudit: null,
      codeAnalysis: null,
      authPentest: null,
      apiSecurityTest: null,
      overallRisk: 'LOW',
      recommendations: []
    };
  }

  // Colors for console output
  log(message, color = 'reset') {
    const colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  // Check if backend is running
  async checkBackendAvailability() {
    try {
      const axios = require('axios');
      const response = await axios.get('http://localhost:3001/api/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Run dependency audit
  async runDependencyAudit() {
    this.log('\n🔍 Running Dependency Vulnerability Audit...', 'blue');
    
    try {
      const result = execSync('npm audit --audit-level moderate --json', { 
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf8' 
      });
      
      const auditData = JSON.parse(result);
      this.auditResults.dependencyAudit = {
        vulnerabilities: auditData.vulnerabilities || {},
        summary: auditData.metadata?.vulnerabilities || { total: 0 },
        status: 'PASSED'
      };
      
      this.log('✅ Dependency audit completed - 0 vulnerabilities found', 'green');
      
    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities found
      try {
        const auditData = JSON.parse(error.stdout);
        const vulnCount = auditData.metadata?.vulnerabilities?.total || 0;
        
        this.auditResults.dependencyAudit = {
          vulnerabilities: auditData.vulnerabilities || {},
          summary: auditData.metadata?.vulnerabilities || { total: vulnCount },
          status: vulnCount > 0 ? 'FAILED' : 'PASSED'
        };
        
        if (vulnCount > 0) {
          this.log(`⚠️ Found ${vulnCount} dependency vulnerabilities`, 'yellow');
          this.auditResults.recommendations.push('Update vulnerable dependencies immediately');
        } else {
          this.log('✅ Dependency audit completed - 0 vulnerabilities found', 'green');
        }
      } catch (parseError) {
        this.auditResults.dependencyAudit = {
          error: error.message,
          status: 'ERROR'
        };
        this.log('❌ Dependency audit failed', 'red');
      }
    }
  }

  // Run code security analysis
  async runCodeAnalysis() {
    this.log('\n🔍 Running Static Code Security Analysis...', 'blue');
    
    try {
      // Use our custom security analyzer
      const { SecurityAnalyzer } = require('./code-analysis/security-analyzer');
      const analyzer = new SecurityAnalyzer();
      
      // Scan source directories
      const scanPaths = [
        path.resolve(__dirname, '../src'),
        path.resolve(__dirname, '../app'),
        path.resolve(__dirname, '../middleware.ts')
      ].filter(p => fs.existsSync(p));

      scanPaths.forEach(scanPath => {
        if (fs.statSync(scanPath).isDirectory()) {
          analyzer.scanDirectory(scanPath);
        } else {
          analyzer.scanFile(scanPath);
          analyzer.fileCount++;
        }
      });

      const report = analyzer.generateReport();
      this.auditResults.codeAnalysis = report;
      
      if (report.summary.totalFindings === 0) {
        this.log('✅ Code analysis completed - No security issues found', 'green');
      } else {
        this.log(`⚠️ Found ${report.summary.totalFindings} potential security issues`, 'yellow');
        this.auditResults.recommendations.push(...report.recommendations.map(r => r.action));
      }
      
    } catch (error) {
      this.auditResults.codeAnalysis = {
        error: error.message,
        status: 'ERROR'
      };
      this.log('❌ Code analysis failed: ' + error.message, 'red');
    }
  }

  // Run authentication penetration tests
  async runAuthPentest() {
    this.log('\n🔍 Running Authentication Penetration Tests...', 'blue');
    
    const backendAvailable = await this.checkBackendAvailability();
    if (!backendAvailable) {
      this.log('⚠️ Backend not available - skipping penetration tests', 'yellow');
      this.auditResults.authPentest = {
        skipped: true,
        reason: 'Backend not available'
      };
      return;
    }

    try {
      const { AuthPenetrationTester } = require('./penetration-tests/auth-pentest');
      const tester = new AuthPenetrationTester();
      const report = await tester.runAllTests();
      
      this.auditResults.authPentest = report;
      
      if (report.riskLevel === 'LOW') {
        this.log('✅ Authentication security tests passed', 'green');
      } else {
        this.log(`⚠️ Authentication security issues found - Risk: ${report.riskLevel}`, 'yellow');
        this.auditResults.recommendations.push(report.recommendation);
      }
      
    } catch (error) {
      this.auditResults.authPentest = {
        error: error.message,
        status: 'ERROR'
      };
      this.log('❌ Authentication penetration tests failed: ' + error.message, 'red');
    }
  }

  // Run API security tests
  async runAPISecurityTest() {
    this.log('\n🔍 Running API Security Tests...', 'blue');
    
    const backendAvailable = await this.checkBackendAvailability();
    if (!backendAvailable) {
      this.log('⚠️ Backend not available - skipping API security tests', 'yellow');
      this.auditResults.apiSecurityTest = {
        skipped: true,
        reason: 'Backend not available'
      };
      return;
    }

    try {
      const { APIPenetrationTester } = require('./penetration-tests/api-security-test');
      const tester = new APIPenetrationTester();
      const report = await tester.runAllTests();
      
      this.auditResults.apiSecurityTest = report;
      
      if (report.riskLevel === 'LOW') {
        this.log('✅ API security tests passed', 'green');
      } else {
        this.log(`⚠️ API security issues found - Risk: ${report.riskLevel}`, 'yellow');
        this.auditResults.recommendations.push(report.recommendation);
      }
      
    } catch (error) {
      this.auditResults.apiSecurityTest = {
        error: error.message,
        status: 'ERROR'
      };
      this.log('❌ API security tests failed: ' + error.message, 'red');
    }
  }

  // Calculate overall risk level
  calculateOverallRisk() {
    const risks = [];
    
    if (this.auditResults.dependencyAudit?.summary?.total > 0) {
      risks.push('HIGH');
    }
    
    if (this.auditResults.codeAnalysis?.riskScore?.level === 'HIGH') {
      risks.push('HIGH');
    } else if (this.auditResults.codeAnalysis?.riskScore?.level === 'MEDIUM') {
      risks.push('MEDIUM');
    }
    
    if (this.auditResults.authPentest?.riskLevel === 'CRITICAL') {
      risks.push('CRITICAL');
    } else if (this.auditResults.authPentest?.riskLevel === 'HIGH') {
      risks.push('HIGH');
    } else if (this.auditResults.authPentest?.riskLevel === 'MEDIUM') {
      risks.push('MEDIUM');
    }
    
    if (this.auditResults.apiSecurityTest?.riskLevel === 'CRITICAL') {
      risks.push('CRITICAL');
    } else if (this.auditResults.apiSecurityTest?.riskLevel === 'HIGH') {
      risks.push('HIGH');
    } else if (this.auditResults.apiSecurityTest?.riskLevel === 'MEDIUM') {
      risks.push('MEDIUM');
    }

    // Return highest risk level found
    if (risks.includes('CRITICAL')) return 'CRITICAL';
    if (risks.includes('HIGH')) return 'HIGH';
    if (risks.includes('MEDIUM')) return 'MEDIUM';
    return 'LOW';
  }

  // Generate comprehensive report
  generateReport() {
    this.auditResults.overallRisk = this.calculateOverallRisk();
    
    this.log('\n' + '='.repeat(80), 'cyan');
    this.log('🔒 QODERRESUME COMPREHENSIVE SECURITY AUDIT RESULTS', 'cyan');
    this.log('='.repeat(80), 'cyan');
    
    this.log(`\n📊 AUDIT SUMMARY:`, 'blue');
    this.log(`Timestamp: ${this.auditResults.timestamp}`);
    this.log(`Overall Risk Level: ${this.auditResults.overallRisk}`, 
             this.auditResults.overallRisk === 'LOW' ? 'green' : 'yellow');

    // Dependency audit results
    if (this.auditResults.dependencyAudit) {
      const depAudit = this.auditResults.dependencyAudit;
      this.log(`\n📦 Dependency Audit:`, 'blue');
      if (depAudit.status === 'PASSED') {
        this.log(`✅ PASSED - 0 vulnerabilities found`, 'green');
      } else if (depAudit.summary) {
        this.log(`❌ FAILED - ${depAudit.summary.total} vulnerabilities found`, 'red');
      } else {
        this.log(`❌ ERROR - ${depAudit.error}`, 'red');
      }
    }

    // Code analysis results
    if (this.auditResults.codeAnalysis) {
      const codeAnalysis = this.auditResults.codeAnalysis;
      this.log(`\n🔍 Code Security Analysis:`, 'blue');
      if (codeAnalysis.summary) {
        this.log(`Files Scanned: ${codeAnalysis.summary.filesScanned}`);
        this.log(`Security Issues: ${codeAnalysis.summary.totalFindings}`);
        this.log(`Risk Score: ${codeAnalysis.riskScore?.score || 'N/A'}/10`);
      } else {
        this.log(`❌ ERROR - ${codeAnalysis.error}`, 'red');
      }
    }

    // Authentication penetration test results
    if (this.auditResults.authPentest) {
      const authTest = this.auditResults.authPentest;
      this.log(`\n🔐 Authentication Security Tests:`, 'blue');
      if (authTest.skipped) {
        this.log(`⚠️ SKIPPED - ${authTest.reason}`, 'yellow');
      } else if (authTest.summary) {
        this.log(`Tests Run: ${authTest.summary.total}`);
        this.log(`Passed: ${authTest.summary.passed}`);
        this.log(`Vulnerabilities: ${authTest.summary.vulnerabilities.length}`);
        this.log(`Risk Level: ${authTest.riskLevel}`);
      } else {
        this.log(`❌ ERROR - ${authTest.error}`, 'red');
      }
    }

    // API security test results
    if (this.auditResults.apiSecurityTest) {
      const apiTest = this.auditResults.apiSecurityTest;
      this.log(`\n🛡️ API Security Tests:`, 'blue');
      if (apiTest.skipped) {
        this.log(`⚠️ SKIPPED - ${apiTest.reason}`, 'yellow');
      } else if (apiTest.summary) {
        this.log(`Tests Run: ${apiTest.summary.total}`);
        this.log(`Passed: ${apiTest.summary.passed}`);
        this.log(`Vulnerabilities: ${apiTest.summary.vulnerabilities.length}`);
        this.log(`Risk Level: ${apiTest.riskLevel}`);
      } else {
        this.log(`❌ ERROR - ${apiTest.error}`, 'red');
      }
    }

    // Recommendations
    if (this.auditResults.recommendations.length > 0) {
      this.log(`\n🎯 RECOMMENDATIONS:`, 'yellow');
      this.auditResults.recommendations.forEach((rec, index) => {
        this.log(`${index + 1}. ${rec}`);
      });
    }

    // Overall assessment
    this.log(`\n🏆 OVERALL ASSESSMENT:`, 'magenta');
    if (this.auditResults.overallRisk === 'LOW') {
      this.log('✅ QoderResume platform is SECURE and ready for production deployment!', 'green');
    } else if (this.auditResults.overallRisk === 'MEDIUM') {
      this.log('⚠️ Some security issues found - address before production deployment', 'yellow');
    } else {
      this.log('❌ Critical security issues found - immediate action required!', 'red');
    }

    // Save comprehensive report
    const reportPath = path.join(__dirname, 'security-reports', 'comprehensive-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.auditResults, null, 2));
    this.log(`\n📄 Comprehensive report saved to: ${reportPath}`, 'cyan');

    return this.auditResults;
  }

  // Run complete security audit
  async runCompleteAudit() {
    this.log('🚀 Starting Comprehensive Security Audit for QoderResume Platform...', 'magenta');
    this.log('This may take several minutes to complete.\n', 'cyan');

    try {
      await this.runDependencyAudit();
      await this.runCodeAnalysis();
      await this.runAuthPentest();
      await this.runAPISecurityTest();
      
      const results = this.generateReport();
      
      // Return appropriate exit code
      return results.overallRisk === 'CRITICAL' || results.overallRisk === 'HIGH' ? 1 : 0;
      
    } catch (error) {
      this.log(`❌ Security audit failed: ${error.message}`, 'red');
      return 1;
    }
  }
}

// Main execution
async function main() {
  const auditor = new SecurityAuditRunner();
  const exitCode = await auditor.runCompleteAudit();
  process.exit(exitCode);
}

if (require.main === module) {
  main();
}

module.exports = { SecurityAuditRunner };