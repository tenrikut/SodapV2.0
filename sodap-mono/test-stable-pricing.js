// Test script for stable pricing functionality
const { PriceConverter } = require('./app/src/types/pricing');

console.log('🧪 Testing SODAP v2.0 Stable Pricing System\n');

// Test 1: Price conversion
console.log('1. Testing Price Conversions:');
try {
    // Assume 1 SOL = $100 USDC
    const solPriceUsd = 100;
    
    // Convert $50 USDC to SOL
    const usdcAmount = 50;
    const solAmount = PriceConverter.usdcToSol(usdcAmount, solPriceUsd);
    console.log(`   ✅ $${usdcAmount} USDC = ${solAmount} SOL`);
    
    // Convert back to verify
    const usdcFromSol = PriceConverter.solToUsdc(solAmount, solPriceUsd);
    console.log(`   ✅ ${solAmount} SOL = $${usdcFromSol} USDC`);
    
    if (Math.abs(usdcFromSol - usdcAmount) < 0.01) {
        console.log('   ✅ Conversion test PASSED\n');
    } else {
        console.log('   ❌ Conversion test FAILED\n');
    }
} catch (error) {
    console.log(`   ❌ Conversion test ERROR: ${error.message}\n`);
}

// Test 2: Price formatting
console.log('2. Testing Price Formatting:');
try {
    const testPrices = [
        { amount: 1.5, currency: 'SOL', expected: '1.5000 SOL' },
        { amount: 99.99, currency: 'USDC', expected: '$99.99' },
        { amount: 0.0001, currency: 'SOL', expected: '0.0001 SOL' },
        { amount: 1000.50, currency: 'USDC', expected: '$1000.50' }
    ];
    
    testPrices.forEach(test => {
        const formatted = PriceConverter.formatPriceForDisplay(test.amount, test.currency);
        const passed = formatted === test.expected;
        console.log(`   ${passed ? '✅' : '❌'} ${test.amount} ${test.currency} = "${formatted}" (expected: "${test.expected}")`);
    });
    console.log();
} catch (error) {
    console.log(`   ❌ Formatting test ERROR: ${error.message}\n`);
}

// Test 3: Total calculation
console.log('3. Testing Total Price Calculation:');
try {
    const mockProducts = [
        {
            name: 'Product 1',
            stablePricing: {
                usdcPrice: 25.00,
                solPrice: 0.25,
                lastUpdated: new Date(),
                isFixed: true
            }
        },
        {
            name: 'Product 2', 
            stablePricing: {
                usdcPrice: 50.00,
                solPrice: 0.50,
                lastUpdated: new Date(),
                isFixed: false
            }
        }
    ];
    
    const quantities = [2, 1]; // 2x Product 1, 1x Product 2
    
    const usdcTotal = PriceConverter.calculateTotalPrice(mockProducts, quantities, 'USDC');
    const solTotal = PriceConverter.calculateTotalPrice(mockProducts, quantities, 'SOL');
    
    console.log(`   ✅ USDC Total: $${usdcTotal} (2×$25 + 1×$50 = $100)`);
    console.log(`   ✅ SOL Total: ${solTotal} SOL (2×0.25 + 1×0.50 = 1.0 SOL)`);
    
    if (usdcTotal === 100 && solTotal === 1.0) {
        console.log('   ✅ Total calculation test PASSED\n');
    } else {
        console.log('   ❌ Total calculation test FAILED\n');
    }
} catch (error) {
    console.log(`   ❌ Total calculation test ERROR: ${error.message}\n`);
}

// Test 4: Stale pricing detection
console.log('4. Testing Stale Pricing Detection:');
try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - (61 * 60 * 1000)); // 61 minutes ago
    const recent = new Date(now.getTime() - (30 * 60 * 1000)); // 30 minutes ago
    
    const stalePricing = {
        usdcPrice: 100,
        solPrice: 1.0,
        lastUpdated: oneHourAgo,
        isFixed: false
    };
    
    const freshPricing = {
        usdcPrice: 100,
        solPrice: 1.0,
        lastUpdated: recent,
        isFixed: false
    };
    
    const fixedPricing = {
        usdcPrice: 100,
        solPrice: 1.0,
        lastUpdated: oneHourAgo,
        isFixed: true
    };
    
    const isStale1 = PriceConverter.isPricingStale(stalePricing);
    const isStale2 = PriceConverter.isPricingStale(freshPricing);
    const isStale3 = PriceConverter.isPricingStale(fixedPricing);
    
    console.log(`   ${isStale1 ? '✅' : '❌'} Old live pricing is stale: ${isStale1}`);
    console.log(`   ${!isStale2 ? '✅' : '❌'} Recent live pricing is fresh: ${!isStale2}`);
    console.log(`   ${!isStale3 ? '✅' : '❌'} Fixed pricing never stale: ${!isStale3}`);
    
    if (isStale1 && !isStale2 && !isStale3) {
        console.log('   ✅ Stale pricing detection test PASSED\n');
    } else {
        console.log('   ❌ Stale pricing detection test FAILED\n');
    }
} catch (error) {
    console.log(`   ❌ Stale pricing test ERROR: ${error.message}\n`);
}

// Test 5: Raw value conversion
console.log('5. Testing Raw Value Conversion:');
try {
    const humanReadable = {
        usdcPrice: 100.50,      // $100.50
        solPrice: 1.2345,       // 1.2345 SOL
        lastUpdated: new Date('2024-01-01T12:00:00Z'),
        isFixed: true
    };
    
    const rawValues = PriceConverter.toRawValues(humanReadable);
    console.log(`   ✅ USDC raw: ${rawValues.rawUsdcPrice} (${humanReadable.usdcPrice} * 1,000,000)`);
    console.log(`   ✅ SOL raw: ${rawValues.rawSolPrice} (${humanReadable.solPrice} * 1,000,000,000)`);
    console.log(`   ✅ Timestamp raw: ${rawValues.lastUpdated}`);
    
    const backConverted = PriceConverter.fromRawValues(
        rawValues.rawUsdcPrice,
        rawValues.rawSolPrice,
        rawValues.lastUpdated,
        humanReadable.isFixed
    );
    
    const usdcMatch = Math.abs(backConverted.usdcPrice - humanReadable.usdcPrice) < 0.01;
    const solMatch = Math.abs(backConverted.solPrice - humanReadable.solPrice) < 0.0001;
    
    console.log(`   ${usdcMatch ? '✅' : '❌'} USDC round-trip: ${backConverted.usdcPrice}`);
    console.log(`   ${solMatch ? '✅' : '❌'} SOL round-trip: ${backConverted.solPrice}`);
    
    if (usdcMatch && solMatch) {
        console.log('   ✅ Raw value conversion test PASSED\n');
    } else {
        console.log('   ❌ Raw value conversion test FAILED\n');
    }
} catch (error) {
    console.log(`   ❌ Raw value conversion test ERROR: ${error.message}\n`);
}

console.log('🎉 Stable Pricing Test Suite Complete!\n');
console.log('📊 Key Features Tested:');
console.log('   • USDC ↔ SOL conversion');
console.log('   • Price formatting for display');  
console.log('   • Multi-product total calculation');
console.log('   • Stale pricing detection');
console.log('   • Raw blockchain value conversion');
console.log('\n✨ Ready for integration with SODAP v2.0!');
