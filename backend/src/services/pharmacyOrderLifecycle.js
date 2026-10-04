const transitions = {
  Pending: ['Confirmed', 'Shipped', 'Cancelled'],
  Confirmed: ['Preparing', 'Cancelled'],
  Preparing: ['Shipped', 'Cancelled'],
  Shipped: ['Out for Delivery', 'Delivered'],
  'Out for Delivery': ['Delivered'],
  Delivered: [],
  Cancelled: [],
  Returned: [],
};

const fulfillmentStates = new Set(['Confirmed', 'Preparing', 'Shipped', 'Out for Delivery', 'Delivered']);

export function canTransitionPharmacyOrder(order, nextStatus) {
  if (nextStatus === order?.status) return { ok: true, idempotent: true };
  if (!(transitions[order?.status] || []).includes(nextStatus)) {
    return { ok: false, status: 409, code: 'INVALID_ORDER_TRANSITION', message: `Invalid order transition: ${order?.status} -> ${nextStatus}` };
  }
  if (nextStatus === 'Cancelled' && order.paymentStatus === 'Paid') {
    return { ok: false, status: 409, code: 'REFUND_REQUIRED', message: 'Paid orders require the provider refund workflow before cancellation.' };
  }
  if (fulfillmentStates.has(nextStatus) && order.paymentMethod !== 'COD' && order.paymentStatus !== 'Paid') {
    return { ok: false, status: 409, code: 'PAYMENT_REQUIRED', message: 'Online orders must be paid before fulfillment.' };
  }
  return { ok: true, idempotent: false };
}

export function canCollectPharmacyCod(order) {
  return order?.paymentMethod === 'COD' && order?.status === 'Delivered' && order?.paymentStatus === 'Unpaid';
}

