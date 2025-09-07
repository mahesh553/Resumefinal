#!/usr/bin/env node
/**
 * E2E Test Validation Script
 * Validates that all E2E test files are properly structured and can be parsed
 */

const fs = require('fs');
const path = require('path');

const e2eTestsDir = path.join(__dirname, '..', 'tests', 'e2e');

console.log('🔍 Validating E2E Test Files...\n');

// Check if E2E directory exists
if (!fs.existsSync(e2eTestsDir)) {
  console.error('❌ E2E tests directory not found:', e2eTestsDir);
  process.exit(1);
}

// Get all test files
const testFiles = fs.readdirSync(e2eTestsDir)
  .filter(file => file.endsWith('.spec.ts'))
  .sort();

console.log(`Found ${testFiles.length} E2E test files:\n`);

let totalTests = 0;
let validFiles = 0;

for (const file of testFiles) {
  const filePath = path.join(e2eTestsDir, file);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Count test cases
    const testMatches = content.match(/test\(/g) || [];
    const testCount = testMatches.length;
    totalTests += testCount;
    
    // Check for basic structure
    const hasDescribe = content.includes('test.describe(');
    const hasBeforeEach = content.includes('test.beforeEach(');
    const hasImports = content.includes('import { expect, test }');
    
    if (hasDescribe && hasImports) {
      validFiles++;
      console.log(`✅ ${file}`);
      console.log(`   - ${testCount} test cases`);
      console.log(`   - Has beforeEach: ${hasBeforeEach ? '✅' : '❌'}`);
    } else {
      console.log(`❌ ${file} - Missing required structure`);
    }
    
  } catch (error) {
    console.log(`❌ ${file} - Error reading file:`, error.message);
  }
  
  console.log('');
}

console.log('📊 Summary:');
console.log(`   - Total test files: ${testFiles.length}`);
console.log(`   - Valid test files: ${validFiles}`);
console.log(`   - Total test cases: ${totalTests}`);
console.log(`   - Success rate: ${((validFiles / testFiles.length) * 100).toFixed(1)}%`);

if (validFiles === testFiles.length) {
  console.log('\n🎉 All E2E test files are properly structured!');
  
  // List available test suites
  console.log('\n📋 Available Test Suites:');
  console.log('   npm run test:e2e              - Run all E2E tests');
  console.log('   npm run test:e2e:admin        - Run admin portal tests');
  console.log('   npm run test:e2e:permissions  - Run permission system tests');
  console.log('   npm run test:e2e:headed       - Run tests with browser UI');
  console.log('   npm run test:e2e:debug        - Run tests in debug mode');
  console.log('   npm run test:e2e:ui           - Run tests with Playwright UI');
  
  process.exit(0);
} else {
  console.log('\n❌ Some E2E test files have issues. Please fix before running tests.');
  process.exit(1);
}