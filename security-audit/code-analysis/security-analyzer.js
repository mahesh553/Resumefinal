#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Security analysis configuration
const SECURITY_PATTERNS = {
  // Hardcoded secrets and credentials
  secrets: [
    {
      name: 'Hardcoded API Keys',
      pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]\w{20,}['"]/gi,
      severity: 'HIGH',
      description: 'Potential hardcoded API key found'
    },
    {
      name: 'Hardcoded Passwords',
      pattern: /(?:password|pwd|passwd)\s*[:=]\s*['"]\w{6,}['"]/gi,
      severity: 'CRITICAL',
      description: 'Potential hardcoded password found'
    },
    {
      name: 'JWT Secrets',
      pattern: /(?:jwt[_-]?secret|secret[_-]?key)\s*[:=]\s*['"]\w{10,}['"]/gi,
      severity: 'HIGH',
      description: 'Potential hardcoded JWT secret found'
    },
    {
      name: 'Database URLs',
      pattern: /(?:database[_-]?url|db[_-]?url)\s*[:=]\s*['"][\w:/@.-]+['"]]/gi,
      severity: 'MEDIUM',
      description: 'Potential hardcoded database URL found'
    }
  ],

  // SQL Injection vulnerabilities
  sqlInjection: [
    {
      name: 'Raw SQL Queries',
      pattern: /\.query\s*\(\s*[`'"]\s*SELECT|UPDATE|INSERT|DELETE/gi,
      severity: 'HIGH',
      description: 'Potential raw SQL query that may be vulnerable to injection'
    },
    {
      name: 'String Concatenation in SQL',
      pattern: /[`'"].*SELECT.*[`'"]\s*\+\s*\w+/gi,
      severity: 'HIGH',
      description: 'SQL query with string concatenation - potential injection risk'
    }
  ],

  // XSS vulnerabilities
  xss: [
    {
      name: 'innerHTML Usage',
      pattern: /\.innerHTML\s*=\s*(?!['"`]\s*['"`])/gi,
      severity: 'MEDIUM',
      description: 'innerHTML usage without sanitization - potential XSS risk'
    },
    {
      name: 'Dangerous HTML Methods',
      pattern: /\.(outerHTML|insertAdjacentHTML)\s*=/gi,
      severity: 'MEDIUM',
      description: 'Dangerous HTML manipulation method - potential XSS risk'
    }
  ],

  // Authentication and authorization issues
  auth: [
    {
      name: 'Weak JWT Configuration',
      pattern: /jwt.*\{\s*expiresIn\s*:\s*['"](?:365d|999d|never|0)['"]/gi,
      severity: 'HIGH',
      description: 'JWT token with overly long or no expiration'
    },
    {
      name: 'Missing Authorization Checks',
      pattern: /@(Get|Post|Put|Delete|Patch)\s*\([^)]*\)\s*(?!.*@UseGuards)/gmi,
      severity: 'MEDIUM',
      description: 'API endpoint without explicit authorization guard'
    }
  ],

  // Crypto and encryption issues
  crypto: [
    {
      name: 'Weak Hash Algorithms',
      pattern: /\.(md5|sha1)\s*\(/gi,
      severity: 'MEDIUM',
      description: 'Usage of weak hash algorithm (MD5/SHA1)'
    },
    {
      name: 'Hardcoded Salt',
      pattern: /salt\s*[:=]\s*['"]\w+['"]/gi,
      severity: 'HIGH',
      description: 'Hardcoded salt in code'
    }
  ],

  // File upload security
  fileUpload: [
    {
      name: 'Unrestricted File Upload',
      pattern: /multer.*(?!.*fileFilter|.*limits)/gi,
      severity: 'HIGH',
      description: 'File upload without proper filtering or size limits'
    }
  ],

  // Environment and configuration issues
  config: [
    {
      name: 'Debug Mode in Production',
      pattern: /debug\s*[:=]\s*true/gi,
      severity: 'MEDIUM',
      description: 'Debug mode enabled - potential information disclosure'
    },
    {
      name: 'CORS Wildcard',
      pattern: /origin\s*:\s*['"]\*['"]/gi,
      severity: 'MEDIUM',
      description: 'CORS configured with wildcard origin'
    }
  ]
};

// File extensions to scan
const SCAN_EXTENSIONS = ['.ts', '.js', '.tsx', '.jsx'];

// Directories to exclude
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];

class SecurityAnalyzer {
  constructor() {
    this.findings = [];
    this.fileCount = 0;
    this.startTime = Date.now();
  }

  // Scan a single file for security issues
  scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Scan against all security patterns
    Object.keys(SECURITY_PATTERNS).forEach(category => {
      SECURITY_PATTERNS[category].forEach(pattern => {
        const matches = content.match(pattern.pattern);
        if (matches) {
          matches.forEach(match => {
            const lines = content.substring(0, content.indexOf(match)).split('\n');
            this.findings.push({
              file: relativePath,
              line: lines.length,
              category: category,
              name: pattern.name,
              severity: pattern.severity,
              description: pattern.description,
              evidence: match.trim(),
              timestamp: new Date().toISOString()
            });
          });
        }
      });
    });
  }

  // Recursively scan directory
  scanDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !EXCLUDE_DIRS.includes(item)) {
        this.scanDirectory(fullPath);
      } else if (stat.isFile() && SCAN_EXTENSIONS.includes(path.extname(item))) {
        this.scanFile(fullPath);
        this.fileCount++;
      }
    });
  }

  // Generate security report
  generateReport() {
    const duration = Date.now() - this.startTime;
    const severityCounts = this.findings.reduce((acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] || 0) + 1;
      return acc;
    }, {});

    const report = {
      summary: {
        totalFindings: this.findings.length,
        filesScanned: this.fileCount,
        scanDuration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        severityBreakdown: severityCounts
      },
      findings: this.findings,
      riskScore: this.calculateRiskScore(),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  // Calculate overall risk score
  calculateRiskScore() {
    const weights = { CRITICAL: 10, HIGH: 7, MEDIUM: 4, LOW: 1 };
    const totalScore = this.findings.reduce((score, finding) => {
      return score + (weights[finding.severity] || 0);
    }, 0);

    // Normalize to 1-10 scale
    const maxPossibleScore = this.fileCount * 10; // Assuming worst case
    const riskScore = Math.min(10, Math.round((totalScore / Math.max(maxPossibleScore * 0.1, 1)) * 10));
    
    return {
      score: riskScore,
      level: riskScore <= 3 ? 'LOW' : riskScore <= 6 ? 'MEDIUM' : 'HIGH',
      description: this.getRiskDescription(riskScore)
    };
  }

  getRiskDescription(score) {
    if (score <= 3) return 'Low security risk - minimal issues found';
    if (score <= 6) return 'Medium security risk - some issues require attention';
    return 'High security risk - critical issues need immediate attention';
  }

  // Generate security recommendations
  generateRecommendations() {
    const recommendations = [];
    const categories = [...new Set(this.findings.map(f => f.category))];
    
    if (categories.includes('secrets')) {
      recommendations.push({
        category: 'Secret Management',
        priority: 'HIGH',
        action: 'Move all hardcoded secrets to environment variables or secure vaults'
      });
    }

    if (categories.includes('sqlInjection')) {
      recommendations.push({
        category: 'SQL Injection Prevention',
        priority: 'CRITICAL',
        action: 'Use parameterized queries and ORM methods instead of raw SQL'
      });
    }

    if (categories.includes('auth')) {
      recommendations.push({
        category: 'Authentication Security',
        priority: 'HIGH',
        action: 'Implement proper authorization guards on all endpoints'
      });
    }

    if (categories.includes('xss')) {
      recommendations.push({
        category: 'XSS Prevention',
        priority: 'MEDIUM',
        action: 'Sanitize all user inputs and use safe DOM manipulation methods'
      });
    }

    return recommendations;
  }

  // Generate HTML report
  generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QoderResume Security Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; }
        .summary { background: #ecf0f1; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; border-radius: 8px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .critical { border-left: 5px solid #e74c3c; }
        .high { border-left: 5px solid #f39c12; }
        .medium { border-left: 5px solid #f1c40f; }
        .low { border-left: 5px solid #27ae60; }
        .finding { margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .severity { font-weight: bold; padding: 5px 10px; border-radius: 4px; color: white; }
        .severity.CRITICAL { background: #e74c3c; }
        .severity.HIGH { background: #f39c12; }
        .severity.MEDIUM { background: #f1c40f; color: #333; }
        .severity.LOW { background: #27ae60; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #34495e; color: white; }
        .risk-score { font-size: 2em; font-weight: bold; text-align: center; padding: 20px; }
        .risk-LOW { color: #27ae60; }
        .risk-MEDIUM { color: #f39c12; }
        .risk-HIGH { color: #e74c3c; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔒 QoderResume Security Analysis Report</h1>
        <p>Generated: ${report.summary.timestamp}</p>
        <p>Files Scanned: ${report.summary.filesScanned} | Findings: ${report.summary.totalFindings}</p>
    </div>

    <div class="summary">
        <h2>📊 Executive Summary</h2>
        <div class="risk-score risk-${report.riskScore.level}">
            Risk Score: ${report.riskScore.score}/10 (${report.riskScore.level})
        </div>
        <p>${report.riskScore.description}</p>
        
        <h3>Severity Breakdown</h3>
        <div class="metric critical">
            <strong>Critical</strong><br>
            ${report.summary.severityBreakdown.CRITICAL || 0}
        </div>
        <div class="metric high">
            <strong>High</strong><br>
            ${report.summary.severityBreakdown.HIGH || 0}
        </div>
        <div class="metric medium">
            <strong>Medium</strong><br>
            ${report.summary.severityBreakdown.MEDIUM || 0}
        </div>
        <div class="metric low">
            <strong>Low</strong><br>
            ${report.summary.severityBreakdown.LOW || 0}
        </div>
    </div>

    <div class="section">
        <h2>🎯 Key Recommendations</h2>
        ${report.recommendations.map(rec => `
        <div class="finding ${rec.priority.toLowerCase()}">
            <h4>${rec.category} (${rec.priority} Priority)</h4>
            <p>${rec.action}</p>
        </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>🔍 Detailed Findings</h2>
        ${report.findings.length === 0 ? '<p>✅ No security issues found!</p>' : ''}
        ${report.findings.map(finding => `
        <div class="finding">
            <div class="severity ${finding.severity}">${finding.severity}</div>
            <h4>${finding.name}</h4>
            <p><strong>File:</strong> ${finding.file}:${finding.line}</p>
            <p><strong>Category:</strong> ${finding.category}</p>
            <p><strong>Description:</strong> ${finding.description}</p>
            <p><strong>Evidence:</strong> <code>${finding.evidence}</code></p>
        </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>📈 Scan Statistics</h2>
        <table>
            <tr>
                <th>Metric</th>
                <th>Value</th>
            </tr>
            <tr>
                <td>Files Scanned</td>
                <td>${report.summary.filesScanned}</td>
            </tr>
            <tr>
                <td>Total Findings</td>
                <td>${report.summary.totalFindings}</td>
            </tr>
            <tr>
                <td>Scan Duration</td>
                <td>${report.summary.scanDuration}</td>
            </tr>
            <tr>
                <td>Risk Score</td>
                <td>${report.riskScore.score}/10 (${report.riskScore.level})</td>
            </tr>
        </table>
    </div>
</body>
</html>`;
    return html;
  }
}

// Main execution
function main() {
  console.log('🔒 Starting QoderResume Security Analysis...');
  
  const analyzer = new SecurityAnalyzer();
  const scanPaths = [
    path.join(process.cwd(), 'src'),
    path.join(process.cwd(), 'app'),
    path.join(process.cwd(), 'middleware.ts'),
    path.join(process.cwd(), 'next.config.js')
  ];

  // Scan all specified paths
  scanPaths.forEach(scanPath => {
    if (fs.existsSync(scanPath)) {
      if (fs.statSync(scanPath).isDirectory()) {
        analyzer.scanDirectory(scanPath);
      } else {
        analyzer.scanFile(scanPath);
        analyzer.fileCount++;
      }
    }
  });

  // Generate reports
  const report = analyzer.generateReport();
  
  // Save JSON report
  const jsonPath = path.join(__dirname, 'security-reports', 'code-analysis-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  
  // Save HTML report
  const htmlPath = path.join(__dirname, 'security-reports', 'code-analysis-report.html');
  const htmlReport = analyzer.generateHTMLReport(report);
  fs.writeFileSync(htmlPath, htmlReport);

  // Console output
  console.log(`\n✅ Security analysis completed!`);
  console.log(`📊 Files scanned: ${report.summary.filesScanned}`);
  console.log(`🔍 Total findings: ${report.summary.totalFindings}`);
  console.log(`⚠️  Risk score: ${report.riskScore.score}/10 (${report.riskScore.level})`);
  console.log(`📄 Reports generated:`);
  console.log(`   - JSON: ${jsonPath}`);
  console.log(`   - HTML: ${htmlPath}`);

  if (report.summary.totalFindings > 0) {
    console.log(`\n🎯 Top recommendations:`);
    report.recommendations.slice(0, 3).forEach(rec => {
      console.log(`   • ${rec.category}: ${rec.action}`);
    });
  }

  return report.riskScore.score <= 6; // Return true if risk is acceptable
}

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { SecurityAnalyzer, SECURITY_PATTERNS };