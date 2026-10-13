const assert = require('assert');
const path = require('path');
const {
  findCategoryCommission,
  calculateCustomerPrice,
  processProductPricing,
  applyCommission
} = require('../Zudo-server/server/utils/pricing');

console.log('=====================================================');
console.log('   END-TO-END PRICING LOGIC VERIFICATION SUITE       ');
console.log('=====================================================\n');

// SCENARIO 1: Product Creation with ₹3,000 Seller Price & ₹2/unit Commission
console.log('Scenario 1: Seller enters Seller Price = ₹3,000, Commission = ₹2/unit');
{
  const categoryCommissions = [
    { categoryId: 'cat_electronics', unit: 'pcs', commissionType: 'flat', commissionValue: 2 }
  ];

  const sellerInput = {
    name: 'Wireless Headphones',
    categoryId: 'cat_electronics',
    unit: 'pcs',
    sellerPrice: 3000,
    sellerB2bPrice: 2700,
    commissionType: 'flat',
    commissionValue: 2,
    stock: 50,
    gstPercent: 18,
    b2c: [
      { packetSize: 'Standard', sellerPrice: 3000, stock: 30 },
      { packetSize: 'Pro', sellerPrice: 4000, stock: 20 }
    ],
    b2b: [
      {
        packetSize: 'Standard Bulk',
        sellerPrice: 2700,
        stock: 50,
        priceTiers: [
          { minQty: 10, sellerPrice: 2500 }
        ]
      }
    ]
  };

  const processed = processProductPricing(sellerInput, categoryCommissions);

  // 1. Database Storage Verification
  assert.strictEqual(processed.sellerPrice, 3000, 'DB stores sellerPrice as 3000');
  assert.strictEqual(processed.commissionValue, 2, 'DB stores commissionValue as 2');
  assert.strictEqual(processed.commissionAmount, 2, 'DB stores commissionAmount as 2');
  assert.strictEqual(processed.price, 3002, 'DB calculates customer price as 3002');
  assert.strictEqual(processed.sellerB2bPrice, 2700, 'DB stores sellerB2bPrice as 2700');
  assert.strictEqual(processed.b2bPrice, 2702, 'DB calculates customer B2B price as 2702');

  // Check variants
  assert.strictEqual(processed.b2c[0].sellerPrice, 3000);
  assert.strictEqual(processed.b2c[0].price, 3002);
  assert.strictEqual(processed.b2c[1].sellerPrice, 4000);
  assert.strictEqual(processed.b2c[1].price, 4002);
  assert.strictEqual(processed.b2b[0].priceTiers[0].sellerPrice, 2500);
  assert.strictEqual(processed.b2b[0].priceTiers[0].price, 2502);

  console.log('✓ Scenario 1.1: DB storage accurate.');
  console.log('  - Seller Price: ₹' + processed.sellerPrice);
  console.log('  - Commission: ₹' + processed.commissionValue + '/unit');
  console.log('  - Customer Price: ₹' + processed.price);

  // 2. Seller Panel Display
  // Seller Panel calls GET /api/sellers/products
  const sellerProductView = applyCommission(processed, categoryCommissions);
  assert.strictEqual(sellerProductView.sellerPrice, 3000, 'Seller panel sees sellerPrice = ₹3000');
  assert.strictEqual(sellerProductView.commissionValue, 2, 'Seller panel sees commission = ₹2');
  assert.strictEqual(sellerProductView.price, 3002, 'Seller panel sees customer display price = ₹3002');
  console.log('✓ Scenario 1.2: Seller Panel receives both Seller Price (₹3000) and Customer Price (₹3002)');

  // 3. Customer Application Display
  // Customer App calls GET /api/products
  const customerProductView = applyCommission(processed, categoryCommissions);
  assert.strictEqual(customerProductView.price, 3002, 'Customer sees ₹3002');
  console.log('✓ Scenario 1.3: Customer App displays Customer Price (₹3002)');

  // 4. Customer Checkout & Order Creation
  const orderQuantity = 3;
  const orderItem = {
    productId: 'prod_123',
    quantity: orderQuantity,
    price: customerProductView.price, // ₹3002
    normalPrice: customerProductView.sellerPrice, // ₹3000
    name: customerProductView.name
  };

  const customerTotal = orderItem.price * orderItem.quantity;
  const sellerPayoutTotal = orderItem.normalPrice * orderItem.quantity;
  const platformCommissionTotal = customerTotal - sellerPayoutTotal;

  assert.strictEqual(customerTotal, 9006, 'Customer pays ₹9,006 (3 x ₹3,002)');
  assert.strictEqual(sellerPayoutTotal, 9000, 'Seller payout is ₹9,000 (3 x ₹3,000)');
  assert.strictEqual(platformCommissionTotal, 6, 'Platform earns ₹6 commission (3 x ₹2)');
  console.log('✓ Scenario 1.4: Order totals match:');
  console.log('  - Customer Total: ₹' + customerTotal);
  console.log('  - Seller Payout Total: ₹' + sellerPayoutTotal);
  console.log('  - Platform Commission: ₹' + platformCommissionTotal);

  // 5. Seller Invoice Generation
  // Invoice calculates from order item normalPrice
  const invoiceTotal = orderItem.normalPrice * orderItem.quantity;
  assert.strictEqual(invoiceTotal, 9000, 'Invoice total matches seller payout exactly');
  console.log('✓ Scenario 1.5: Seller Invoice generated for ₹' + invoiceTotal);
}

// SCENARIO 2: Price Update by Seller (Ensuring NO duplicate inflation)
console.log('\nScenario 2: Seller updates price from ₹3,000 to ₹3,500');
{
  const categoryCommissions = [
    { categoryId: 'cat_electronics', unit: 'pcs', commissionType: 'flat', commissionValue: 2 }
  ];

  const existingProduct = {
    _id: 'prod_123',
    name: 'Wireless Headphones',
    categoryId: 'cat_electronics',
    unit: 'pcs',
    sellerPrice: 3000,
    commissionType: 'flat',
    commissionValue: 2,
    price: 3002
  };

  // Seller updates sellerPrice to 3500
  const updatePayload = {
    ...existingProduct,
    sellerPrice: 3500
  };

  const updated = processProductPricing(updatePayload, categoryCommissions);
  assert.strictEqual(updated.sellerPrice, 3500);
  assert.strictEqual(updated.price, 3502, 'New customer price is ₹3,502 (3500 + 2)');

  // Refresh page / reload product data
  const reloaded = applyCommission(updated, categoryCommissions);
  assert.strictEqual(reloaded.sellerPrice, 3500);
  assert.strictEqual(reloaded.price, 3502);

  // Reload 5 times to simulate multiple page refreshes
  let multiPass = reloaded;
  for (let i = 0; i < 5; i++) {
    multiPass = applyCommission(multiPass, categoryCommissions);
  }
  assert.strictEqual(multiPass.price, 3502, 'Price remains strictly ₹3,502 across multiple refreshes');
  console.log('✓ Scenario 2 Passed: Price update & page reload idempotent with ZERO inflation');
}

// SCENARIO 3: Admin Commission Following (Default when seller selects category)
console.log('\nScenario 3: Category with Admin Configured Percentage Commission (10%)');
{
  const categoryCommissions = [
    { categoryId: 'cat_clothing', unit: 'pcs', commissionType: 'percentage', commissionValue: 10 }
  ];

  const sellerInput = {
    name: 'Denim Jacket',
    categoryId: 'cat_clothing',
    unit: 'pcs',
    sellerPrice: 2000,
    // commissionType/commissionValue omitted to test admin rule auto-adoption
  };

  const processed = processProductPricing(sellerInput, categoryCommissions);
  assert.strictEqual(processed.commissionType, 'percentage');
  assert.strictEqual(processed.commissionValue, 10);
  assert.strictEqual(processed.commissionAmount, 200);
  assert.strictEqual(processed.price, 2200, 'Customer price is ₹2,200 (2000 + 10%)');
  console.log('✓ Scenario 3 Passed: Admin category percentage commission correctly inherited (₹2,000 + 10% = ₹2,200)');
}

// SCENARIO 4: Legacy Product Backwards Compatibility
console.log('\nScenario 4: Legacy product with only "price" in database');
{
  const categoryCommissions = [
    { categoryId: 'cat_groceries', unit: 'kg', commissionType: 'flat', commissionValue: 5 }
  ];

  const legacyProduct = {
    _id: 'prod_legacy',
    name: 'Old Sugar Bag',
    categoryId: 'cat_groceries',
    unit: 'kg',
    price: 50 // Legacy price
  };

  const enriched = applyCommission(legacyProduct, categoryCommissions);
  assert.strictEqual(enriched.sellerPrice, 50, 'Legacy price treated as seller base price');
  assert.strictEqual(enriched.price, 55, 'Customer price includes commission (50 + 5)');
  console.log('✓ Scenario 4 Passed: Existing products continue functioning seamlessly');
}

console.log('\n=====================================================');
console.log('   ALL END-TO-END PRICING VERIFICATIONS PASSED!       ');
console.log('=====================================================');
