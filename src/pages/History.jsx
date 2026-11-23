import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Activity, Calendar, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Clock3, Copy, CreditCard, Download, ExternalLink, Eye, FileSpreadsheet,
  FileText, Filter, IndianRupee, Layers, LoaderCircle, MapPin, Package, Phone,
  Printer, RefreshCcw, Search, ShoppingBag, Truck, User, X
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { getOrderStatusStyle, StatusPill } from '../utils/statusColors';

const HISTORY_API_ENABLED = import.meta.env.VITE_SELLER_HISTORY_API_ENABLED !== 'false';

const categories = [
  { id: 'all', label: 'All Orders' },
  { id: 'orders', label: 'Orders' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'pickups', label: 'Pickup' },
  { id: 'returns', label: 'Returned' },
  { id: 'payments', label: 'Payments' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'statusUpdates', label: 'Status Updates' }
];

const dateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const formatAmount = (value) => value === null || value === undefined || value === ''
  ? '—'
  : Number.isFinite(Number(value))
    ? `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';

const safeText = (value) => value === null || value === undefined || value === '' ? '—' : String(value);

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getSellerFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem('zudo_seller_user') || '{}');
  } catch {
    return {};
  }
};

const getHistoryErrorMessage = (error, fallback = false) => {
  const status = error.response?.status;
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'Your account is not authorized to view business history.';
  if (fallback && status === 404) return 'One or more existing seller record APIs are not available on this server.';
  if (status === 404) return 'The History API is not available on this server yet. Deploy the backend history route and retry.';
  if (status >= 500) return 'The server could not load business history. Please retry shortly.';
  if (!error.response) {
    return error.message && error.message !== 'Network Error'
      ? error.message
      : 'Unable to reach the API server. Check the backend connection and retry.';
  }
  return error.response.data?.message || 'Unable to load business history. Please try again.';
};

const idString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    if (value._id) return idString(value._id);
    if (value.id) return idString(value.id);
    if (value.sellerId) return idString(value.sellerId);
    if (typeof value.toString === 'function') {
      const str = value.toString();
      if (str && str !== '[object Object]') return str.trim();
    }
  }
  return '';
};

const validTimestamp = (...values) => {
  for (const value of values) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return null;
};

const getLegacyOrderReference = (order) => {
  if (order.orderNumber !== undefined && order.orderNumber !== null && String(order.orderNumber).trim()) {
    return `#${String(order.orderNumber).replace(/^#/, '').padStart(5, '0')}`;
  }
  return order.orderRef || (order._id ? `#${String(order._id).slice(-6).toUpperCase()}` : '');
};

const toLegacyItem = (item) => {
  const quantity = Number(item.quantity) || 0;
  const unitPrice = item.normalPrice !== undefined && item.normalPrice !== null
    ? Number(item.normalPrice)
    : (item.netPrice !== undefined && item.netPrice !== null ? Number(item.netPrice) : Number(item.price ?? item.unitCustomerPrice) || 0);
  const sellerAmount = item.totalSellerAmount !== undefined && item.totalSellerAmount !== null && Number(item.totalSellerAmount) > 0
    ? Number(item.totalSellerAmount)
    : unitPrice * quantity;
  return {
    name: item.name || item.product?.name || '',
    quantity,
    unit: item.variantSize || item.packagingType || item.unit || item.sellingUnit || '',
    amount: sellerAmount,
    unitPrice,
    taxAmount: Number(item.gstAmount || item.totalGst) || 0
  };
};

const buildLegacyHistory = ({ seller, products, orders, invoices, pickups, returns }) => {
  const sellerId = idString(seller) || idString(getSellerFromStorage());
  const productIds = new Set((products || []).map(product => idString(product._id || product.id)).filter(Boolean));
  const pickupByOrderId = new Map((pickups || []).map(pickup => [
    idString(pickup.orderId || pickup._id),
    pickup
  ]));
  const returnByOrderId = new Map((returns || []).map(order => [idString(order._id), order]));
  const sellerOrders = (orders || []).map(order => {
    const items = (order.items || []).filter(item => {
      const itemSellerId = idString(item.seller?.sellerId || item.sellerId || item.seller?._id || item.seller);
      const itemPid = idString(item.productId);
      return (itemSellerId && itemSellerId === sellerId) ||
             (itemPid && productIds.has(itemPid));
    });
    if (!items.length) return null;

    const customer = {
      name: order.shippingAddress?.name?.trim() || order.userId?.name?.trim() || '',
      phone: order.shippingAddress?.phone?.trim() || order.userId?.phone?.trim() || '',
      address: order.shippingAddress?.address || '',
      city: order.shippingAddress?.city || '',
      state: order.shippingAddress?.state || '',
      pincode: order.shippingAddress?.pincode || ''
    };
    const itemDetails = items.map(toLegacyItem);
    const orderTotal = (order.totalAmountWithoutCommissions !== undefined && order.totalAmountWithoutCommissions !== null && Number(order.totalAmountWithoutCommissions) > 0)
      ? Number(order.totalAmountWithoutCommissions)
      : ((order.sellerItemsNetTotal !== undefined && order.sellerItemsNetTotal !== null && Number(order.sellerItemsNetTotal) > 0)
          ? Number(order.sellerItemsNetTotal)
          : itemDetails.reduce((total, item) => total + item.amount, 0));
    const amount = orderTotal;
    const orderId = idString(order._id);
    const referenceId = getLegacyOrderReference(order);
    const embeddedPickups = (order.sellerPickups || [])
      .filter(pickup => idString(pickup.sellerId) === sellerId)
      .map(pickup => ({
        id: idString(pickup._id),
        status: pickup.status || '',
        pickupCode: pickup.pickupCode || '',
        scheduledDate: pickup.scheduledDate || pickup.pickupDate || order.scheduledDate || order.pickupDate || null,
        driver: order.driverId && typeof order.driverId === 'object'
          ? { name: order.driverId.name || '', phone: order.driverId.phone || '' }
          : null
      }));
    const pickupRecord = pickupByOrderId.get(orderId);
    const orderPickups = embeddedPickups.length
      ? embeddedPickups
      : ((!order.sellerPickups || order.sellerPickups.length === 0) && pickupRecord
        ? [{
          id: pickupRecord.pickupId || idString(pickupRecord._id),
          status: pickupRecord.status || pickupRecord.orderStatus || '',
          pickupCode: pickupRecord.pickupCode || '',
          scheduledDate: pickupRecord.scheduledDate || pickupRecord.pickupDate || null,
          driver: pickupRecord.driver
            ? { name: pickupRecord.driver.name || '', phone: pickupRecord.driver.phone || '' }
            : null
        }]
        : []);
    const details = {
      orderId,
      referenceId,
      orderNumber: order.orderNumber ?? '',
      orderRef: order.orderRef || '',
      customer,
      items: itemDetails,
      orderStatus: order.orderStatus || '',
      paymentStatus: order.paymentStatus || '',
      paymentMethod: order.paymentMethod || '',
      paymentAmount: amount,
      transactionId: order.onlineTransactionId || order.codReference || '',
      pickup: orderPickups
    };
    return { ...order, _historyOrderId: orderId, _historyReference: referenceId, _historyCustomer: customer, _historyItems: itemDetails, _historyAmount: amount, _historyDetails: details };
  }).filter(Boolean);

  const ordersById = new Map(sellerOrders.map(order => [order._historyOrderId, order]));
  const rows = [];
  const add = (activity) => rows.push({ ...activity, fallback: true });

  sellerOrders.forEach(order => {
    const orderId = order._historyOrderId;
    const referenceId = order._historyReference;
    const customer = order._historyCustomer;
    const items = order._historyItems;
    const amount = order._historyAmount;
    const details = order._historyDetails;
    details.invoiceReferences = [];
    const occurredAt = validTimestamp(order.createdAt, order.orderDate);
    const productSummary = items.slice(0, 3).map(item => `${item.name || 'Product'} x${item.quantity}`).join(', ');

    add({
      id: `fallback:order:${orderId}`,
      activityType: 'orders',
      activity: 'New Order Received',
      occurredAt,
      referenceId,
      customer,
      description: `${items.length} item${items.length === 1 ? '' : 's'}${productSummary ? `: ${productSummary}` : ''}`,
      amount,
      status: order.orderStatus || '',
      source: 'order',
      recordId: orderId,
      orderId,
      details: { ...details, order: details }
    });

    details.pickup.forEach((pickup, index) => {
      const isPickedUp = pickup.status === 'Picked Up' || pickup.status === 'Delivered' || order.orderStatus === 'Picked Up' || order.orderStatus === 'Delivered';
      const isOutForDelivery = pickup.status === 'Out for Delivery' || order.orderStatus === 'Out for Delivery';
      const isScheduled = Boolean(pickup.scheduledDate);
      if (isPickedUp || isOutForDelivery || isScheduled) {
        const pickupTitle = isPickedUp
          ? 'Order Picked Up'
          : isOutForDelivery
            ? 'Pickup Dispatched'
            : 'Pickup Scheduled';

        add({
          id: `fallback:pickup:${orderId}:${pickup.id || index}`,
          activityType: 'pickups',
          activity: pickupTitle,
          occurredAt: validTimestamp(pickup.scheduledDate, order.updatedAt, occurredAt),
          referenceId,
          customer,
          description: `Pickup record; status: ${pickup.status || order.orderStatus}${pickup.pickupCode ? `; Code: ${pickup.pickupCode}` : ''}`,
          amount,
          status: pickup.status || order.orderStatus,
          source: 'order',
          recordId: orderId,
          orderId,
          details: { ...details, order: details }
        });
      }
    });

    const isDelivered = order.orderStatus === 'Delivered' || Boolean(order.deliveredAt);
    if (isDelivered) {
      const deliveryDate = validTimestamp(order.deliveredAt, order.updatedAt, order.createdAt);
      add({
        id: `fallback:delivered:${orderId}`,
        activityType: 'delivered',
        activity: 'Order Delivered',
        occurredAt: deliveryDate,
        referenceId,
        customer,
        description: 'Order delivery confirmed',
        amount,
        status: 'Delivered',
        source: 'order',
        recordId: orderId,
        orderId,
        details: { ...details, order: details }
      });
    }

    const paymentStatus = String(order.paymentStatus || '').toLowerCase();
    const collectionStatus = String(order.codCollectionStatus || '').toLowerCase();
    const onlineStatus = String(order.onlinePaymentStatus || '').toLowerCase();
    const paymentReceived = ['paid', 'completed', 'verified'].includes(paymentStatus) ||
      ['collected', 'verified'].includes(collectionStatus) ||
      onlineStatus === 'verified';
    const paidAt = validTimestamp(order.paidAt, order.codCollectedAt, order.onlineVerifiedAt);
    if (paymentReceived && paidAt) {
      add({
        id: `fallback:payment:${orderId}:${paidAt}`,
        activityType: 'payments',
        activity: 'Payment Received',
        occurredAt: paidAt,
        referenceId: details.transactionId || referenceId,
        customer,
        description: `${order.paymentMethod || 'Payment'} payment received for order`,
        amount,
        status: order.paymentStatus || 'Completed',
        source: 'order',
        recordId: orderId,
        orderId,
        details: { ...details, transactionId: details.transactionId, order: details }
      });
    }

    if (order.cancelledAt || order.orderStatus === 'Cancelled' || order.orderStatus === 'Rejected by Seller') {
      const cancelDate = validTimestamp(order.cancelledAt, order.updatedAt);
      if (cancelDate) {
        const isRejected = order.orderStatus === 'Rejected by Seller';
        add({
          id: `fallback:status:${orderId}:${order.orderStatus}`,
          activityType: 'statusUpdates',
          activity: isRejected ? 'Order Rejected by Seller' : 'Order Cancelled',
          occurredAt: cancelDate,
          referenceId,
          customer,
          description: order.cancellationReason || (isRejected ? 'Rejected by seller' : 'Order cancelled'),
          amount,
          status: order.orderStatus || 'Cancelled',
          source: 'order',
          recordId: orderId,
          orderId,
          details: { ...details, order: details }
        });
      }
    }

    const returnRecord = returnByOrderId.get(orderId);
    const returnItems = returnRecord?.items?.length
      ? returnRecord.items
      : (order.items || []).filter(item => item.returnStatus && item.returnStatus !== 'None');
    const returnDates = [
      ['Return Requested', order.returnRequestedAt || returnRecord?.returnRequestedAt],
      ['Return Approved', order.returnApprovedAt || returnRecord?.returnApprovedAt],
      ['Return Rejected', order.returnRejectedAt || returnRecord?.returnRejectedAt]
    ].filter(([, date]) => date);
    if (!returnDates.length && (returnItems.length || ['Return Requested', 'Return Approved', 'Return Rejected', 'Returned', 'Partially Returned'].includes(order.orderStatus) || order.returnStatus)) {
      returnDates.push([order.returnStatus || (returnItems[0] && returnItems[0].returnStatus) || 'Return Requested', order.updatedAt || order.createdAt]);
    }
    returnDates.forEach(([activity, date], index) => {
      const eventDate = validTimestamp(date, order.updatedAt, occurredAt);
      add({
        id: `fallback:return:${orderId}:${activity}:${index}`,
        activityType: 'returns',
        activity,
        occurredAt: eventDate,
        referenceId,
        customer,
        description: `${returnItems.length || items.length} item${(returnItems.length || items.length) === 1 ? '' : 's'}${order.returnReason ? `; ${order.returnReason}` : ''}${!eventDate ? '; no return-event timestamp was saved' : ''}`,
        amount: returnItems.reduce((sum, item) => sum + toLegacyItem(item).amount, 0) || amount,
        status: order.returnStatus || returnItems[0]?.returnStatus || order.orderStatus || '',
        source: 'order',
        recordId: orderId,
        orderId,
        details: { ...details, returnItems: returnItems.map(toLegacyItem), returnReason: order.returnReason || '', order: details }
      });
    });
  });

  (invoices || []).forEach(invoice => {
    const invoiceOrderIds = [...new Set([invoice.orderId, ...(invoice.orders || [])].map(idString).filter(Boolean))];
    const linkedOrders = invoiceOrderIds.map(orderId => ordersById.get(orderId)).filter(Boolean);
    const order = linkedOrders[0];
    const rawInvNum = invoice.orderNumber ?? invoice.invoiceNumber ?? invoice.invoiceSequenceNumber;
    let invoiceReference = idString(invoice._id);
    if (rawInvNum !== undefined && rawInvNum !== null && String(rawInvNum).trim()) {
      const clean = String(rawInvNum).trim().replace(/^#/, '');
      invoiceReference = /^\d+$/.test(clean) ? `#${clean.padStart(5, '0')}` : `#${clean}`;
    }
    invoiceOrderIds.forEach(orderId => {
      const linkedOrder = ordersById.get(orderId);
      if (linkedOrder) linkedOrder._historyDetails.invoiceReferences.push(invoiceReference);
    });
    add({
      id: `fallback:invoice:${idString(invoice._id)}`,
      activityType: 'invoices',
      activity: 'Invoice Generated',
      occurredAt: validTimestamp(invoice.createdAt),
      referenceId: invoiceReference,
      customer: order?._historyCustomer || {},
      description: invoice.orderNumber
        ? `Invoice for order #${String(invoice.orderNumber).padStart(5, '0')}`
        : 'Seller invoice generated',
      amount: invoice.netAmount ?? invoice.totalAmount ?? null,
      status: invoice.status || '',
      source: 'invoice',
      recordId: idString(invoice._id),
      orderId: invoiceOrderIds[0] || '',
      details: {
        invoiceId: idString(invoice._id),
        invoiceNumber: invoiceReference,
        orderId: invoiceOrderIds[0] || '',
        orderNumber: invoice.orderNumber ?? '',
        startDate: invoice.startDate || null,
        endDate: invoice.endDate || null,
        hasInvoiceImage: Boolean(invoice.hasInvoiceImage || invoice.imageCount || invoice.invoiceImage),
        images: invoice.images || [],
        status: invoice.status || '',
        order: order ? {
          orderId: order._historyOrderId,
          referenceId: order._historyReference,
          customer: order._historyCustomer,
          items: order._historyItems,
          orderStatus: order.orderStatus || ''
        } : null,
        relatedOrders: linkedOrders.map(linkedOrder => ({
          orderId: linkedOrder._historyOrderId,
          referenceId: linkedOrder._historyReference,
          customer: linkedOrder._historyCustomer,
          items: linkedOrder._historyItems
        }))
      }
    });
  });

  return rows;
};

const getSellerOrderCanonicalTotal = (order) => {
  if (order.totalAmountWithoutCommissions !== undefined && order.totalAmountWithoutCommissions !== null && Number(order.totalAmountWithoutCommissions) > 0) {
    return Number(order.totalAmountWithoutCommissions);
  }
  if (order.sellerItemsNetTotal !== undefined && order.sellerItemsNetTotal !== null && Number(order.sellerItemsNetTotal) > 0) {
    return Number(order.sellerItemsNetTotal);
  }
  if (Array.isArray(order.items) && order.items.length > 0) {
    const sum = order.items.reduce((total, it) => {
      const lineTotal = it.totalSellerAmount !== undefined && it.totalSellerAmount !== null && Number(it.totalSellerAmount) > 0
        ? Number(it.totalSellerAmount)
        : ((Number(it.normalPrice ?? it.netPrice ?? it.price ?? 0)) * (Number(it.quantity) || 1));
      const lineGst = Number(it.gstAmount ?? it.totalGst ?? 0);
      return total + lineTotal + lineGst;
    }, 0);
    if (sum > 0) return sum;
  }
  return Number(order.totalAmount) || 0;
};

const buildOrderTotalsMap = (orders = []) => {
  const map = new Map();
  (orders || []).forEach(order => {
    const total = getSellerOrderCanonicalTotal(order);
    if (order._id) map.set(String(order._id), total);
    if (order.orderNumber !== undefined && order.orderNumber !== null) {
      map.set(String(order.orderNumber), total);
      map.set(Number(order.orderNumber), total);
      map.set(`#${String(order.orderNumber).padStart(5, '0')}`, total);
    }
    if (order.orderRef) map.set(String(order.orderRef), total);
  });
  return map;
};

const consolidateClientRows = (rawRows = [], orderTotalsMap = null) => {
  const orderMap = new Map();
  const nonOrderRows = [];

  for (const row of rawRows) {
    if (row.orderId) {
      // Must have valid reference, customer, or items - never accept empty ghost records from deleted orders
      const hasValidReference = Boolean(row.referenceId && row.referenceId !== '—');
      const hasCustomer = Boolean(row.customer?.name && row.customer.name.trim());
      const hasItems = Boolean(row.details?.items && row.details.items.length > 0);
      if (!hasValidReference && !hasCustomer && !hasItems) {
        continue;
      }

      if (!orderMap.has(row.orderId)) {
        orderMap.set(row.orderId, {
          id: `order:${row.orderId}`,
          orderId: row.orderId,
          referenceId: row.referenceId,
          customer: row.customer || {},
          occurredAt: row.occurredAt,
          createdAt: row.createdAt || row.details?.createdAt || row.occurredAt,
          description: row.description,
          amount: row.amount,
          status: row.status,
          paymentStatus: row.paymentStatus || row.details?.paymentStatus || '',
          paymentMethod: row.paymentMethod || row.details?.paymentMethod || '',
          activityType: 'orders',
          activity: 'Order Record',
          details: { ...(row.details || {}) },
          activities: [],
          categories: new Set(['orders', 'all'])
        });
      }
      const entry = orderMap.get(row.orderId);

      const activityItem = {
        id: row.id,
        activity: row.activity,
        activityType: row.activityType,
        occurredAt: row.occurredAt,
        status: row.status,
        description: row.description,
        amount: row.amount,
        details: row.details
      };
      if (!entry.activities.some(a => a.id === row.id || (a.activity === row.activity && a.occurredAt === row.occurredAt))) {
        entry.activities.push(activityItem);
      }

      if (row.activityType) entry.categories.add(row.activityType);
      if (row.activityType === 'delivered' || row.activity === 'Order Delivered' || row.details?.orderStatus === 'Delivered' || (row.status === 'Delivered' && row.activityType === 'orders')) {
        entry.categories.add('delivered');
      }
      if (row.activityType === 'pickups' || (row.activity && row.activity.toLowerCase().includes('pickup'))) {
        entry.categories.add('pickups');
      }
      if (row.activityType === 'returns' || (row.activity && row.activity.toLowerCase().includes('return'))) {
        entry.categories.add('returns');
      }
      if (row.activityType === 'payments' || ['Paid', 'Completed'].includes(row.details?.paymentStatus)) {
        entry.categories.add('payments');
      }
      if (row.activityType === 'invoices' || row.details?.invoiceReferences?.length) {
        entry.categories.add('invoices');
      }
      if (row.activityType === 'statusUpdates' || ['Cancelled', 'Rejected by Seller'].includes(row.status)) {
        entry.categories.add('statusUpdates');
      }

      if (new Date(row.occurredAt).getTime() > new Date(entry.occurredAt).getTime()) {
        entry.occurredAt = row.occurredAt;
      }
      if (row.details?.items?.length) entry.details.items = row.details.items;
      if (row.details?.orderStatus) entry.status = row.details.orderStatus;
      else if (row.status && row.activityType === 'orders') entry.status = row.status;
      if (row.details?.pickup?.length) entry.details.pickup = row.details.pickup;
      if (row.details?.driver) entry.details.driver = row.details.driver;
      if (row.details?.invoiceReferences?.length) entry.details.invoiceReferences = row.details.invoiceReferences;
      if (row.details?.returnItems?.length) entry.details.returnItems = row.details.returnItems;
      if (row.details?.paymentStatus) entry.paymentStatus = row.details.paymentStatus;
      if (row.details?.paymentMethod) entry.paymentMethod = row.details.paymentMethod;
      if (row.items?.length && (!entry.items || !entry.items.length)) entry.items = row.items;
      if (row.activities?.length) {
        row.activities.forEach(a => {
          if (!entry.activities.some(existing => existing.id === a.id || (existing.activity === a.activity && existing.occurredAt === a.occurredAt))) {
            entry.activities.push(a);
          }
        });
      }
    } else {
      // Non-order records must have a valid reference and cannot be orphaned order activities (status updates / pickups)
      if (!row.referenceId || row.referenceId === '—' || ['statusUpdates', 'pickups'].includes(row.activityType)) {
        continue;
      }
      nonOrderRows.push({
        ...row,
        activities: [{
          id: row.id,
          activity: row.activity,
          activityType: row.activityType,
          occurredAt: row.occurredAt,
          status: row.status,
          description: row.description,
          amount: row.amount
        }],
        categories: new Set([row.activityType || 'all', 'all'])
      });
    }
  }

  // Filter out any orphaned orders that lack reference, customer, and items
  const validOrderRows = Array.from(orderMap.values()).filter(order => {
    const hasValidReference = Boolean(order.referenceId && order.referenceId !== '—');
    const hasCustomer = Boolean(order.customer?.name && order.customer.name.trim());
    const hasItems = Boolean(order.details?.items && order.details.items.length > 0);
    return hasValidReference || hasCustomer || hasItems;
  });

  for (const entry of validOrderRows) {
    entry.activities.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    entry.categories = Array.from(entry.categories);
    if (!entry.items && entry.details?.items) {
      entry.items = entry.details.items;
    }

    // Determine canonical seller total WITHOUT commission
    let canonicalTotal = null;
    if (orderTotalsMap) {
      if (entry.orderId && orderTotalsMap.has(String(entry.orderId))) {
        canonicalTotal = orderTotalsMap.get(String(entry.orderId));
      } else if (entry.referenceId && orderTotalsMap.has(String(entry.referenceId))) {
        canonicalTotal = orderTotalsMap.get(String(entry.referenceId));
      } else if (entry.referenceId) {
        const cleanRef = String(entry.referenceId).replace('#', '').replace(/^0+/, '');
        if (cleanRef && orderTotalsMap.has(cleanRef)) {
          canonicalTotal = orderTotalsMap.get(cleanRef);
        }
      }
    }

    if (canonicalTotal === null || canonicalTotal === undefined) {
      if (entry.details?.orderTotal !== undefined && entry.details.orderTotal !== null && Number(entry.details.orderTotal) > 0) {
        canonicalTotal = Number(entry.details.orderTotal);
      } else {
        const itemsList = entry.items || entry.details?.items || [];
        if (itemsList.length > 0) {
          const itemSum = itemsList.reduce((sum, it) => {
            const lineTotal = it.totalSellerAmount !== undefined && it.totalSellerAmount !== null && Number(it.totalSellerAmount) > 0
              ? Number(it.totalSellerAmount)
              : ((Number(it.normalPrice ?? it.netPrice ?? it.price ?? 0)) * (Number(it.quantity) || 1));
            const lineGst = Number(it.gstAmount ?? it.totalGst ?? it.taxAmount ?? 0);
            return sum + lineTotal + lineGst;
          }, 0);
          if (itemSum > 0) {
            canonicalTotal = itemSum;
          }
        }
      }
    }

    if (canonicalTotal === null || canonicalTotal === undefined) {
      const validAmounts = entry.activities
        .map(a => Number(a.amount))
        .filter(a => Number.isFinite(a) && a > 0);
      if (validAmounts.length > 0) {
        canonicalTotal = Math.min(...validAmounts);
      } else {
        canonicalTotal = entry.amount;
      }
    }

    entry.amount = canonicalTotal;
    if (entry.details) {
      entry.details.orderTotal = canonicalTotal;
      entry.details.paymentAmount = canonicalTotal;
    }
    entry.activities.forEach(a => {
      a.amount = canonicalTotal;
    });
  }

  for (const entry of nonOrderRows) {
    entry.categories = Array.from(entry.categories);
  }

  return [...validOrderRows, ...nonOrderRows];
};

const filterLegacyHistory = (sourceRows, { search, startDate, endDate, status, activityType, page, limit }) => {
  const consolidated = consolidateClientRows(sourceRows);
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;
  const needle = search.trim().toLowerCase();
  const searchedRows = consolidated.filter(row => {
    const date = row.occurredAt ? new Date(row.occurredAt) : null;
    if ((start || end) && (!date || Number.isNaN(date.getTime()) || (start && date < start) || (end && date > end))) return false;
    if (status && String(row.status || '').toLowerCase() !== status.toLowerCase()) return false;
    if (!needle) return true;
    const text = [
      row.referenceId,
      row.activity,
      row.customer?.name,
      row.customer?.phone,
      row.customer?.address,
      row.description,
      row.status,
      row.orderId,
      row.paymentMethod,
      row.paymentStatus,
      row.details?.transactionId,
      row.details?.invoiceNumber,
      ...(row.details?.invoiceReferences || []),
      ...(row.activities || []).map(a => `${a.activity} ${a.description} ${a.status}`)
    ].filter(Boolean).join(' ').toLowerCase();
    return text.includes(needle);
  });

  const counts = { all: searchedRows.length, orders: 0, delivered: 0, payments: 0, invoices: 0, returns: 0, pickups: 0, statusUpdates: 0 };
  searchedRows.forEach(row => {
    if (Array.isArray(row.categories)) {
      row.categories.forEach(cat => {
        if (Object.prototype.hasOwnProperty.call(counts, cat)) counts[cat] += 1;
      });
    } else if (Object.prototype.hasOwnProperty.call(counts, row.activityType)) {
      counts[row.activityType] += 1;
    }
  });

  const categoryRows = searchedRows
    .filter(row => activityType === 'all' || (Array.isArray(row.categories) ? row.categories.includes(activityType) : row.activityType === activityType))
    .sort((left, right) => (new Date(right.occurredAt || 0).getTime() || 0) - (new Date(left.occurredAt || 0).getTime() || 0));
  const totalPages = Math.ceil(categoryRows.length / limit);
  return {
    rows: categoryRows.slice((page - 1) * limit, page * limit),
    categoryRows,
    counts,
    statuses: [...new Set(searchedRows.map(row => row.status).filter(Boolean))].sort(),
    pagination: { currentPage: page, totalPages, totalRecords: categoryRows.length, limit }
  };
};

const History = () => {
  const [rows, setRows] = useState([]);
  const [legacyRows, setLegacyRows] = useState(null);
  const [sellerOrdersMap, setSellerOrdersMap] = useState(new Map());
  const [counts, setCounts] = useState({});
  const [statuses, setStatuses] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 0, totalRecords: 0, limit: 20 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [filterDraft, setFilterDraft] = useState({ startDate: '', endDate: '', status: '' });
  const [activeFilters, setActiveFilters] = useState({ startDate: '', endDate: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const startDateRef = useRef(null);

  const getResolvedItemPricing = (item, orderId, referenceId, orderTotal) => {
    if (!item) return { unitPrice: 0, amount: 0 };
    const qty = Number(item.quantity) || 1;
    const cleanRef = referenceId ? String(referenceId).replace('#', '').replace(/^0+/, '') : '';
    const canonicalOrder = (orderId && sellerOrdersMap.get(String(orderId))) ||
                           (referenceId && sellerOrdersMap.get(String(referenceId))) ||
                           (cleanRef && sellerOrdersMap.get(cleanRef));

    const lineGst = Number(item.gstAmount ?? item.totalGst ?? item.taxAmount ?? 0);
    const orderTotalNum = Number(orderTotal) || 0;

    // Check if canonical order includes GST in its total
    let includesGst = false;
    if (canonicalOrder) {
      const canonicalTotal = getSellerOrderCanonicalTotal(canonicalOrder);
      const baseSum = (canonicalOrder.items || []).reduce((sum, it) => {
        const lineBase = it.totalSellerAmount !== undefined && it.totalSellerAmount !== null && Number(it.totalSellerAmount) > 0
          ? Number(it.totalSellerAmount)
          : (Number(it.normalPrice ?? it.netPrice ?? it.price ?? 0) * (Number(it.quantity) || 1));
        return sum + lineBase;
      }, 0);
      const gstSum = (canonicalOrder.items || []).reduce((sum, it) => sum + Number(it.gstAmount ?? it.totalGst ?? 0), 0);
      if (Math.abs(canonicalTotal - (baseSum + gstSum)) < 1) {
        includesGst = true;
      }
    } else if (orderTotalNum > 0) {
      const lineBase = item.totalSellerAmount !== undefined && item.totalSellerAmount !== null && Number(item.totalSellerAmount) > 0
        ? Number(item.totalSellerAmount)
        : (Number(item.normalPrice ?? item.netPrice ?? item.price ?? 0) * qty);
      if (Math.abs(orderTotalNum - (lineBase + lineGst)) < 1) {
        includesGst = true;
      }
    }

    if (canonicalOrder && Array.isArray(canonicalOrder.items) && canonicalOrder.items.length > 0) {
      const matched = canonicalOrder.items.find(it =>
        (it.name && item.name && it.name.trim().toLowerCase() === item.name.trim().toLowerCase()) ||
        (it.productId && item.productId && String(it.productId) === String(item.productId))
      ) || (canonicalOrder.items.length === 1 ? canonicalOrder.items[0] : null);

      if (matched) {
        const matchedGst = Number(matched.gstAmount ?? matched.totalGst ?? lineGst ?? 0);
        const normal = matched.normalPrice !== undefined && matched.normalPrice !== null
          ? Number(matched.normalPrice)
          : (matched.netPrice !== undefined && matched.netPrice !== null ? Number(matched.netPrice) : null);

        const baseTotal = matched.totalSellerAmount !== undefined && matched.totalSellerAmount !== null && Number(matched.totalSellerAmount) > 0
          ? Number(matched.totalSellerAmount)
          : (normal !== null ? normal * qty : null);

        if (baseTotal !== null) {
          const finalTotal = includesGst ? (baseTotal + matchedGst) : baseTotal;
          const finalUnit = finalTotal / qty;
          return { unitPrice: finalUnit, amount: finalTotal };
        }
      }
    }

    // 2. Check item's own seller payout properties
    const baseTotal = (item.totalSellerAmount !== undefined && item.totalSellerAmount !== null && Number(item.totalSellerAmount) > 0)
      ? Number(item.totalSellerAmount)
      : (item.normalPrice !== undefined && item.normalPrice !== null
          ? Number(item.normalPrice) * qty
          : (item.netPrice !== undefined && item.netPrice !== null ? Number(item.netPrice) * qty : null));

    if (baseTotal !== null) {
      const finalTotal = includesGst ? (baseTotal + lineGst) : baseTotal;
      return { unitPrice: finalTotal / qty, amount: finalTotal };
    }

    // 3. Fallback: single item order must equal orderTotal
    if (orderTotalNum > 0) {
      return { unitPrice: orderTotalNum / qty, amount: orderTotalNum };
    }

    const currentUnit = Number(item.unitPrice ?? item.price ?? 0);
    const currentAmount = Number(item.amount ?? (currentUnit * qty));
    return { unitPrice: currentUnit, amount: currentAmount };
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPagination(current => ({ ...current, currentPage: 1 }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const handleRefresh = () => {
      setRetryKey(current => current + 1);
    };
    window.addEventListener('focus', handleRefresh);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleRefresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    const interval = window.setInterval(handleRefresh, 25000);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadLegacyHistory = async () => {
      const [sellerResponse, productsResponse, ordersResponse, invoicesResponse, pickupsResponse, returnsResponse] = await Promise.all([
        api.get('/sellers/me', { signal: controller.signal }),
        api.get('/sellers/products', { signal: controller.signal }),
        api.get('/sellers/orders', { signal: controller.signal }),
        api.get('/seller-invoices/my-invoices', { signal: controller.signal }),
        api.get('/sellers/pickups', { signal: controller.signal }),
        api.get('/sellers/returns', { signal: controller.signal })
      ]);
      const getList = (response, label) => {
        if (!Array.isArray(response.data)) throw new Error(`${label} API returned an invalid response.`);
        return response.data;
      };
      const storedSeller = getSellerFromStorage();
      const resolvedSeller = (sellerResponse.data && idString(sellerResponse.data))
        ? sellerResponse.data
        : storedSeller;
      if (!idString(resolvedSeller)) throw new Error('Seller profile could not be verified.');
      const ordersList = getList(ordersResponse, 'Orders');
      const ordersLookup = new Map();
      ordersList.forEach(order => {
        if (order._id) ordersLookup.set(String(order._id), order);
        if (order.orderNumber !== undefined && order.orderNumber !== null) {
          ordersLookup.set(String(order.orderNumber), order);
          ordersLookup.set(Number(order.orderNumber), order);
          ordersLookup.set(`#${String(order.orderNumber).padStart(5, '0')}`, order);
        }
        if (order.orderRef) ordersLookup.set(String(order.orderRef), order);
      });
      setSellerOrdersMap(ordersLookup);
      return buildLegacyHistory({
        seller: resolvedSeller,
        products: getList(productsResponse, 'Products'),
        orders: ordersList,
        invoices: getList(invoicesResponse, 'Invoices'),
        pickups: getList(pickupsResponse, 'Pickups'),
        returns: getList(returnsResponse, 'Returns')
      });
    };
    const loadHistory = async () => {
      setLoading(true);
      setError('');
      try {
        if (!HISTORY_API_ENABLED) {
          const legacyData = await loadLegacyHistory();
          if (!controller.signal.aborted) {
            setLegacyRows(legacyData);
            setSelected(current => (current && !legacyData.some(row => row.id === current.id || (row.orderId && row.orderId === current.orderId))) ? null : current);
          }
          return;
        }
        const [historyRes, ordersRes] = await Promise.all([
          api.get('/sellers/history', {
            params: {
              search: debouncedSearch,
              startDate: activeFilters.startDate || undefined,
              endDate: activeFilters.endDate || undefined,
              status: activeFilters.status || undefined,
              activityType: category,
              page: pagination.currentPage,
              limit: pagination.limit
            },
            signal: controller.signal
          }),
          api.get('/sellers/orders', { signal: controller.signal }).catch(() => ({ data: [] }))
        ]);
        const data = historyRes.data;
        const ordersList = Array.isArray(ordersRes.data) ? ordersRes.data : [];
        const orderTotalsMap = buildOrderTotalsMap(ordersList);
        const ordersLookup = new Map();
        ordersList.forEach(order => {
          if (order._id) ordersLookup.set(String(order._id), order);
          if (order.orderNumber !== undefined && order.orderNumber !== null) {
            ordersLookup.set(String(order.orderNumber), order);
            ordersLookup.set(Number(order.orderNumber), order);
            ordersLookup.set(`#${String(order.orderNumber).padStart(5, '0')}`, order);
          }
          if (order.orderRef) ordersLookup.set(String(order.orderRef), order);
        });
        setSellerOrdersMap(ordersLookup);
        const incoming = Array.isArray(data.data) ? data.data : [];
        const consolidatedData = consolidateClientRows(incoming, orderTotalsMap);
        setRows(consolidatedData);
        setCounts(data.counts || {});
        setStatuses(Array.isArray(data.statuses) ? data.statuses : []);
        setPagination(current => ({ ...current, ...(data.pagination || {}) }));
        setSelected(current => (current && !consolidatedData.some(row => row.id === current.id || (row.orderId && row.orderId === current.orderId))) ? null : current);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          if (HISTORY_API_ENABLED && requestError.response?.status === 404) {
            try {
              const legacyData = await loadLegacyHistory();
              if (!controller.signal.aborted) {
                setLegacyRows(legacyData);
                setSelected(current => (current && !legacyData.some(row => row.id === current.id || (row.orderId && row.orderId === current.orderId))) ? null : current);
              }
            } catch (fallbackError) {
              if (!controller.signal.aborted) {
                setError(getHistoryErrorMessage(fallbackError, true));
                setRows([]);
                setCounts({});
                setPagination(current => ({ ...current, totalRecords: 0, totalPages: 0 }));
              }
            }
          } else {
            setError(getHistoryErrorMessage(requestError, !HISTORY_API_ENABLED));
            setRows([]);
            setCounts({});
            setPagination(current => ({ ...current, totalRecords: 0, totalPages: 0 }));
          }
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadHistory();
    return () => controller.abort();
  }, [debouncedSearch, activeFilters, category, pagination.currentPage, pagination.limit, retryKey]);

  useEffect(() => {
    if (!selected) return undefined;
    if (selected.fallback) return undefined;
    const controller = new AbortController();
    const loadDetails = async () => {
      setDetailLoading(true);
      setDetailError('');
      try {
        const { data } = await api.get('/sellers/history/details', {
          params: { id: selected.id },
          signal: controller.signal
        });
        const detailsPayload = data.data;
        if (detailsPayload) {
          if (selected.amount !== null && selected.amount !== undefined) {
            if (detailsPayload.activity) detailsPayload.activity.amount = selected.amount;
            if (detailsPayload.details) {
              detailsPayload.details.orderTotal = selected.amount;
              detailsPayload.details.paymentAmount = selected.amount;
            }
          }
          const orderTotal = selected.amount ?? detailsPayload.details?.orderTotal;
          const orderId = selected.orderId ?? detailsPayload.activity?.orderId;
          const referenceId = selected.referenceId ?? detailsPayload.activity?.referenceId;
          const normalizeItems = (items) => (items || []).map(it => {
            const pricing = getResolvedItemPricing(it, orderId, referenceId, orderTotal);
            return {
              ...it,
              unitPrice: pricing.unitPrice,
              amount: pricing.amount
            };
          });
          if (Array.isArray(detailsPayload.details?.items)) {
            detailsPayload.details.items = normalizeItems(detailsPayload.details.items);
          }
          if (Array.isArray(detailsPayload.details?.order?.items)) {
            detailsPayload.details.order.items = normalizeItems(detailsPayload.details.order.items);
          }
          if (Array.isArray(detailsPayload.details?.returnItems)) {
            detailsPayload.details.returnItems = normalizeItems(detailsPayload.details.returnItems);
          }
        }
        setDetailData(detailsPayload);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          const errMsg = requestError.response?.data?.message || 'Unable to load activity details.';
          setDetailError(errMsg);
          if (requestError.response?.status === 404) {
            setRetryKey(c => c + 1);
          }
        }
      } finally {
        if (!controller.signal.aborted) setDetailLoading(false);
      }
    };
    loadDetails();
    return () => controller.abort();
  }, [selected, legacyRows]);

  const queryParams = useMemo(() => ({
    search: debouncedSearch,
    startDate: activeFilters.startDate,
    endDate: activeFilters.endDate,
    status: activeFilters.status,
    activityType: category,
    limit: 100
  }), [debouncedSearch, activeFilters, category]);

  const legacyResult = useMemo(() => legacyRows === null ? null : filterLegacyHistory(legacyRows, {
    search: debouncedSearch,
    startDate: activeFilters.startDate,
    endDate: activeFilters.endDate,
    status: activeFilters.status,
    activityType: category,
    page: pagination.currentPage,
    limit: pagination.limit
  }), [legacyRows, debouncedSearch, activeFilters, category, pagination.currentPage, pagination.limit]);
  const visibleRows = legacyResult?.rows || rows;
  const visibleCounts = legacyResult?.counts || counts;
  const visibleStatuses = legacyResult?.statuses || statuses;
  const visiblePagination = legacyResult?.pagination || pagination;
  const selectedDetailsData = selected?.fallback
    ? {
      activity: selected,
      details: selected.details || {},
      relatedTransactions: selected.activities || [],
      activities: selected.activities || [selected]
    }
    : (detailData || (selected ? {
      activity: selected,
      details: selected.details || {},
      relatedTransactions: selected.activities || [],
      activities: selected.activities || [selected]
    } : null));

  const applyFilters = () => {
    setActiveFilters({ ...filterDraft });
    setPagination(current => ({ ...current, currentPage: 1 }));
  };

  const resetFilters = () => {
    const empty = { startDate: '', endDate: '', status: '' };
    setFilterDraft(empty);
    setActiveFilters(empty);
    setSearch('');
    setDebouncedSearch('');
    setCategory('all');
    setPagination(current => ({ ...current, currentPage: 1 }));
  };

  const setQuickRange = (range) => {
    const today = new Date();
    let startDate = '';
    let endDate = dateValue(today);
    if (range === 'Today') startDate = endDate;
    if (range === 'Yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = dateValue(yesterday);
      endDate = startDate;
    }
    if (range === 'Last 7 Days' || range === 'Last 30 Days') {
      const start = new Date(today);
      start.setDate(start.getDate() - (range === 'Last 7 Days' ? 6 : 29));
      startDate = dateValue(start);
    }
    if (range === 'This Month') {
      startDate = dateValue(new Date(today.getFullYear(), today.getMonth(), 1));
    }
    if (range === 'Previous Month') {
      startDate = dateValue(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      endDate = dateValue(new Date(today.getFullYear(), today.getMonth(), 0));
    }
    if (range === 'Custom Range') {
      startDateRef.current?.focus();
      return;
    }
    const next = { ...filterDraft, startDate, endDate };
    setFilterDraft(next);
    setActiveFilters(next);
    setPagination(current => ({ ...current, currentPage: 1 }));
  };

  const fetchAllFilteredRecords = async () => {
    if (legacyRows !== null) {
      return filterLegacyHistory(legacyRows, {
        search: queryParams.search || '',
        startDate: queryParams.startDate || '',
        endDate: queryParams.endDate || '',
        status: queryParams.status || '',
        activityType: queryParams.activityType || 'all',
        page: 1,
        limit: Math.max(legacyRows.length, 1)
      }).categoryRows;
    }
    const [first, ordersRes] = await Promise.all([
      api.get('/sellers/history', { params: { ...queryParams, page: 1 } }),
      api.get('/sellers/orders').catch(() => ({ data: [] }))
    ]);
    const result = Array.isArray(first.data.data) ? [...first.data.data] : [];
    const totalPages = first.data.pagination?.totalPages || 0;
    for (let page = 2; page <= totalPages; page += 1) {
      const { data } = await api.get('/sellers/history', { params: { ...queryParams, page } });
      if (Array.isArray(data.data)) result.push(...data.data);
    }
    const orderTotalsMap = buildOrderTotalsMap(Array.isArray(ordersRes.data) ? ordersRes.data : []);
    return consolidateClientRows(result, orderTotalsMap);
  };

  const exportRows = async (format) => {
    setExporting(true);
    setError('');
    try {
      const records = await fetchAllFilteredRecords();
      const exportData = records.map(row => ({
        'Order Date': formatDate(row.createdAt || row.occurredAt),
        'Order ID': row.referenceId,
        'Customer': row.customer?.name || '',
        'Phone': row.customer?.phone || '',
        'Items Summary': row.description,
        'Total Amount': row.amount ?? '',
        'Payment Method': row.paymentMethod || row.details?.paymentMethod || '',
        'Payment Status': row.paymentStatus || row.details?.paymentStatus || '',
        'Order Status': row.status,
        'Updates Count': row.activities?.length || 1
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Business History');
      const suffix = dateValue(new Date());
      XLSX.writeFile(workbook, `Business_History_${suffix}.${format === 'csv' ? 'csv' : 'xlsx'}`, {
        bookType: format
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not export the filtered history.');
    } finally {
      setExporting(false);
    }
  };

  const printReport = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Allow pop-ups to print the report.');
      return;
    }
    printWindow.opener = null;
    setExporting(true);
    setError('');
    try {
      const records = await fetchAllFilteredRecords();
      const savedSeller = getSellerFromStorage();
      const sellerName = savedSeller.storeName || savedSeller.businessName || savedSeller.name || 'Seller';
      const lines = records.map(row => `<tr>
        <td>${escapeHtml(formatDate(row.createdAt || row.occurredAt))}</td>
        <td><strong>${escapeHtml(row.referenceId)}</strong></td>
        <td>${escapeHtml(row.customer?.name || '')}${row.customer?.phone ? `<br><small>${escapeHtml(row.customer.phone)}</small>` : ''}</td>
        <td>${escapeHtml(row.description)}</td>
        <td>${escapeHtml(formatAmount(row.amount))}</td>
        <td>${escapeHtml([row.paymentMethod || row.details?.paymentMethod, row.paymentStatus || row.details?.paymentStatus].filter(Boolean).join(' · '))}</td>
        <td>${escapeHtml(row.status)}</td>
      </tr>`).join('');
      const dateRange = [activeFilters.startDate, activeFilters.endDate].filter(Boolean).join(' to ') || 'All available dates';
      printWindow.document.write(`<!doctype html><html><head><title>Business History</title><style>
        body{font:12px Arial,sans-serif;color:#222;padding:24px}h1{color:#4f46e5;margin:0 0 6px}
        .meta{margin:0 0 18px;color:#555}table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ddd;padding:7px;text-align:left;vertical-align:top}
        th{background:#f3f2ff;color:#312e81}tr{break-inside:avoid}
        @media print{body{padding:0}}
      </style></head><body><h1>Business History</h1>
      <p class="meta">${escapeHtml(sellerName)} · ${escapeHtml(dateRange)} · ${records.length} records</p>
      <table><thead><tr><th>Date & Time</th><th>Activity</th><th>Reference ID</th><th>Customer</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>${lines || '<tr><td colspan="7">No history records found.</td></tr>'}</tbody></table>
      <script>window.onload=()=>window.print();</script></body></html>`);
      printWindow.document.close();
    } catch (printError) {
      printWindow.close();
      setError(printError.response?.data?.message || printError.message || 'Could not prepare the print report.');
    } finally {
      setExporting(false);
    }
  };

  const openDetails = (row) => {
    setDetailData(null);
    setSelected(row);
  };

  const changePage = (nextPage) => {
    setPagination(current => ({
      ...current,
      currentPage: Math.max(1, Math.min(nextPage, visiblePagination.totalPages || 1))
    }));
  };

  const selectedActivity = selectedDetailsData?.activity || selected;
  const details = selectedDetailsData?.details || {};
  const detailCustomer = details.customer || details.order?.customer;
  return (
    <Layout>
      <div style={{ color: 'var(--text-main)', paddingBottom: 36 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Business History</h1>
            <p style={{ margin: '8px 0 0', color: 'var(--text-dim)', maxWidth: 720 }}>
              View and track all your store transactions, order activities, payments and business records.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => exportRows('csv')} disabled={exporting} className="history-action">
              <Download size={16} /> Export CSV
            </button>
            <button type="button" onClick={() => exportRows('xlsx')} disabled={exporting} className="history-action">
              <FileSpreadsheet size={16} /> Export Excel
            </button>
            <button type="button" onClick={printReport} disabled={exporting} className="history-action">
              <Printer size={16} /> Print
            </button>
          </div>
        </header>

        <style>{`
          .history-action,.history-control,.history-tab{font:inherit}
          .history-action{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid var(--border-color);border-radius:10px;background:var(--glass-bg);color:var(--text-main);font-weight:650;cursor:pointer}
          .history-action:disabled{opacity:.55;cursor:wait}
          .history-control{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--border-color);border-radius:9px;background:var(--bg-dark);color:var(--text-main);outline:none}
          .history-tab{white-space:nowrap;border:0;border-bottom:2px solid transparent;background:transparent;padding:12px 10px;color:var(--text-dim);cursor:pointer;font-weight:650}
          .history-tab.active{color:var(--primary);border-bottom-color:var(--primary)}
          .history-row:hover{background:rgba(99,102,241,.045)}
          @media(max-width:700px){.history-mobile-hide{display:none!important}}
        `}</style>

        {error && (
          <div role="alert" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', color: '#dc2626', padding: '12px 16px', borderRadius: 10, marginBottom: 18 }}>
            {error}
            <button type="button" onClick={() => { setLegacyRows(null); setRetryKey(current => current + 1); }} disabled={loading} className="history-action">
              Retry
            </button>
          </div>
        )}

        <section style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 18, marginBottom: 20 }}>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={18} style={{ position: 'absolute', top: 12, left: 12, color: 'var(--text-dim)' }} />
            <input
              aria-label="Search business history"
              className="history-control"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search Order ID, Invoice ID, customer, phone or transaction ID"
              style={{ paddingLeft: 40 }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, alignItems: 'end' }}>
            <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Start Date
              <input ref={startDateRef} aria-label="Start date" className="history-control" type="date" value={filterDraft.startDate} onChange={event => setFilterDraft(current => ({ ...current, startDate: event.target.value }))} style={{ display: 'block', marginTop: 6 }} />
            </label>
            <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>End Date
              <input aria-label="End date" className="history-control" type="date" value={filterDraft.endDate} onChange={event => setFilterDraft(current => ({ ...current, endDate: event.target.value }))} style={{ display: 'block', marginTop: 6 }} />
            </label>
            <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Status
              <select aria-label="Status filter" className="history-control" value={filterDraft.status} onChange={event => setFilterDraft(current => ({ ...current, status: event.target.value }))} style={{ display: 'block', marginTop: 6 }}>
                <option value="">All statuses</option>
                {visibleStatuses.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={applyFilters} className="history-action"><Filter size={15} /> Apply Filters</button>
              <button type="button" onClick={resetFilters} className="history-action">Reset</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 16 }}>
            <CalendarDays size={16} color="var(--primary)" />
            {['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Previous Month', 'Custom Range'].map(label => (
              <button key={label} type="button" onClick={() => setQuickRange(label)} className="history-action" style={{ padding: '7px 10px', fontSize: 12 }}>{label}</button>
            ))}
          </div>
        </section>

        <section style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14 }}>
          {categories.map(item => (
            <button key={item.id} type="button" onClick={() => { setCategory(item.id); setPagination(current => ({ ...current, currentPage: 1 })); }} className={`history-tab${category === item.id ? ' active' : ''}`}>
              {item.label} <span style={{ marginLeft: 5, opacity: .7 }}>({error ? '—' : visibleCounts[item.id] ?? 0})</span>
            </button>
          ))}
        </section>

        <section style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 18px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 750 }}>
              <ShoppingBag size={18} color="var(--primary)" /> Order History Records
            </div>
            <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>
              {error ? 'Count unavailable' : `${visiblePagination.totalRecords || visibleRows.length || 0} orders`}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: 'var(--text-dim)', fontSize: 12, background: 'rgba(99,102,241,.04)' }}>
                  {['Date & Time', 'Order ID', 'Customer', 'Products / Items', 'Total Amount', 'Payment', 'Order Status', 'Action'].map(heading => (
                    <th key={heading} style={{ padding: '12px 14px', fontWeight: 700 }}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" style={{ padding: 42, textAlign: 'center', color: 'var(--text-dim)' }}><LoaderCircle size={20} className="history-spin" style={{ verticalAlign: 'middle', marginRight: 8 }} /> Loading business history…</td></tr>
                ) : error ? (
                  <tr><td colSpan="8" role="alert" style={{ padding: 42, textAlign: 'center', color: '#dc2626' }}>{error}</td></tr>
                ) : visibleRows.length === 0 ? (
                  <tr><td colSpan="8" style={{ padding: 48, textAlign: 'center', color: 'var(--text-dim)' }}><Clock3 size={25} style={{ marginBottom: 8 }} /><div>No business history records match these filters.</div></td></tr>
                ) : visibleRows.map(row => (
                  <tr
                    className="history-row"
                    key={row.id}
                    onClick={() => openDetails(row)}
                    style={{ borderTop: '1px solid var(--border-color)', fontSize: 13, cursor: 'pointer' }}
                  >
                    <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={13} style={{ color: 'var(--text-dim)' }} />
                        <span>{formatDate(row.createdAt || row.occurredAt)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 750, color: 'var(--primary)', fontFamily: 'monospace', fontSize: 14 }}>
                        {safeText(row.referenceId)}
                      </div>
                      {row.activities?.length > 1 && (
                        <span style={{ fontSize: 10, color: 'var(--text-dim)', background: 'rgba(99,102,241,0.08)', padding: '2px 6px', borderRadius: 8, fontWeight: 600 }}>
                          {row.activities.length} updates
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 650 }}>{safeText(row.customer?.name)}</div>
                      <small style={{ color: 'var(--text-dim)' }}>{safeText(row.customer?.phone)}</small>
                    </td>
                    <td style={{ padding: '14px', maxWidth: 280 }}>
                      <div style={{ fontWeight: 550, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {safeText(row.description)}
                      </div>
                      {row.items?.length > 1 && (
                        <small style={{ color: 'var(--text-dim)' }}>+{row.items.length - 1} other item{row.items.length > 2 ? 's' : ''}</small>
                      )}
                    </td>
                    <td style={{ padding: '14px', fontWeight: 750, fontSize: 14 }}>
                      {formatAmount(row.amount)}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 650 }}>
                          {safeText(row.paymentMethod || row.details?.paymentMethod || '—')}
                        </span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: ['Paid', 'Completed', 'verified'].includes(String(row.paymentStatus || row.details?.paymentStatus || '').toLowerCase()) ? '#059669' : '#d97706'
                        }}>
                          {safeText(row.paymentStatus || row.details?.paymentStatus || 'Pending')}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <StatusPill status={row.status} />
                    </td>
                    <td style={{ padding: '14px' }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openDetails(row)}
                        className="history-action"
                        style={{ padding: '7px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Eye size={14} /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 18px', borderTop: '1px solid var(--border-color)', color: 'var(--text-dim)', fontSize: 13 }}>
            <span>Page {visiblePagination.currentPage || 1} of {visiblePagination.totalPages || 1}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" aria-label="Previous page" disabled={loading || visiblePagination.currentPage <= 1} onClick={() => changePage(visiblePagination.currentPage - 1)} className="history-action"><ChevronLeft size={16} /> Previous</button>
              <button type="button" aria-label="Next page" disabled={loading || visiblePagination.currentPage >= visiblePagination.totalPages} onClick={() => changePage(visiblePagination.currentPage + 1)} className="history-action">Next <ChevronRight size={16} /></button>
            </div>
          </footer>
        </section>
      </div>

      {selected && (
        <div role="presentation" onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15,23,42,.65)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <section role="dialog" aria-modal="true" aria-labelledby="history-detail-title" onClick={event => event.stopPropagation()} style={{ width: 'min(860px,100%)', maxHeight: '92vh', overflowY: 'auto', borderRadius: 20, padding: 26, background: 'var(--bg-dark)', border: '1px solid var(--border-color)', boxShadow: '0 25px 75px rgba(0,0,0,.35)' }}>
            
            {/* Modal Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', paddingBottom: 18, borderBottom: '1px solid var(--border-color)', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h2 id="history-detail-title" style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
                    Order {selectedActivity?.referenceId || selected?.referenceId}
                  </h2>
                  <StatusPill status={selectedActivity?.status || selected?.status} style={{ fontSize: 12, padding: '4px 12px' }} />
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: ['paid', 'completed'].includes(String(selected?.paymentStatus || details.paymentStatus || '').toLowerCase()) ? 'rgba(16, 185, 129, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                    color: ['paid', 'completed'].includes(String(selected?.paymentStatus || details.paymentStatus || '').toLowerCase()) ? '#059669' : '#d97706',
                    border: `1px solid ${['paid', 'completed'].includes(String(selected?.paymentStatus || details.paymentStatus || '').toLowerCase()) ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                  }}>
                    {selected?.paymentStatus || details.paymentStatus || 'Payment Pending'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-dim)', margin: '6px 0 0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} /> Placed on {formatDate(selected?.createdAt || selectedActivity?.occurredAt)}
                </p>
              </div>
              <button type="button" aria-label="Close details" onClick={() => setSelected(null)} className="history-action" style={{ padding: 8, borderRadius: 10 }}>
                <X size={18} />
              </button>
            </header>

            {detailLoading ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
                <LoaderCircle size={20} className="history-spin" style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Loading latest order updates…
              </div>
            ) : null}
            {detailError && <p role="alert" style={{ color: '#dc2626', marginBottom: 14 }}>{detailError}</p>}

            {/* 4-Card Summary Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
              
              {/* Card 1: Amount */}
              <div style={{ padding: 14, background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6 }}>
                  <IndianRupee size={14} color="var(--primary)" /> TOTAL ORDER AMOUNT
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)' }}>
                  {formatAmount(selected?.amount ?? selectedActivity?.amount)}
                </div>
                <small style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                  {(details.items || selected?.items || []).length} items from your store
                </small>
              </div>

              {/* Card 2: Payment */}
              <div style={{ padding: 14, background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6 }}>
                  <CreditCard size={14} color="#d97706" /> PAYMENT INFO
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                  {safeText(details.paymentMethod || selected?.paymentMethod || 'Cash on Delivery')}
                </div>
                <small style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                  Status: {safeText(details.paymentStatus || selected?.paymentStatus || 'Pending')}
                  {details.transactionId ? ` · Ref: ${details.transactionId}` : ''}
                </small>
              </div>

              {/* Card 3: Customer */}
              <div style={{ padding: 14, background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6 }}>
                  <User size={14} color="#059669" /> CUSTOMER
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                  {safeText(detailCustomer?.name || selected?.customer?.name)}
                </div>
                <small style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                  {safeText(detailCustomer?.phone || selected?.customer?.phone)}
                </small>
              </div>

              {/* Card 4: Pickup & Driver */}
              <div style={{ padding: 14, background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6 }}>
                  <Truck size={14} color="#4f46e5" /> PICKUP / DISPATCH
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                  {safeText((details.pickup?.[0]?.status) || (selected?.pickup?.[0]?.status) || selected?.status || 'Scheduled')}
                </div>
                <small style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                  {((details.pickup?.[0]?.pickupCode) || (selected?.pickup?.[0]?.pickupCode)) ? `OTP / Code: ${(details.pickup?.[0]?.pickupCode) || (selected?.pickup?.[0]?.pickupCode)}` : ''}
                  {details.driverName || details.driver?.name ? ` · Driver: ${details.driverName || details.driver?.name}` : ''}
                </small>
              </div>

            </div>

            {/* Customer Delivery Address */}
            {(detailCustomer?.address || selected?.customer?.address) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 12, marginBottom: 20, fontSize: 12, color: 'var(--text-dim)' }}>
                <MapPin size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong style={{ color: 'var(--text-main)' }}>Delivery Address: </strong>
                  {[
                    detailCustomer?.address || selected?.customer?.address,
                    detailCustomer?.city || selected?.customer?.city,
                    detailCustomer?.state || selected?.customer?.state,
                    detailCustomer?.pincode || selected?.customer?.pincode
                  ].filter(Boolean).join(', ')}
                </div>
              </div>
            )}

            {/* Ordered Products Table */}
            {(details.items || details.order?.items || details.returnItems || selected?.items) && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 750, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={16} color="var(--primary)" /> Products Ordered from Your Store
                </h3>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'rgba(99,102,241,.04)', color: 'var(--text-dim)', fontSize: 11, fontWeight: 700 }}>
                        <th style={{ padding: '10px 14px' }}>Product</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>Unit Price</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(details.returnItems || details.items || details.order?.items || selected?.items || []).map((item, index) => {
                        const pricing = getResolvedItemPricing(
                          item,
                          selected?.orderId,
                          selected?.referenceId,
                          selected?.amount ?? selectedActivity?.amount
                        );
                        return (
                          <tr key={`${item.name || 'item'}-${index}`} style={{ borderTop: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: 650 }}>{safeText(item.name)}</div>
                              {(item.unit || item.measurement) && (
                                <small style={{ color: 'var(--text-dim)' }}>{[item.measurement, item.unit].filter(Boolean).join(' · ')}</small>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600 }}>
                              {safeText(item.quantity)}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-dim)' }}>
                              {pricing.unitPrice ? formatAmount(pricing.unitPrice) : '—'}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>
                              {formatAmount(pricing.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Invoices */}
            {(details.invoiceReferences?.length > 0 || details.invoiceNumber) && (
              <div style={{ padding: '12px 14px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: 12, marginBottom: 20, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} color="#7c3aed" />
                <span>
                  <strong>Invoice Reference: </strong>
                  {[details.invoiceNumber, ...(details.invoiceReferences || [])].filter(Boolean).join(', ')}
                </span>
              </div>
            )}

            {/* Complete Activity History & Status Updates Timeline */}
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 750, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={16} color="var(--primary)" /> Complete Order Activity Timeline & Updates
                </h3>
                <span style={{ fontSize: 11, background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                  {(selectedDetailsData?.activities || selected?.activities || [selectedActivity]).length} updates
                </span>
              </div>

              <div style={{ position: 'relative', paddingLeft: 24, borderLeft: '2px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 18, marginLeft: 8 }}>
                {(selectedDetailsData?.activities || selected?.activities || [selectedActivity]).map((act, idx) => (
                  <div key={act.id || idx} style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: -31,
                      top: 3,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: idx === 0 ? 'var(--primary)' : 'var(--bg-dark)',
                      border: `2px solid ${idx === 0 ? 'var(--primary)' : 'var(--border-color)'}`,
                      boxShadow: idx === 0 ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none'
                    }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>{safeText(act.activity)}</span>
                        {act.status && <StatusPill status={act.status} style={{ fontSize: 10, padding: '2px 8px' }} />}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{formatDate(act.occurredAt)}</span>
                    </div>
                    {act.description && (
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-dim)' }}>
                        {safeText(act.description)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </section>
        </div>
      )}
      <style>{`@keyframes history-spin{to{transform:rotate(360deg)}}.history-spin{animation:history-spin 1s linear infinite}`}</style>
    </Layout>
  );
};

const DetailBlock = ({ title, value, subvalue }) => {
  if (!value || value === '—') return null;
  return (
    <div style={{ padding: 12, border: '1px solid var(--border-color)', borderRadius: 11 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 5 }}>{title}</div>
      <div style={{ fontWeight: 650 }}>{React.isValidElement(value) ? value : safeText(value)}</div>
      {subvalue ? <small style={{ color: 'var(--text-dim)' }}>{safeText(subvalue)}</small> : null}
    </div>
  );
};

const DetailList = ({ title, items }) => (
  <div style={{ marginTop: 18 }}>
    <h3 style={{ fontSize: 15 }}>{title}</h3>
    {(items || []).map((item, index) => (
      <div key={`${item.name || 'item'}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '9px 0', borderTop: '1px solid var(--border-color)' }}>
        <span>{safeText(item.name)} · {safeText(item.quantity)} {item.unit || item.measurement || ''}</span>
        <strong>{formatAmount(item.amount)}</strong>
      </div>
    ))}
  </div>
);

export default History;
