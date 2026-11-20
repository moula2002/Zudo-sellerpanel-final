import React from 'react';

export const STATUS_CONFIGS = {
  // 1. Pending (Awaiting action / In Queue) -> Warm Gold / Amber
  'Pending': {
    bg: 'rgba(245, 158, 11, 0.14)',
    color: '#d97706',
    border: 'rgba(245, 158, 11, 0.32)',
    label: 'Pending'
  },

  // 2. Packed (Packaged & Ready for Dispatch) -> Vibrant Cyan / Teal
  'Packed': {
    bg: 'rgba(6, 182, 212, 0.14)',
    color: '#0891b2',
    border: 'rgba(6, 182, 212, 0.32)',
    label: 'Packed'
  },

  // 3. Picked Up / Order Picked Up (In Transit with Hub/Driver) -> Royal Indigo
  'Picked Up': {
    bg: 'rgba(99, 102, 241, 0.14)',
    color: '#4f46e5',
    border: 'rgba(99, 102, 241, 0.32)',
    label: 'Picked Up'
  },
  'Order Picked Up': {
    bg: 'rgba(99, 102, 241, 0.14)',
    color: '#4f46e5',
    border: 'rgba(99, 102, 241, 0.32)',
    label: 'Order Picked Up'
  },

  // 4. Processing / Pickup Ready -> Vibrant Blue
  'Processing': {
    bg: 'rgba(59, 130, 246, 0.14)',
    color: '#2563eb',
    border: 'rgba(59, 130, 246, 0.32)',
    label: 'Processing'
  },
  'Pickup Ready': {
    bg: 'rgba(59, 130, 246, 0.14)',
    color: '#2563eb',
    border: 'rgba(59, 130, 246, 0.32)',
    label: 'Pickup Ready'
  },

  // 5. Shipped -> Sky / Deep Blue
  'Shipped': {
    bg: 'rgba(2, 132, 199, 0.14)',
    color: '#0284c7',
    border: 'rgba(2, 132, 199, 0.32)',
    label: 'Shipped'
  },

  // 6. Out for Delivery / Pickup Dispatched -> Regal Purple / Violet
  'Out for Delivery': {
    bg: 'rgba(168, 85, 247, 0.14)',
    color: '#9333ea',
    border: 'rgba(168, 85, 247, 0.32)',
    label: 'Out for Delivery'
  },
  'Pickup Dispatched': {
    bg: 'rgba(168, 85, 247, 0.14)',
    color: '#9333ea',
    border: 'rgba(168, 85, 247, 0.32)',
    label: 'Pickup Dispatched'
  },

  // 7. Delivered / Order Delivered -> Crisp Emerald Green
  'Delivered': {
    bg: 'rgba(16, 185, 129, 0.16)',
    color: '#059669',
    border: 'rgba(16, 185, 129, 0.35)',
    label: 'Delivered'
  },
  'Order Delivered': {
    bg: 'rgba(16, 185, 129, 0.16)',
    color: '#059669',
    border: 'rgba(16, 185, 129, 0.35)',
    label: 'Order Delivered'
  },

  // 8. Cancelled / Order Cancelled -> Pure Bright Red
  'Cancelled': {
    bg: 'rgba(239, 68, 68, 0.14)',
    color: '#dc2626',
    border: 'rgba(239, 68, 68, 0.32)',
    label: 'Cancelled'
  },
  'Order Cancelled': {
    bg: 'rgba(239, 68, 68, 0.14)',
    color: '#dc2626',
    border: 'rgba(239, 68, 68, 0.32)',
    label: 'Order Cancelled'
  },

  // 9. Rejected by Seller / Order Rejected -> Bold Rose / Crimson
  'Rejected by Seller': {
    bg: 'rgba(225, 29, 72, 0.14)',
    color: '#e11d48',
    border: 'rgba(225, 29, 72, 0.32)',
    label: 'Rejected by Seller'
  },
  'Order Rejected by Seller': {
    bg: 'rgba(225, 29, 72, 0.14)',
    color: '#e11d48',
    border: 'rgba(225, 29, 72, 0.32)',
    label: 'Rejected by Seller'
  },
  'Order Rejected': {
    bg: 'rgba(225, 29, 72, 0.14)',
    color: '#e11d48',
    border: 'rgba(225, 29, 72, 0.32)',
    label: 'Order Rejected'
  },

  // 10. Return Requested / Requested -> Deep Orange
  'Return Requested': {
    bg: 'rgba(234, 88, 12, 0.16)',
    color: '#c2410c',
    border: 'rgba(234, 88, 12, 0.32)',
    label: 'Return Requested'
  },
  'Requested': {
    bg: 'rgba(234, 88, 12, 0.16)',
    color: '#c2410c',
    border: 'rgba(234, 88, 12, 0.32)',
    label: 'Return Requested'
  },

  // 11. Return Approved / Approved -> Lime Green
  'Return Approved': {
    bg: 'rgba(22, 163, 74, 0.16)',
    color: '#15803d',
    border: 'rgba(22, 163, 74, 0.32)',
    label: 'Return Approved'
  },
  'Approved': {
    bg: 'rgba(22, 163, 74, 0.16)',
    color: '#15803d',
    border: 'rgba(22, 163, 74, 0.32)',
    label: 'Return Approved'
  },

  // 12. Return Rejected / Rejected -> Slate Cool Grey
  'Return Rejected': {
    bg: 'rgba(100, 116, 139, 0.16)',
    color: '#475569',
    border: 'rgba(100, 116, 139, 0.32)',
    label: 'Return Rejected'
  },
  'Rejected': {
    bg: 'rgba(100, 116, 139, 0.16)',
    color: '#475569',
    border: 'rgba(100, 116, 139, 0.32)',
    label: 'Return Rejected'
  },

  // 13. Return Driver Assigned / Return Picked Up -> Electric Fuchsia
  'Return Driver Assigned': {
    bg: 'rgba(217, 70, 239, 0.16)',
    color: '#a21caf',
    border: 'rgba(217, 70, 239, 0.32)',
    label: 'Return Driver Assigned'
  },
  'Return Picked Up': {
    bg: 'rgba(217, 70, 239, 0.16)',
    color: '#a21caf',
    border: 'rgba(217, 70, 239, 0.32)',
    label: 'Return Picked Up'
  },
  'Picked Up from Customer': {
    bg: 'rgba(217, 70, 239, 0.16)',
    color: '#a21caf',
    border: 'rgba(217, 70, 239, 0.32)',
    label: 'Return Picked Up'
  },

  // 14. Returned / Returned to Seller / Return Completed -> Deep Pine Green
  'Returned': {
    bg: 'rgba(4, 120, 87, 0.16)',
    color: '#047857',
    border: 'rgba(4, 120, 87, 0.32)',
    label: 'Returned'
  },
  'Returned to Seller': {
    bg: 'rgba(4, 120, 87, 0.16)',
    color: '#047857',
    border: 'rgba(4, 120, 87, 0.32)',
    label: 'Returned to Seller'
  },
  'Return Completed': {
    bg: 'rgba(4, 120, 87, 0.16)',
    color: '#047857',
    border: 'rgba(4, 120, 87, 0.32)',
    label: 'Return Completed'
  },

  // 15. Paid / Completed / Payment Received -> Mint Emerald
  'Paid': {
    bg: 'rgba(16, 185, 129, 0.14)',
    color: '#059669',
    border: 'rgba(16, 185, 129, 0.3)',
    label: 'Paid'
  },
  'Completed': {
    bg: 'rgba(16, 185, 129, 0.14)',
    color: '#059669',
    border: 'rgba(16, 185, 129, 0.3)',
    label: 'Completed'
  },
  'Payment Received': {
    bg: 'rgba(16, 185, 129, 0.14)',
    color: '#059669',
    border: 'rgba(16, 185, 129, 0.3)',
    label: 'Payment Received'
  },

  // 16. Invoices / Generated -> Soft Violet
  'Generated': {
    bg: 'rgba(139, 92, 246, 0.14)',
    color: '#7c3aed',
    border: 'rgba(139, 92, 246, 0.3)',
    label: 'Generated'
  },

  // 17. Pickup Scheduled -> Dark Cyan
  'Pickup Scheduled': {
    bg: 'rgba(8, 145, 178, 0.14)',
    color: '#0e7490',
    border: 'rgba(8, 145, 178, 0.3)',
    label: 'Pickup Scheduled'
  }
};

export const getOrderStatusStyle = (status) => {
  if (!status) {
    return {
      bg: 'rgba(148, 163, 184, 0.12)',
      color: '#64748b',
      border: 'rgba(148, 163, 184, 0.25)',
      label: '—'
    };
  }

  // Exact match
  if (STATUS_CONFIGS[status]) return STATUS_CONFIGS[status];

  // Case-insensitive match
  const raw = String(status).trim();
  const lower = raw.toLowerCase();

  for (const [key, config] of Object.entries(STATUS_CONFIGS)) {
    if (key.toLowerCase() === lower) return config;
  }

  // Heuristic partial matching
  if (lower.includes('delivered') || (lower.includes('completed') && !lower.includes('return'))) {
    return STATUS_CONFIGS['Delivered'];
  }
  if (lower.includes('cancel')) {
    return STATUS_CONFIGS['Cancelled'];
  }
  if (lower.includes('reject')) {
    if (lower.includes('return')) return STATUS_CONFIGS['Return Rejected'];
    return STATUS_CONFIGS['Rejected by Seller'];
  }
  if (lower.includes('approved')) {
    return STATUS_CONFIGS['Return Approved'];
  }
  if (lower.includes('return')) {
    if (lower.includes('driver') || lower.includes('assigned')) return STATUS_CONFIGS['Return Driver Assigned'];
    if (lower.includes('picked')) return STATUS_CONFIGS['Return Picked Up'];
    if (lower.includes('completed') || lower.includes('seller') || lower === 'returned') return STATUS_CONFIGS['Returned'];
    return STATUS_CONFIGS['Return Requested'];
  }
  if (lower.includes('out for delivery') || lower.includes('dispatched')) {
    return STATUS_CONFIGS['Out for Delivery'];
  }
  if (lower.includes('picked up') || lower === 'order picked up') {
    return STATUS_CONFIGS['Picked Up'];
  }
  if (lower.includes('packed')) {
    return STATUS_CONFIGS['Packed'];
  }
  if (lower.includes('ship')) {
    return STATUS_CONFIGS['Shipped'];
  }
  if (lower.includes('process') || lower.includes('ready')) {
    return STATUS_CONFIGS['Processing'];
  }
  if (lower.includes('paid') || lower.includes('verified')) {
    return STATUS_CONFIGS['Paid'];
  }
  if (lower.includes('pending')) {
    return STATUS_CONFIGS['Pending'];
  }
  if (lower.includes('invoice') || lower.includes('generated')) {
    return STATUS_CONFIGS['Generated'];
  }

  return {
    bg: 'rgba(148, 163, 184, 0.12)',
    color: '#64748b',
    border: 'rgba(148, 163, 184, 0.25)',
    label: raw
  };
};

export const StatusPill = ({ status, style = {} }) => {
  const config = getOrderStatusStyle(status);
  return React.createElement('span', {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.3px',
      textTransform: 'uppercase',
      background: config.bg,
      color: config.color,
      border: `1px solid ${config.border}`,
      whiteSpace: 'nowrap',
      ...style
    }
  }, status || config.label);
};

export default getOrderStatusStyle;
