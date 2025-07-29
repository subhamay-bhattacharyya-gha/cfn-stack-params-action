#!/usr/bin/env node

/**
 * Simple test runner script for comprehensive testing
 * This script runs different test suites and provides detailed reporting
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`${title}`, colors.cyan + colors.bright);
  log(`${'='.repeat(60)}`, colors.cyan);
}

function logSubsection(title) {
  log(`\n${'-'.repeat(40)}`, colors.blue);
  log(`${title}`, colors.blue + colors.bright);
  log(`${'-'.repeat(40)}`, colors.blue);
}

async function runCommand(command, description) {
  log(`\n🚀 ${description}...`, colors.yellow);
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    log(`✅ ${description} completed successfully`, colors.green);
    return { success: true, output };
  } catch (error) {
    log(`❌ ${description} failed:`, colors.red);
    log(error.stdout || error.message, colors.red);
    return { success: false, error: error.stdout || error.message };
  }
}

async function checkTestFixtures() {
  logSubsection('Validating Test Fixtures');
  
  const fixtures = [
    'test/fixtures/valid-config',
    'test/fixtures/complex-config',
    'test/fixtures/empty-params',
    'test/fixtures/invalid-json',
    'test/fixtures/invalid-params',
    'test/fixtures/missing-config',
    'test/fixtures/missing-default-params',
    'test/fixtures/missing-required-fields'
  ];
  
  let allValid = true;
  
  for (const fixture of fixtures) {
    try {
      const stats = await fs.stat(fixture);
      if (stats.isDirectory()) {
        log(`✅ Fixture exists: ${fixture}`, colors.green);
      } else {
        log(`❌ Fixture is not a directory: ${fixture}`, colors.red);
        allValid = false;
      }
    } catch (error) {
      log(`❌ Fixture missing: ${fixture}`, colors.red);
      allValid = false;
    }
  }
  
  return allValid;
}

async function runTestSuite() {
  logSection('GitHub CloudFormation Action - Comprehensive Test Suite');
  
  // Check test fixtures
  const fixturesValid = await checkTestFixtures();
  if (!fixturesValid) {
    log('\n❌ Test fixtures validation failed. Please ensure all fixtures are properly set up.', colors.red);
    process.exit(1);
  }
  
  const results = {
    unit: null,
    integration: null,
    endToEnd: null,
    coverage: null
  };
  
  // Run unit tests
  logSubsection('Unit Tests');
  results.unit = await runCommand(
    'npx vitest run test/unit --reporter=verbose',
    'Running unit tests'
  );
  
  // Run integration tests
  logSubsection('Integration Tests');
  results.integration = await runCommand(
    'npx vitest run test/integration --reporter=verbose',
    'Running integration tests'
  );
  
  // Run all tests with coverage
  logSubsection('Coverage Analysis');
  results.coverage = await runCommand(
    'npx vitest run --coverage --reporter=verbose',
    'Running all tests with coverage analysis'
  );
  
  // Generate test summary
  logSection('Test Results Summary');
  
  const testResults = [
    { name: 'Unit Tests', result: results.unit },
    { name: 'Integration Tests', result: results.integration },
    { name: 'Coverage Analysis', result: results.coverage }
  ];
  
  let allPassed = true;
  
  testResults.forEach(({ name, result }) => {
    if (result.success) {
      log(`✅ ${name}: PASSED`, colors.green);
    } else {
      log(`❌ ${name}: FAILED`, colors.red);
      allPassed = false;
    }
  });
  
  // Check if coverage reports were generated
  try {
    await fs.access('coverage/index.html');
    log(`📊 Coverage report generated: coverage/index.html`, colors.cyan);
  } catch (error) {
    log(`⚠️  Coverage report not found`, colors.yellow);
  }
  
  try {
    await fs.access('test-results.json');
    log(`📋 Test results JSON generated: test-results.json`, colors.cyan);
  } catch (error) {
    log(`⚠️  Test results JSON not found`, colors.yellow);
  }
  
  logSection('Test Execution Complete');
  
  if (allPassed) {
    log('🎉 All tests passed successfully!', colors.green + colors.bright);
    log('📈 Check the coverage report for detailed analysis', colors.cyan);
    process.exit(0);
  } else {
    log('💥 Some tests failed. Please review the output above.', colors.red + colors.bright);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log(`\n💥 Uncaught Exception: ${error.message}`, colors.red);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`\n💥 Unhandled Rejection at: ${promise}, reason: ${reason}`, colors.red);
  process.exit(1);
});

// Run the test suite
runTestSuite().catch((error) => {
  log(`\n💥 Test suite execution failed: ${error.message}`, colors.red);
  process.exit(1);
});