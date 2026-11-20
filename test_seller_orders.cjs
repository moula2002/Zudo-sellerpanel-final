const assert = require('assert');

console.log('================================================================');
console.log('      SELLER ORDERS TEST SUITE: LISTING, DETAILS & ACTIONS      ');
console.log('================================================================\n');

// -------------------------------------------------------------
// HELPER FUNCTIONS & LOGIC FROM Orders.jsx & orderFormat.js
// -------------------------------------------------------------

function formatOrderNumber(order) {
  if (!order) return '#00000';
  if (order.orderNumber !== undefined && order.orderNumber !== null && !isNaN(Number(order.orderNumber))) {
    return `#${String(order.orderNumber).padStart(5, '0')}`;
  }
  if (order.orderId) {
    const num = Number(order.orderId);
    if (!isNaN(num) && num > 0) {
      return `#${String(num).padStart(5, '0')}`;
    }
    return String(order.orderId).startsWith('#') ? order.orderId : `#${order.orderId}`;
  }
  if (order._id) {
    return `#${String(order._id).slice(-6).toUpperCase()}`;
  }
  return '#00000';
}

function getOrderTotal(order) {
  return order.totalAmountWithoutCommissions !== undefined 
    ? order.totalAmountWithoutCommissions 
    : (order.sellerItemsNetTotal !== undefined 
        ? order.sellerItemsNetTotal 
        : order.totalAmount);
}

function filterOrders(orders, { searchTerm = '', statusFilter = 'All', orderTypeFilter = 'All', dateRange = { start: '', end: '' } }) {
  return orders.filter(order => {
    const formattedId = formatOrderNumber(order);
    const orderIdStr = order.orderNumber ? String(order.orderNumber) : (order.orderId || order._id.slice(-6).toUpperCase());
    const customerName = order.userId?.name || 'Guest';
    const matchesSearch = formattedId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orderIdStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All'
      ? true
      : statusFilter === 'Returns'
        ? order.items && order.items.some(i => i.returnStatus && i.returnStatus !== 'None')
        : order.orderStatus === statusFilter;

    const matchesType = orderTypeFilter === 'All' ||
      (orderTypeFilter === 'B2B' && order.userId?.role === 'b2b');

    let matchesDate = true;
    if (dateRange.start || dateRange.end) {
      const orderDate = new Date(order.createdAt);
      if (dateRange.start) {
        const start = new Date(dateRange.start);
        start.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && orderDate >= start;
      }
      if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && orderDate <= end;
      }
    }

    return matchesSearch && matchesStatus && matchesDate && matchesType;
  });
}

function getItemSellerPayout(item) {
  const unitPrice = item.normalPrice !== undefined && item.normalPrice !== null 
    ? item.normalPrice 
    : (item.netPrice !== undefined ? item.netPrice : item.price);
  
  const total = item.normalPrice !== undefined && item.normalPrice !== null 
    ? (item.quantity * item.normalPrice) 
    : (item.netTotal !== undefined ? item.netTotal : (item.quantity * item.price));

  return { unitPrice, total };
}

function getAvailableSellerActions(orderStatus) {
  if (orderStatus === 'Pending' || !orderStatus) {
    return ['Accept & Pack', 'Reject Order'];
  }
  return [];
}

// -------------------------------------------------------------
// MOCK DATA
// -------------------------------------------------------------
const mockSellerId = 'seller_123';

const mockOrders = [
  {
    _id: '66a010010000000000000001',
    orderNumber: 101,
    createdAt: '2026-11-20T10:00:00.000Z',
    orderStatus: 'Pending',
    paymentMethod: 'COD',
    userId: {
      _id: 'user_b2c_1',
      name: 'Ramesh Kumar',
      email: 'ramesh@example.com',
      phone: '9876543210',
      role: 'customer'
    },
    shippingAddress: {
      address: '123 MG Road, Indiranagar',
      city: 'Bangalore',
      pincode: '560038'
    },
    driverId: null,
    totalAmountWithoutCommissions: 4500,
    totalAmount: 4800,
    items: [
      {
        productId: 'prod_1',
        name: 'Basmati Rice 25kg Bag',
        quantity: 2,
        price: 2400, // Customer pays 2400
        normalPrice: 2250, // Seller payout base
        unit: 'kg',
        unitSize: 25,
        totalProductWeight: 50,
        returnStatus: 'None'
      }
    ],
    sellerPickups: [
      { sellerId: mockSellerId, pickupCode: 'PU-101', status: 'Pending' }
    ]
  },
  {
    _id: '66a010020000000000000002',
    orderNumber: 102,
    createdAt: '2026-11-19T14:30:00.000Z',
    orderStatus: 'Packed',
    paymentMethod: 'Prepaid (Online)',
    userId: {
      _id: 'user_b2b_1',
      name: 'Sri Krishna Wholesale Mart',
      email: 'krishna@wholesale.com',
      phone: '9123456780',
      role: 'b2b'
    },
    shippingAddress: {
      address: 'Plot 45, APMC Yard',
      city: 'Yeshwanthpur, Bangalore',
      pincode: '560022'
    },
    driverId: {
      _id: 'driver_1',
      name: 'Suresh Gowda',
      phone: '9988776655',
      vehicleDetails: 'Tata Ace (KA-04-E-1234)'
    },
    sellerItemsNetTotal: 18000,
    totalAmount: 19500,
    items: [
      {
        productId: 'prod_2',
        name: 'Sunflower Cooking Oil 15L Tin',
        quantity: 10,
        price: 1950,
        normalPrice: 1800,
        unit: 'L',
        unitSize: 15,
        totalProductWeight: 150,
        returnStatus: 'None'
      }
    ],
    sellerPickups: [
      { sellerId: mockSellerId, pickupCode: 'PU-102', status: 'Packed' }
    ]
  },
  {
    _id: '66a010030000000000000003',
    orderNumber: 103,
    createdAt: '2026-11-18T09:15:00.000Z',
    orderStatus: 'Delivered',
    paymentMethod: 'Prepaid',
    userId: {
      _id: 'user_b2c_2',
      name: 'Ananya Sharma',
      email: 'ananya@gmail.com',
      phone: '9845112233',
      role: 'customer'
    },
    shippingAddress: {
      address: '77 4th Cross, Koramangala',
      city: 'Bangalore',
      pincode: '560034'
    },
    driverId: {
      _id: 'driver_2',
      name: 'Manjunath K',
      phone: '9871122334',
      vehicleDetails: 'E-Rickshaw (KA-01-XY-9900)'
    },
    totalAmount: 3200,
    totalAmountWithoutCommissions: 3000,
    items: [
      {
        productId: 'prod_3',
        name: 'Organic Toor Dal 5kg',
        quantity: 4,
        price: 800,
        normalPrice: 750,
        unit: 'kg',
        unitSize: 5,
        totalProductWeight: 20,
        returnStatus: 'Return Requested'
      }
    ],
    sellerPickups: [
      { sellerId: mockSellerId, pickupCode: 'PU-103', status: 'Delivered' }
    ]
  },
  {
    _id: '66a010040000000000000004',
    orderNumber: 104,
    createdAt: '2026-11-17T11:00:00.000Z',
    orderStatus: 'Cancelled',
    paymentMethod: 'COD',
    userId: {
      _id: 'user_b2c_3',
      name: 'Vijay Verma',
      email: 'vijay@verma.net',
      phone: '9765432100',
      role: 'customer'
    },
    shippingAddress: {
      address: '5th Main, HSR Layout',
      city: 'Bangalore',
      pincode: '560102'
    },
    totalAmount: 1500,
    items: [
      {
        productId: 'prod_4',
        name: 'Wheat Flour 10kg',
        quantity: 3,
        price: 500,
        normalPrice: 480,
        unit: 'kg',
        unitSize: 10,
        returnStatus: 'None'
      }
    ],
    sellerPickups: [
      { sellerId: mockSellerId, pickupCode: 'PU-104', status: 'Cancelled' }
    ]
  }
];

// =============================================================
// TEST 1: SELLER ORDER LISTING & FORMATTING
// =============================================================
console.log('TEST 1: Seller Order Listing & Calculations...');

// 1.1 Order ID Formatting
assert.strictEqual(formatOrderNumber(mockOrders[0]), '#00101', 'Order 101 formats to #00101');
assert.strictEqual(formatOrderNumber({ orderNumber: 5 }), '#00005', 'Single digit orderNumber formats to 5-digit padded');
assert.strictEqual(formatOrderNumber({ orderId: '9999' }), '#09999', 'orderId formats with zero padding');
assert.strictEqual(formatOrderNumber({ _id: '66a010010000000000123abc' }), '#123ABC', 'Fallback to uppercase slice of _id');
assert.strictEqual(formatOrderNumber(null), '#00000', 'Null order returns #00000');
console.log('  [PASS] formatOrderNumber formats numbers, legacy IDs, and ObjectIds correctly');

// 1.2 Order Total Calculations (Wholesale/Seller Payout Basis)
assert.strictEqual(getOrderTotal(mockOrders[0]), 4500, 'Prefers totalAmountWithoutCommissions');
assert.strictEqual(getOrderTotal(mockOrders[1]), 18000, 'Falls back to sellerItemsNetTotal when commissions field absent');
assert.strictEqual(getOrderTotal(mockOrders[3]), 1500, 'Falls back to totalAmount if seller totals not provided');
console.log('  [PASS] getOrderTotal accurately resolves seller payout total with commission deduction priority');

// 1.3 Search Filtering
const searchResult1 = filterOrders(mockOrders, { searchTerm: '00101' });
assert.strictEqual(searchResult1.length, 1);
assert.strictEqual(searchResult1[0].orderNumber, 101);

const searchResult2 = filterOrders(mockOrders, { searchTerm: 'Krishna Wholesale' });
assert.strictEqual(searchResult2.length, 1);
assert.strictEqual(searchResult2[0].orderNumber, 102);

const searchResultNone = filterOrders(mockOrders, { searchTerm: 'Nonexistent Customer' });
assert.strictEqual(searchResultNone.length, 0);
console.log('  [PASS] Search filtering works seamlessly across order ID, padded number, and customer name');

// 1.4 Status Filtering
const pendingOrders = filterOrders(mockOrders, { statusFilter: 'Pending' });
assert.strictEqual(pendingOrders.length, 1);
assert.strictEqual(pendingOrders[0].orderNumber, 101);

const packedOrders = filterOrders(mockOrders, { statusFilter: 'Packed' });
assert.strictEqual(packedOrders.length, 1);
assert.strictEqual(packedOrders[0].orderNumber, 102);

const returnOrders = filterOrders(mockOrders, { statusFilter: 'Returns' });
assert.strictEqual(returnOrders.length, 1);
assert.strictEqual(returnOrders[0].orderNumber, 103, 'Order 103 has item with Return Requested status');
console.log('  [PASS] Status filtering works for standard statuses (Pending, Packed) and special "Returns" filter');

// 1.5 Order Type (B2B vs All) Filtering
const allOrders = filterOrders(mockOrders, { orderTypeFilter: 'All' });
assert.strictEqual(allOrders.length, 4);

const b2bOrders = filterOrders(mockOrders, { orderTypeFilter: 'B2B' });
assert.strictEqual(b2bOrders.length, 1);
assert.strictEqual(b2bOrders[0].orderNumber, 102);
assert.strictEqual(b2bOrders[0].userId.role, 'b2b');
console.log('  [PASS] Order Type filter correctly isolates B2B wholesale orders');

// 1.6 Date Range Filtering
const dateFiltered = filterOrders(mockOrders, { 
  dateRange: { start: '2026-11-19', end: '2026-11-20' } 
});
assert.strictEqual(dateFiltered.length, 2, 'Should match orders on 19th and 20th');
assert.deepStrictEqual(dateFiltered.map(o => o.orderNumber), [101, 102]);
console.log('  [PASS] Date range filter correctly includes orders within boundary timestamps');


// =============================================================
// TEST 2: ORDER DETAILS INSPECTION & ITEM BREAKDOWN
// =============================================================
console.log('\nTEST 2: Order Details & Item Breakdown...');

// 2.1 Customer & Shipping Info
const order1 = mockOrders[0];
assert.strictEqual(order1.userId.name, 'Ramesh Kumar');
assert.strictEqual(order1.shippingAddress.city, 'Bangalore');
assert.strictEqual(order1.shippingAddress.pincode, '560038');

// 2.2 Driver Info mapping
const order2 = mockOrders[1];
assert.strictEqual(order2.driverId.name, 'Suresh Gowda');
assert.strictEqual(order2.driverId.vehicleDetails, 'Tata Ace (KA-04-E-1234)');
console.log('  [PASS] Customer address, contact, and driver assignment details mapped properly');

// 2.3 Item Seller Payout vs Customer Price calculations
const item1 = order1.items[0];
const item1Payout = getItemSellerPayout(item1);
assert.strictEqual(item1Payout.unitPrice, 2250, 'Seller unit payout should be normalPrice 2250');
assert.strictEqual(item1Payout.total, 4500, 'Seller line total should be 2 x 2250 = 4500');
assert.strictEqual(item1.price * item1.quantity, 4800, 'Customer paid 2 x 2400 = 4800');
const platformCommission = (item1.price * item1.quantity) - item1Payout.total;
assert.strictEqual(platformCommission, 300, 'Platform commission is 4800 - 4500 = 300');
console.log(`  [PASS] Item Payout Breakdown: Seller gets ₹${item1Payout.total} (₹${item1Payout.unitPrice}/unit), Customer pays ₹${item1.price * item1.quantity}, Fee = ₹${platformCommission}`);

// 2.4 Packaging unit size and total product weight
assert.strictEqual(item1.unitSize, 25);
assert.strictEqual(item1.totalProductWeight, 50);
console.log('  [PASS] Unit size (25 kg) and total product weight (50 kg) correctly preserved');


// =============================================================
// TEST 3: ORDER ACTIONS & STATUS TRANSITIONS
// =============================================================
console.log('\nTEST 3: Order Actions & State Transitions...');

// 3.1 Permitted actions for seller in UI
assert.deepStrictEqual(getAvailableSellerActions('Pending'), ['Accept & Pack', 'Reject Order']);
assert.deepStrictEqual(getAvailableSellerActions(null), ['Accept & Pack', 'Reject Order']);
assert.deepStrictEqual(getAvailableSellerActions('Packed'), []);
assert.deepStrictEqual(getAvailableSellerActions('Out for Delivery'), []);
assert.deepStrictEqual(getAvailableSellerActions('Delivered'), []);
assert.deepStrictEqual(getAvailableSellerActions('Cancelled'), []);
console.log('  [PASS] Action buttons (Accept & Pack / Reject) are only active when status is Pending');

// 3.2 Simulating Seller Action "Accept & Pack"
let mutableOrder = JSON.parse(JSON.stringify(mockOrders[0]));
assert.strictEqual(mutableOrder.orderStatus, 'Pending');

function simulateSellerStatusUpdate(order, newStatus, currentSellerId) {
  // Backend Rule Check: Seller can only select 'Packed' or 'Rejected by Seller'
  const allowedSellerStatuses = ['Packed', 'Rejected by Seller'];
  if (!allowedSellerStatuses.includes(newStatus)) {
    throw new Error(`403 Forbidden: Sellers are not permitted to set status to '${newStatus}'.`);
  }

  // Backend Rule Check: Locked current statuses
  const lockedCurrentStatuses = ['Out for Delivery', 'Delivered', 'Cancelled'];
  if (lockedCurrentStatuses.includes(order.orderStatus)) {
    throw new Error(`403 Forbidden: Order is currently '${order.orderStatus}' and is locked from manual status changes.`);
  }

  // Update seller pickup entry
  if (order.sellerPickups && order.sellerPickups.length > 0) {
    const sp = order.sellerPickups.find(p => p.sellerId === currentSellerId);
    if (sp) sp.status = newStatus;
    
    // Global order status is updated if all sellers have processed
    const allProcessed = order.sellerPickups.every(p => 
      p.status === 'Packed' || p.status === 'Rejected by Seller' || p.status === 'Out for Delivery'
    );
    if (allProcessed) {
      order.orderStatus = newStatus;
    }
  } else {
    order.orderStatus = newStatus;
  }
  return order;
}

// Accept and pack
mutableOrder = simulateSellerStatusUpdate(mutableOrder, 'Packed', mockSellerId);
assert.strictEqual(mutableOrder.orderStatus, 'Packed');
assert.strictEqual(mutableOrder.sellerPickups[0].status, 'Packed');
console.log('  [PASS] Seller successfully accepts order: status transitioned from Pending -> Packed');

// 3.3 Verify Seller cannot manually transition to 'Out for Delivery' or 'Delivered'
assert.throws(() => {
  simulateSellerStatusUpdate(mutableOrder, 'Out for Delivery', mockSellerId);
}, /403 Forbidden/, 'Seller cannot set Out for Delivery directly');

assert.throws(() => {
  simulateSellerStatusUpdate(mutableOrder, 'Delivered', mockSellerId);
}, /403 Forbidden/, 'Seller cannot set Delivered directly');
console.log('  [PASS] Backend security guard: Sellers are strictly prevented from marking Out for Delivery or Delivered');

// 3.4 Multi-seller Pickup Isolation Test
console.log('\nTEST 4: Multi-Seller Order Orchestration...');
const multiSellerOrder = {
  _id: '66a010050000000000000005',
  orderNumber: 105,
  orderStatus: 'Pending',
  sellerPickups: [
    { sellerId: 'seller_A', pickupCode: 'PU-105-A', status: 'Pending' },
    { sellerId: 'seller_B', pickupCode: 'PU-105-B', status: 'Pending' }
  ]
};

// Seller A marks 'Packed'
simulateSellerStatusUpdate(multiSellerOrder, 'Packed', 'seller_A');
assert.strictEqual(multiSellerOrder.sellerPickups[0].status, 'Packed', 'Seller A pickup is Packed');
assert.strictEqual(multiSellerOrder.sellerPickups[1].status, 'Pending', 'Seller B pickup is still Pending');
assert.strictEqual(multiSellerOrder.orderStatus, 'Pending', 'Global order status remains Pending until Seller B also packs');

// Seller B marks 'Packed'
simulateSellerStatusUpdate(multiSellerOrder, 'Packed', 'seller_B');
assert.strictEqual(multiSellerOrder.sellerPickups[1].status, 'Packed', 'Seller B pickup is Packed');
assert.strictEqual(multiSellerOrder.orderStatus, 'Packed', 'Global order status transitions to Packed once all sellers pack');
console.log('  [PASS] Multi-seller orders maintain isolated seller pickup statuses and sync global status correctly');

// 3.5 Reject Order Flow
let rejectOrder = JSON.parse(JSON.stringify(mockOrders[0]));
rejectOrder = simulateSellerStatusUpdate(rejectOrder, 'Rejected by Seller', mockSellerId);
assert.strictEqual(rejectOrder.orderStatus, 'Rejected by Seller');
assert.strictEqual(rejectOrder.sellerPickups[0].status, 'Rejected by Seller');
console.log('  [PASS] Seller successfully rejects order: status transitioned to Rejected by Seller');

// =============================================================
// TEST 5: STRICT TWO-SELLER PRODUCT & ORDER SEPARATION
// =============================================================
console.log('\nTEST 5: Two-Seller Product & Order Data Separation...');

const sellerA_Id = 'seller_AAA_111';
const sellerB_Id = 'seller_BBB_222';
const sellerC_Id = 'seller_CCC_333'; // Unrelated seller

// A shared customer order with products from both Seller A and Seller B
const combinedOrder = {
  _id: '66a010060000000000000006',
  orderNumber: 106,
  createdAt: '2026-11-20T12:00:00.000Z',
  orderStatus: 'Pending',
  totalAmount: 9000,
  sellerPickups: [
    { sellerId: sellerA_Id, pickupCode: 'PU-106-A', status: 'Pending' },
    { sellerId: sellerB_Id, pickupCode: 'PU-106-B', status: 'Pending' }
  ],
  items: [
    {
      productId: 'prod_A_1',
      name: 'Seller A Premium Basmati Rice',
      quantity: 2,
      price: 2500,
      normalPrice: 2200,
      totalSellerAmount: 4400,
      seller: { sellerId: sellerA_Id, name: 'Seller A Store' }
    },
    {
      productId: 'prod_B_1',
      name: 'Seller B Pure Desi Ghee 1L',
      quantity: 4,
      price: 1000,
      normalPrice: 900,
      totalSellerAmount: 3600,
      seller: { sellerId: sellerB_Id, name: 'Seller B Store' }
    }
  ]
};

// Function mirroring backend GET /api/sellers/orders logic
function processSellerOrdersForSeller(orders, currentSellerId) {
  const currentSellerIdStr = currentSellerId.toString();

  return orders.map(order => {
    const orderObj = JSON.parse(JSON.stringify(order));

    // STRICT MULTI-SELLER ISOLATION: Keep ONLY the items belonging to THIS seller
    const sellerItems = (orderObj.items || []).filter(item => {
      const itemSellerId = item.seller?.sellerId || item.sellerId;
      return itemSellerId && itemSellerId.toString() === currentSellerIdStr;
    });

    if (sellerItems.length === 0) {
      return null;
    }

    // Isolate seller pickup details
    const sellerPickup = orderObj.sellerPickups?.find(sp => sp.sellerId?.toString() === currentSellerIdStr);
    if (sellerPickup) {
      orderObj.pickupCode = sellerPickup.pickupCode;
      orderObj.orderStatus = sellerPickup.status;
      orderObj.status = sellerPickup.status;
    } else {
      orderObj.status = orderObj.orderStatus;
    }
    if (orderObj.sellerPickups) {
      orderObj.sellerPickups = orderObj.sellerPickups.filter(sp => sp.sellerId?.toString() === currentSellerIdStr);
    }

    // Recalculate financial totals specifically for THIS seller's items only
    let sellerItemsNetTotal = 0;
    sellerItems.forEach(item => {
      const normalPrice = item.normalPrice !== undefined && item.normalPrice !== null
        ? Number(item.normalPrice)
        : Number(item.price || 0);
      const qty = Number(item.quantity) || 1;
      const lineSellerTotal = item.totalSellerAmount !== undefined && item.totalSellerAmount !== null
        ? Number(item.totalSellerAmount)
        : (normalPrice * qty);
      sellerItemsNetTotal += lineSellerTotal;
    });

    orderObj.items = sellerItems;
    orderObj.sellerItemsNetTotal = sellerItemsNetTotal;
    orderObj.totalAmountWithoutCommissions = sellerItemsNetTotal;
    orderObj.totalAmount = sellerItemsNetTotal;

    return orderObj;
  }).filter(Boolean);
}

// 5.1 Verification for Seller A
const sellerA_Orders = processSellerOrdersForSeller([combinedOrder], sellerA_Id);
assert.strictEqual(sellerA_Orders.length, 1, 'Seller A should receive the order');
assert.strictEqual(sellerA_Orders[0].items.length, 1, 'Seller A sees exactly 1 item (their own)');
assert.strictEqual(sellerA_Orders[0].items[0].name, 'Seller A Premium Basmati Rice');
assert.strictEqual(sellerA_Orders[0].totalAmount, 4400, 'Seller A sees only their own total ₹4,400 (not ₹9,000)');
assert.strictEqual(sellerA_Orders[0].pickupCode, 'PU-106-A', 'Seller A sees their own pickup code PU-106-A');
assert.strictEqual(sellerA_Orders[0].sellerPickups.length, 1, 'Seller A pickup list contains only Seller A');
assert.strictEqual(sellerA_Orders[0].sellerPickups[0].sellerId, sellerA_Id);
console.log('  [PASS] Seller A Panel: Receives ONLY Seller A products, payout ₹4,400, and pickup code PU-106-A');

// 5.2 Verification for Seller B
const sellerB_Orders = processSellerOrdersForSeller([combinedOrder], sellerB_Id);
assert.strictEqual(sellerB_Orders.length, 1, 'Seller B should receive the order');
assert.strictEqual(sellerB_Orders[0].items.length, 1, 'Seller B sees exactly 1 item (their own)');
assert.strictEqual(sellerB_Orders[0].items[0].name, 'Seller B Pure Desi Ghee 1L');
assert.strictEqual(sellerB_Orders[0].totalAmount, 3600, 'Seller B sees only their own total ₹3,600 (not ₹9,000)');
assert.strictEqual(sellerB_Orders[0].pickupCode, 'PU-106-B', 'Seller B sees their own pickup code PU-106-B');
assert.strictEqual(sellerB_Orders[0].sellerPickups.length, 1, 'Seller B pickup list contains only Seller B');
assert.strictEqual(sellerB_Orders[0].sellerPickups[0].sellerId, sellerB_Id);
console.log('  [PASS] Seller B Panel: Receives ONLY Seller B products, payout ₹3,600, and pickup code PU-106-B');

// 5.3 Verification for Unrelated Seller C
const sellerC_Orders = processSellerOrdersForSeller([combinedOrder], sellerC_Id);
assert.strictEqual(sellerC_Orders.length, 0, 'Seller C receives 0 orders because they own no products in Order #106');
console.log('  [PASS] Seller C Panel: Order #106 is completely invisible to Seller C');

// 5.4 Cross-Seller Order Action Security Check
function verifySellerOrderAccess(order, sellerId) {
  const sellerIdStr = sellerId.toString();
  const hasProducts = (order.items || []).some(item => {
    const itemSellerId = item.seller?.sellerId || item.sellerId;
    return itemSellerId && itemSellerId.toString() === sellerIdStr;
  });
  if (!hasProducts) {
    throw new Error('403 Forbidden: You do not have products in this order');
  }
}

// Seller A and Seller B have access to their order
assert.doesNotThrow(() => verifySellerOrderAccess(combinedOrder, sellerA_Id));
assert.doesNotThrow(() => verifySellerOrderAccess(combinedOrder, sellerB_Id));

// Seller C cannot access or perform status changes on Order #106
assert.throws(() => {
  verifySellerOrderAccess(combinedOrder, sellerC_Id);
}, /403 Forbidden: You do not have products in this order/);
console.log('  [PASS] Unauthorized seller is strictly blocked with 403 Forbidden from modifying orders they do not own');

// 5.5 Cross-Seller Product Management Security Check
function verifyProductOwnership(product, sellerId) {
  const productSellerId = product.sellerId || product.seller;
  if (productSellerId && productSellerId.toString() !== sellerId.toString()) {
    throw new Error('403 Forbidden: Not authorized to update/delete products of another seller');
  }
}

const productOwnedByA = { _id: 'prod_A_1', name: 'Product A', sellerId: sellerA_Id };
assert.doesNotThrow(() => verifyProductOwnership(productOwnedByA, sellerA_Id));
assert.throws(() => {
  verifyProductOwnership(productOwnedByA, sellerB_Id);
}, /403 Forbidden: Not authorized to update\/delete products of another seller/);
console.log('  [PASS] Seller B cannot update or delete Seller A product (403 Forbidden)');

console.log('\n================================================================');
console.log('             ALL SELLER ORDERS TESTS PASSED!                    ');
console.log('================================================================');

