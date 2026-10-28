/**
 * Frontend pricing helper for Seller Panel
 */

export function findCategoryCommission(commissions = [], categoryId, unit, categoryName) {
  if (!commissions || !Array.isArray(commissions) || commissions.length === 0) return null;
  const catIdStr = categoryId?._id || categoryId;
  const catName = (categoryName || categoryId?.name || '').trim().toLowerCase();
  const unitClean = (unit || '').trim().toLowerCase();

  // 1. Match category ID AND unit
  if (catIdStr && unitClean) {
    const match = commissions.find(c => {
      const cCatId = c.categoryId?._id || c.categoryId;
      const cUnit = (c.unit || '').trim().toLowerCase();
      return String(cCatId) === String(catIdStr) && cUnit === unitClean;
    });
    if (match) return match;
  }

  // 2. Match category name AND unit
  if (catName && unitClean) {
    const match = commissions.find(c => {
      const cName = (c.categoryId?.name || '').trim().toLowerCase();
      const cUnit = (c.unit || '').trim().toLowerCase();
      return cName === catName && cUnit === unitClean;
    });
    if (match) return match;
  }

  // 3. Fallback to category ID only
  if (catIdStr) {
    const fallback = commissions.find(c => {
      const cCatId = c.categoryId?._id || c.categoryId;
      return String(cCatId) === String(catIdStr);
    });
    if (fallback) return fallback;
  }

  // 4. Fallback to category name only
  if (catName) {
    const fallback = commissions.find(c => {
      const cName = (c.categoryId?.name || '').trim().toLowerCase();
      return cName === catName;
    });
    if (fallback) return fallback;
  }

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
 * Calculate pricing breakdown for any quantity.
 * Formula:
 * - Total Seller Price = Seller Unit Price × Quantity
 * - Total Commission = Flat Commission Per Unit × Quantity
 * - Final Customer Price = Total Seller Price + Total Commission + Applicable GST
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
