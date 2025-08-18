#!/usr/bin/env node

/**
 * Devnet Test Runner
 * Runs tests against existing deployed program without redeployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runDevnetTests() {
  console.log('🚀 Starting SoDap Devnet Tests...\n');

  // Check if program is already deployed
  const anchorToml = fs.readFileSync('Anchor.toml', 'utf8');
  const programIdMatch = anchorToml.match(/sodap = "([^"]+)"/);
  const programId = programIdMatch ? programIdMatch[1] : null;

  if (!programId) {
    console.error('❌ Program ID not found in Anchor.toml');
    process.exit(1);
  }

  console.log(`📋 Program ID: ${programId}`);
  console.log(`🌐 Cluster: devnet`);
  console.log(`⏭️  Skipping deployment (using existing program)\n`);

  try {
  // Set environment variables for Anchor
  process.env.ANCHOR_PROVIDER_URL = 'https://api.devnet.solana.com';
  process.env.ANCHOR_WALLET = '/Users/tamkin/.config/solana/id.json';
  
  // Run only the devnet integration test first
  console.log('🧪 Running devnet connectivity test...');
  execSync('npx ts-mocha -p ./tsconfig.json -t 60000 tests/devnet-integration-test.ts', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      ANCHOR_PROVIDER_URL: 'https://api.devnet.solana.com',
      ANCHOR_WALLET: '/Users/tamkin/.config/solana/id.json'
    }
  });
  
  console.log('\n✅ Devnet connectivity test passed!');
  
  // Get all existing test files from tests directory
  const testsDir = './tests';
  const allTestFiles = fs.readdirSync(testsDir)
    .filter(file => file.endsWith('.ts') && 
            !file.includes('devnet-integration-test') && 
            !file.includes('simple-connection-test') &&
            !file.includes('test-config') &&
            !file.includes('user-story') &&
            !file.includes('bnpl_loyalty_integration'))
    .map(file => path.join(testsDir, file));
  
  console.log(`\n🚀 Running all existing tests (${allTestFiles.length} test files)...\n`);
  console.log('Test files to run:', allTestFiles.map(f => path.basename(f)).join(', '));
  console.log('');
  
  let passedTests = 0;
  let failedTests = 0;
  
  const testOptions = {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      ANCHOR_PROVIDER_URL: 'https://api.devnet.solana.com',
      ANCHOR_WALLET: '/Users/tamkin/.config/solana/id.json'
    }
  };
  
  for (const testFile of allTestFiles) {
    const testName = path.basename(testFile, '.ts');
    console.log(`📋 Running ${testName} tests...`);
    
    try {
      execSync(`npx ts-mocha -p ./tsconfig.json -t 120000 ${testFile}`, testOptions);
      console.log(`✅ ${testName} tests passed!\n`);
      passedTests++;
      
      // Add delay between test files to avoid rate limiting
      if (testFile !== allTestFiles[allTestFiles.length - 1]) {
        console.log('⏳ Waiting 3 seconds to avoid rate limiting...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.error(`❌ ${testName} tests failed`);
      console.error('Error details:', error.message.split('\n')[0]);
      failedTests++;
      console.log('');
      
      // Continue with other tests instead of stopping
      if (testFile !== allTestFiles[allTestFiles.length - 1]) {
        console.log('⏳ Waiting 3 seconds before next test...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  
  console.log(`\n📊 Test Results Summary:`);
  console.log(`✅ Passed: ${passedTests}/${allTestFiles.length}`);
  console.log(`❌ Failed: ${failedTests}/${allTestFiles.length}`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All existing tests passed on devnet!');
  } else {
    console.log(`\n⚠️  ${failedTests} test file(s) had issues. Check details above.`);
  }
  
  } catch (error) {
    console.error('\n❌ Test runner failed:', error.message);
    
    if (error.message.includes('429')) {
      console.log('\n💡 Rate limiting detected. Try again in a few minutes.');
      console.log('💡 Consider using a private RPC endpoint for heavy testing.');
    }
    
    process.exit(1);
  }
}

// Run the tests
runDevnetTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
