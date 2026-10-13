/**
 * Frontend pricing helper for Seller Panel
 */

export function findCategoryCommission(commissions = [], categoryId, unit) {
  if (!commissions || !Array.isArray(commissions) || commissions.length === 0) return null;
  const catIdStr = categoryId?._id || categoryId;
  if (!catIdStr) return null;

  const unitClean = (unit || '').trim().toLowerCase();

  // Match category + unit
  if (unitClean) {
    const match = commissions.find(c => {
      const cCatId = c.categoryId?._id || c.categoryId;
      const cUnit = (c.unit || '').trim().toLowerCase();
      return String(cCatId) === String(catIdStr) && cUnit === unitClean;
    });
    if (match) return match;
  }

  // Fallback to category only
  const fallback = commissions.find(c => {
    const cCatId = c.categoryId?._id || c.categoryId;
    return String(cCatId) === String(catIdStr);
  });

  return fallback || null;
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
