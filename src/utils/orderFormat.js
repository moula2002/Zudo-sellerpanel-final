/**
 * Formats an orderNumber into a 5-digit zero-padded string prefixed with '#'.
 * Example: 1 -> "#00001", 25 -> "#00025"
 * Fallback to legacy string format if orderNumber is not available.
 * 
 * @param {Object} order - Order object containing orderNumber, orderId, or _id
 * @returns {string} Formatted Order ID (e.g. "#00001")
 */
export function formatOrderNumber(order) {
  if (!order) return '#00000';
  if (order.orderNumber !== undefined && order.orderNumber !== null && !isNaN(Number(order.orderNumber))) {
    return `#${String(order.orderNumber).padStart(5, '0')}`;
  }
  if (order.orderId) {
    // If orderId is already formatted or numeric
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

