/**
 * Frontend pricing helper for Seller Panel
 */

export function findCategoryCommission(commissions = [], categoryId, unit, categoryName = null, pincode = null) {
  if (!commissions || !Array.isArray(commissions) || commissions.length === 0) return null;
  const catIdStr = categoryId?._id || categoryId;
  const catName = (categoryName || categoryId?.name || '').trim().toLowerCase();
  const unitClean = (unit || '').trim().toLowerCase();
  const targetPin = (pincode || '').toString().trim().toLowerCase();

  // Filter commissions for this category first
  const catComms = commissions.filter(c => {
    const cCatId = c.categoryId?._id || c.categoryId;
    const cName = (c.categoryId?.name || '').trim().toLowerCase();
    const idMatch = catIdStr && String(cCatId) === String(catIdStr);
    const nameMatch = catName && cName === catName;
    return idMatch || nameMatch;
  });

  if (catComms.length === 0) return null;

  // 1. Exact match on category + unit + specific pincode
  if (targetPin && targetPin !== 'all') {
    const exactPinAndUnit = catComms.find(c => {
      const cUnit = (c.unit || '').trim().toLowerCase();
      const cPin = (c.pincode || 'all').trim().toLowerCase();
      return (unitClean ? cUnit === unitClean : true) && cPin === targetPin;
    });
    if (exactPinAndUnit) return exactPinAndUnit;
  }

  // 2. Fallback: match category + unit + pincode 'all' (or unset)
  if (unitClean) {
    const unitAllPin = catComms.find(c => {
      const cUnit = (c.unit || '').trim().toLowerCase();
      const cPin = (c.pincode || 'all').trim().toLowerCase();
      return cUnit === unitClean && (cPin === 'all' || !cPin);
    });
    if (unitAllPin) return unitAllPin;
  }

  // 3. Fallback: specific pincode match on category
  if (targetPin && targetPin !== 'all') {
    const pinMatch = catComms.find(c => {
      const cPin = (c.pincode || 'all').trim().toLowerCase();
      return cPin === targetPin;
    });
    if (pinMatch) return pinMatch;
  }

  // 4. Fallback: category default with pincode 'all'
  const fallbackAll = catComms.find(c => {
    const cPin = (c.pincode || 'all').trim().toLowerCase();
    return cPin === 'all' || !cPin;
  });
  if (fallbackAll) return fallbackAll;

  return null;
}

export function calculateCustomerPrice(sellerPrice, commissionType = 'flat', commissionValue = 0) {
  const sPrice = parseFloat(sellerPrice) || 0;
  if (sPrice <= 0) return { customerPrice: 0, commissionAmount: 0 };

  const cVal = parseFloat(commissionValue) || 0;
  const isPercent = commissionType === 'percentage';

  const commissionAmount = isPercent ? (sPrice * cVal) / 100 : cVal;
  const customerPrice = parseFloat((sPrice + commissionAmount).toFixed(2));

  return {
    customerPrice,
    commissionAmount: parseFloat(commissionAmount.toFixed(2))
  };
}

/**
 * Dynamic Unit-Based Calculation for B2B Pricing in Seller Panel:
 * Formula:
 * - packageBasePrice = sellerBasePrice * unitSize
 * - gstAmount = packageBasePrice * (gstRate / 100)
 * - customerFinalPrice = packageBasePrice + gstAmount
 * (Admin Commission is strictly excluded from Seller Panel)
 */
export function calculateB2bPricing({
  basePrice = 0,
  unitSize = 1,
  adminCommissionPerUnit = 0,
  commissionType = 'flat',
  gstRate = 0,
  quantity = 1
}) {
  const bPrice = parseFloat(basePrice) || 0;
  const uSize = parseFloat(unitSize) > 0 ? parseFloat(unitSize) : 1;
  const commRate = parseFloat(adminCommissionPerUnit) || 0;
  const gst = parseFloat(gstRate) || 0;
  const qty = Number(quantity) > 0 ? Number(quantity) : 1;

  // Package Base Price = Seller Base Price × Unit Size
  const packageBasePrice = parseFloat((bPrice * uSize).toFixed(2));
  const totalPackageBasePrice = parseFloat((packageBasePrice * qty).toFixed(2));

  // GST on Package Base Price
  const gstAmountPerPackage = parseFloat((packageBasePrice * (gst / 100)).toFixed(2));
  const totalGstAmount = parseFloat((totalPackageBasePrice * (gst / 100)).toFixed(2));

  // Customer Final Price = Package Base Price + GST Amount
  const customerPricePerPackage = parseFloat((packageBasePrice + gstAmountPerPackage).toFixed(2));
  const totalCustomerPrice = parseFloat((totalPackageBasePrice + totalGstAmount).toFixed(2));

  // Legacy field support for admin commission calculations if called elsewhere
  const totalCommissionPerPackage = commissionType === 'percentage'
    ? parseFloat(((packageBasePrice * commRate) / 100).toFixed(2))
    : parseFloat((uSize * commRate).toFixed(2));
  const totalCommission = parseFloat((totalCommissionPerPackage * qty).toFixed(2));
  const customerBasePricePerPackage = parseFloat((packageBasePrice + totalCommissionPerPackage).toFixed(2));

  return {
    basePrice: bPrice,
    unitSize: uSize,
    packageBasePrice,
    totalPackageBasePrice,
    adminCommissionPerUnit: commRate,
    totalCommissionPerPackage,
    totalCommission,
    customerBasePricePerPackage,
    gstRate: gst,
    quantity: qty,
    sellerPricePerPackage: packageBasePrice,
    totalSellerPrice: totalPackageBasePrice,
    gstAmountPerPackage,
    totalGstAmount,
    customerPricePerPackage,
    totalCustomerPrice,
    // Per-unit breakdown values
    sellerBasePricePerUnit: bPrice,
    packagePrice: packageBasePrice,
    gstAmount: gstAmountPerPackage,
    customerFinalPrice: customerPricePerPackage
  };
}

/**
 * Calculate pricing breakdown for any quantity.
 */
export function calculatePricingBreakdown({
  sellerUnitPrice = 0,
  commissionType = 'flat',
  commissionValue = 0,
  gstPercent = 0,
  quantity = 1,
  isB2B = true
}) {
  const qty = Number(quantity) > 0 ? Number(quantity) : 1;
  const sUnitPrice = typeof sellerUnitPrice === 'number' ? sellerUnitPrice : (parseFloat(sellerUnitPrice) || 0);
  const cVal = typeof commissionValue === 'number' ? commissionValue : (parseFloat(commissionValue) || 0);
  const cType = commissionType === 'percentage' ? 'percentage' : 'flat';

  let unitCommission = 0;
  if (cType === 'flat') {
    unitCommission = cVal;
  } else {
    unitCommission = (sUnitPrice * cVal) / 100;
  }

  const totalSellerPrice = parseFloat((sUnitPrice * qty).toFixed(2));
  const totalCommission = parseFloat((unitCommission * qty).toFixed(2));
  const totalCustomerBase = parseFloat((totalSellerPrice + totalCommission).toFixed(2));

  let totalGst = 0;
  let finalCustomerPrice = totalCustomerBase;

  const gstRate = typeof gstPercent === 'number' ? gstPercent : (parseFloat(gstPercent) || 0);
  if (isB2B) {
    totalGst = parseFloat((totalCustomerBase * (gstRate / 100)).toFixed(2));
    finalCustomerPrice = parseFloat((totalCustomerBase + totalGst).toFixed(2));
  } else {
    if (gstRate > 0) {
      const baseBeforeTax = totalCustomerBase / (1 + gstRate / 100);
      totalGst = parseFloat((totalCustomerBase - baseBeforeTax).toFixed(2));
    }
    finalCustomerPrice = totalCustomerBase;
  }

  return {
    quantity: qty,
    sellerUnitPrice: sUnitPrice,
    unitCommission: parseFloat(unitCommission.toFixed(2)),
    totalSellerPrice,
    totalCommission,
    totalCustomerBase,
    gstPercent: gstRate,
    totalGst,
    finalCustomerPrice
  };
}
