const assert = require('assert');
const path = require('path');
const {
  findCategoryCommission,
  calculateCustomerPrice,
  processProductPricing,
  applyCommission
} = require('../Zudo-server/server/utils/pricing');

console.log('--- RUNNING PRICING UNIT TESTS ---');

// Test 1: calculateCustomerPrice with flat commission
{
  const res = calculateCustomerPrice(3000, 'flat', 2);
  assert.strictEqual(res.customerPrice, 3002);
  assert.strictEqual(res.commissionAmount, 2);
  console.log('✓ Test 1 Passed: Seller price ₹3,000 + Flat commission ₹2 = ₹3,002 customer price');
}

// Test 2: calculateCustomerPrice with percentage commission
{
  const res = calculateCustomerPrice(3000, 'percentage', 5);
  assert.strictEqual(res.customerPrice, 3150);
  assert.strictEqual(res.commissionAmount, 150);
  console.log('✓ Test 2 Passed: Seller price ₹3,000 + 5% commission = ₹3,150 customer price');
}

// Test 3: Zero or invalid seller price
{
  const res = calculateCustomerPrice(0, 'flat', 2);
  assert.strictEqual(res.customerPrice, 0);
  assert.strictEqual(res.commissionAmount, 0);
  console.log('✓ Test 3 Passed: 0 seller price handled correctly');
}

// Test 4: findCategoryCommission with matching unit and fallback
{
  const mockCommissions = [
    { categoryId: 'cat1', unit: 'kg', commissionType: 'flat', commissionValue: 2 },
    { categoryId: 'cat1', unit: 'pcs', commissionType: 'percentage', commissionValue: 10 },
    { categoryId: 'cat2', unit: 'All', commissionType: 'flat', commissionValue: 5 }
  ];

  const matchKg = findCategoryCommission(mockCommissions, 'cat1', 'kg');
  assert.strictEqual(matchKg.commissionValue, 2);

  const matchPcs = findCategoryCommission(mockCommissions, 'cat1', 'pcs');
  assert.strictEqual(matchPcs.commissionValue, 10);

  const matchFallback = findCategoryCommission(mockCommissions, 'cat2', 'ltr');
  assert.strictEqual(matchFallback.commissionValue, 5);

  console.log('✓ Test 4 Passed: Category commission lookup & unit matching works');
}

// Test 5: processProductPricing for product creation with variants & tiers
{
  const payload = {
    name: 'Basmati Rice',
    categoryId: 'cat1',
    unit: 'kg',
    sellerPrice: 3000,
    sellerB2bPrice: 2800,
    commissionType: 'flat',
    commissionValue: 2,
    b2c: [
      { packetSize: '1kg', sellerPrice: 100 },
      { packetSize: '5kg', sellerPrice: 480 }
    ],
    b2b: [
      { packetSize: '25kg', sellerPrice: 2200, priceTiers: [{ minQty: 10, sellerPrice: 2100 }] }
    ]
  };

  const processed = processProductPricing(payload, []);
  assert.strictEqual(processed.sellerPrice, 3000);
  assert.strictEqual(processed.commissionValue, 2);
  assert.strictEqual(processed.price, 3002);
  assert.strictEqual(processed.sellerB2bPrice, 2800);
  assert.strictEqual(processed.b2bPrice, 2802);

  assert.strictEqual(processed.b2c[0].sellerPrice, 100);
  assert.strictEqual(processed.b2c[0].price, 102);
  assert.strictEqual(processed.b2c[1].sellerPrice, 480);
  assert.strictEqual(processed.b2c[1].price, 482);

  assert.strictEqual(processed.b2b[0].sellerPrice, 2200);
  assert.strictEqual(processed.b2b[0].price, 2202);
  assert.strictEqual(processed.b2b[0].priceTiers[0].sellerPrice, 2100);
  assert.strictEqual(processed.b2b[0].priceTiers[0].price, 2102);

  console.log('✓ Test 5 Passed: processProductPricing correctly calculates root, variant, and tier prices');
}

// Test 6: Idempotency of applyCommission (no duplicate inflation!)
{
  const mockCommissions = [
    { categoryId: 'cat1', unit: 'kg', commissionType: 'flat', commissionValue: 2 }
  ];

  const product = {
    _id: 'prod1',
    name: 'Rice',
    categoryId: 'cat1',
    unit: 'kg',
    sellerPrice: 3000,
    commissionType: 'flat',
    commissionValue: 2,
    price: 3002
  };

  const pass1 = applyCommission(product, mockCommissions);
  assert.strictEqual(pass1.price, 3002);

  const pass2 = applyCommission(pass1, mockCommissions);
  assert.strictEqual(pass2.price, 3002);

  const pass3 = applyCommission(pass2, mockCommissions);
  assert.strictEqual(pass3.price, 3002);

  console.log('✓ Test 6 Passed: applyCommission is 100% idempotent; no duplicate inflation on repeated runs');
}

// Test 7: Legacy product fallback
{
  const mockCommissions = [
    { categoryId: 'cat1', unit: 'pcs', commissionType: 'flat', commissionValue: 2 }
  ];

  const legacyProduct = {
    _id: 'prodLegacy',
    name: 'Old Item',
    categoryId: 'cat1',
    unit: 'pcs',
    price: 500 // Only has price, no sellerPrice
  };

  const enriched = applyCommission(legacyProduct, mockCommissions);
  assert.strictEqual(enriched.sellerPrice, 500);
  assert.strictEqual(enriched.price, 502);

  console.log('✓ Test 7 Passed: Legacy product without sellerPrice handled seamlessly');
}

console.log('--- ALL PRICING UNIT TESTS PASSED SUCCESSFULLY! ---');
