#!/usr/bin/env node

console.log('🔒 Starting QoderResume Security Analysis...');

const fs = require('fs');
const path = require('path');

// Simple security scanner
class SimpleSecurityScanner {
  constructor() {
    this.findings = [];
    this.files = [];
  }

  scanForSecrets(content, filePath) {
    const patterns = [
      { name: 'API Keys', regex: /api[_-]?key\s*[:=]\s*['"]\w{20,}['"]/gi, severity: 'HIGH' },
      { name: 'Passwords', regex: /password\s*[:=]\s*['"]\w{6,}['"]/gi, severity: 'CRITICAL' },
      { name: 'JWT Secrets', regex: /jwt[_-]?secret\s*[:=]\s*['"]\w{10,}['"]/gi, severity: 'HIGH' }
    ];

    patterns.forEach(pattern => {
      const matches = content.match(pattern.regex);
      if (matches) {
        this.findings.push({
          file: filePath,
          type: pattern.name,
          severity: pattern.severity,
          count: matches.length
        });
      }
    });
  }

  scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.scanForSecrets(content, filePath);
      this.files.push(filePath);
    } catch (err) {
      console.log(`Warning: Could not read ${filePath}`);
    }
  }

  scanDirectory(dirPath) {
    try {
      const items = fs.readdirSync(dirPath);
      items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !['node_modules', '.git', 'dist'].includes(item)) {
          this.scanDirectory(fullPath);
        } else if (stat.isFile() && ['.ts', '.js', '.tsx', '.jsx'].includes(path.extname(item))) {
          this.scanFile(fullPath);
        }
      });
    } catch (err) {
      console.log(`Warning: Could not access ${dirPath}`);
    }
  }

  generateReport() {
    console.log(`\n📊 Security Scan Results:`);
    console.log(`Files scanned: ${this.files.length}`);
    console.log(`Security findings: ${this.findings.length}`);
    
    if (this.findings.length === 0) {
      console.log('✅ No security issues found!');
    } else {
      console.log('\n⚠️  Security Issues Found:');
      this.findings.forEach(finding => {
        console.log(`  • ${finding.severity}: ${finding.type} in ${finding.file} (${finding.count} occurrences)`);
      });
    }

    return {
      filesScanned: this.files.length,
      findings: this.findings,
      riskLevel: this.findings.length === 0 ? 'LOW' : this.findings.some(f => f.severity === 'CRITICAL') ? 'HIGH' : 'MEDIUM'
    };
  }
}

// Main execution
const scanner = new SimpleSecurityScanner();

// Scan main directories
const basePath = path.resolve(process.cwd(), '..');
console.log(`Scanning from: ${basePath}`);

[
  path.join(basePath, 'src'),
  path.join(basePath, 'app'),
  path.join(basePath, 'middleware.ts')
].forEach(scanPath => {
  if (fs.existsSync(scanPath)) {
    console.log(`Scanning: ${scanPath}`);
    if (fs.statSync(scanPath).isDirectory()) {
      scanner.scanDirectory(scanPath);
    } else {
      scanner.scanFile(scanPath);
    }
  }
});

const report = scanner.generateReport();

// Save simple report
const reportPath = path.join(__dirname, 'security-reports', 'simple-security-report.json');
try {
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);
} catch (err) {
  console.log(`Could not save report: ${err.message}`);
}

console.log('\n🎯 Security Analysis Complete!');
process.exit(report.riskLevel === 'HIGH' ? 1 : 0);