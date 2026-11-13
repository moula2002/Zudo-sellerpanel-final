import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Activity, CalendarDays, ChevronLeft, ChevronRight, Clock3, Download,
  FileSpreadsheet, Filter, LoaderCircle, Printer, Search, X
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../utils/api';

const HISTORY_API_ENABLED = import.meta.env.VITE_SELLER_HISTORY_API_ENABLED === 'true';

const categories = [
  { id: 'all', label: 'All Activities' },
  { id: 'orders', label: 'Orders' },
  { id: 'payments', label: 'Payments' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'returns', label: 'Returns' },
  { id: 'pickups', label: 'Pickups' },
  { id: 'statusUpdates', label: 'Order Status Updates' }
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

const idString = (value) => value?._id?.toString() || value?.toString() || '';

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
  const unitPrice = Number(item.price ?? item.unitCustomerPrice) || 0;
  const savedAmount = Number(item.finalCustomerAmount ?? item.finalCustomerPrice);
  return {
    name: item.name || item.product?.name || '',
    quantity,
    unit: item.variantSize || item.packagingType || item.unit || item.sellingUnit || '',
    amount: Number.isFinite(savedAmount) && savedAmount > 0 ? savedAmount : unitPrice * quantity,
    unitPrice,
    taxAmount: Number(item.gstAmount || item.totalGst) || 0
  };
};

const buildLegacyHistory = ({ seller, products, orders, invoices, pickups, returns }) => {
  const sellerId = idString(seller);
  const productIds = new Set((products || []).map(product => idString(product._id)).filter(Boolean));
  const pickupByOrderId = new Map((pickups || []).map(pickup => [
    idString(pickup.orderId || pickup._id),
    pickup
  ]));
  const returnByOrderId = new Map((returns || []).map(order => [idString(order._id), order]));
  const sellerOrders = (orders || []).map(order => {
    const items = (order.items || []).filter(item =>
      idString(item.seller?.sellerId || item.sellerId) === sellerId ||
      (item.productId && productIds.has(idString(item.productId)))
    );
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
    const amount = itemDetails.reduce((total, item) => total + item.amount, 0);
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
      : pickupRecord
        ? [{
          id: pickupRecord.pickupId || idString(pickupRecord._id),
          status: pickupRecord.status || pickupRecord.orderStatus || '',
          pickupCode: pickupRecord.pickupCode || '',
          scheduledDate: pickupRecord.scheduledDate || pickupRecord.pickupDate || null,
          driver: pickupRecord.driver
            ? { name: pickupRecord.driver.name || '', phone: pickupRecord.driver.phone || '' }
            : null
        }]
        : [];
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
      add({
        id: `fallback:pickup:${orderId}:${pickup.id || index}`,
        activityType: 'pickups',
        activity: pickup.scheduledDate ? 'Pickup Scheduled' : 'Pickup Record Created',
        occurredAt: validTimestamp(pickup.scheduledDate, occurredAt),
        referenceId,
        customer,
        description: `Pickup record${pickup.status ? `; current status: ${pickup.status}` : ''}`,
        amount,
        status: pickup.status,
        source: 'order',
        recordId: orderId,
        orderId,
        details: { ...details, order: details }
      });
    });

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
        status: order.paymentStatus,
        source: 'order',
        recordId: orderId,
        orderId,
        details: { ...details, transactionId: details.transactionId, order: details }
      });
    } else if (paymentStatus === 'pending' && !paymentReceived && occurredAt) {
      add({
        id: `fallback:payment-pending:${orderId}`,
        activityType: 'payments',
        activity: 'Payment Pending',
        occurredAt,
        referenceId,
        customer,
        description: `${order.paymentMethod || 'Payment'} payment pending for order`,
        amount,
        status: order.paymentStatus,
        source: 'order',
        recordId: orderId,
        orderId,
        details: { ...details, order: details }
      });
    }

    [
      ['Order Delivered', order.deliveredAt],
      ['Order Cancelled', order.cancelledAt]
    ].forEach(([activity, date]) => {
      const eventDate = validTimestamp(date);
      if (!eventDate) return;
      add({
        id: `fallback:status:${orderId}:${activity}`,
        activityType: 'statusUpdates',
        activity,
        occurredAt: eventDate,
        referenceId,
        customer,
        description: activity === 'Order Cancelled' ? order.cancellationReason || activity : 'Order delivery confirmed',
        amount,
        status: order.orderStatus || '',
        source: 'order',
        recordId: orderId,
        orderId,
        details: { ...details, order: details }
      });
    });

    const returnRecord = returnByOrderId.get(orderId);
    const returnItems = returnRecord?.items?.length
      ? returnRecord.items
      : (order.items || []).filter(item => item.returnStatus && item.returnStatus !== 'None');
    const returnDates = [
      ['Return Requested', order.returnRequestedAt || returnRecord?.returnRequestedAt],
      ['Return Approved', order.returnApprovedAt || returnRecord?.returnApprovedAt],
      ['Return Rejected', order.returnRejectedAt || returnRecord?.returnRejectedAt]
    ].filter(([, date]) => date);
    if (!returnDates.length && returnItems.length) {
      returnDates.push(['Return Status (current)', null]);
    }
    returnDates.forEach(([activity, date], index) => {
      const eventDate = validTimestamp(date);
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
    const invoiceReference = invoice.invoiceNumber || idString(invoice._id);
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

const filterLegacyHistory = (sourceRows, { search, startDate, endDate, status, activityType, page, limit }) => {
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;
  const needle = search.trim().toLowerCase();
  const searchedRows = sourceRows.filter(row => {
    const date = row.occurredAt ? new Date(row.occurredAt) : null;
    if ((start || end) && (!date || Number.isNaN(date.getTime()) || (start && date < start) || (end && date > end))) return false;
    if (status && String(row.status || '').toLowerCase() !== status.toLowerCase()) return false;
    if (!needle) return true;
    const text = [
      row.referenceId,
      row.activity,
      row.customer?.name,
      row.customer?.phone,
      row.description,
      row.status,
      row.orderId,
      row.details?.transactionId,
      row.details?.invoiceNumber,
      ...(row.details?.invoiceReferences || []),
      ...(row.details?.order?.invoiceReferences || [])
    ].filter(Boolean).join(' ').toLowerCase();
    return text.includes(needle);
  });
  const counts = { all: searchedRows.length, orders: 0, payments: 0, invoices: 0, returns: 0, pickups: 0, statusUpdates: 0 };
  searchedRows.forEach(row => {
    if (Object.prototype.hasOwnProperty.call(counts, row.activityType)) counts[row.activityType] += 1;
  });
  const categoryRows = searchedRows
    .filter(row => activityType === 'all' || row.activityType === activityType)
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPagination(current => ({ ...current, currentPage: 1 }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (legacyRows !== null) return undefined;

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
      if (!idString(sellerResponse.data)) throw new Error('Seller profile API returned an invalid response.');
      return buildLegacyHistory({
        seller: sellerResponse.data,
        products: getList(productsResponse, 'Products'),
        orders: getList(ordersResponse, 'Orders'),
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
          if (!controller.signal.aborted) setLegacyRows(legacyData);
          return;
        }
        const { data } = await api.get('/sellers/history', {
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
        });
        setRows(Array.isArray(data.data) ? data.data : []);
        setCounts(data.counts || {});
        setStatuses(Array.isArray(data.statuses) ? data.statuses : []);
        setPagination(current => ({ ...current, ...(data.pagination || {}) }));
      } catch (requestError) {
        if (!controller.signal.aborted) {
          if (HISTORY_API_ENABLED && requestError.response?.status === 404) {
            try {
              const legacyData = await loadLegacyHistory();
              if (!controller.signal.aborted) {
                setLegacyRows(legacyData);
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
  }, [legacyRows, debouncedSearch, activeFilters, category, pagination.currentPage, pagination.limit, retryKey]);

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
        setDetailData(data.data);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setDetailError(requestError.response?.data?.message || 'Unable to load activity details.');
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
      relatedTransactions: (legacyRows || []).filter(row =>
        row.orderId && row.orderId === selected.orderId && row.id !== selected.id
      )
    }
    : detailData;

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
    const first = await api.get('/sellers/history', { params: { ...queryParams, page: 1 } });
    const result = Array.isArray(first.data.data) ? [...first.data.data] : [];
    const totalPages = first.data.pagination?.totalPages || 0;
    for (let page = 2; page <= totalPages; page += 1) {
      const { data } = await api.get('/sellers/history', { params: { ...queryParams, page } });
      if (Array.isArray(data.data)) result.push(...data.data);
    }
    return result;
  };

  const exportRows = async (format) => {
    setExporting(true);
    setError('');
    try {
      const records = await fetchAllFilteredRecords();
      const exportData = records.map(row => ({
        'Date & Time': formatDate(row.occurredAt),
        Activity: row.activity,
        'Reference ID': row.referenceId,
        Customer: row.customer?.name || '',
        Phone: row.customer?.phone || '',
        Description: row.description,
        Amount: row.amount ?? '',
        Status: row.status
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
        <td>${escapeHtml(formatDate(row.occurredAt))}</td>
        <td>${escapeHtml(row.activity)}</td>
        <td>${escapeHtml(row.referenceId)}</td>
        <td>${escapeHtml(row.customer?.name || '')}${row.customer?.phone ? `<br>${escapeHtml(row.customer.phone)}` : ''}</td>
        <td>${escapeHtml(row.description)}</td>
        <td>${escapeHtml(formatAmount(row.amount))}</td>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 750 }}><Activity size={18} color="var(--primary)" /> Activity Records</div>
            <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>{error ? 'Count unavailable' : `${visiblePagination.totalRecords || 0} records`}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: 'var(--text-dim)', fontSize: 12, background: 'rgba(99,102,241,.04)' }}>
                  {['Date & Time', 'Activity', 'Reference ID', 'Customer', 'Description', 'Amount', 'Status', 'Action'].map(heading => (
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
                  <tr className="history-row" key={row.id} style={{ borderTop: '1px solid var(--border-color)', fontSize: 13 }}>
                    <td style={{ padding: '14px' }}>{formatDate(row.occurredAt)}</td>
                    <td style={{ padding: '14px', fontWeight: 650 }}>{safeText(row.activity)}</td>
                    <td style={{ padding: '14px', fontWeight: 700, color: 'var(--primary)' }}>{safeText(row.referenceId)}</td>
                    <td style={{ padding: '14px' }}><div>{safeText(row.customer?.name)}</div><small style={{ color: 'var(--text-dim)' }}>{safeText(row.customer?.phone)}</small></td>
                    <td style={{ padding: '14px', maxWidth: 280, color: 'var(--text-dim)' }}>{safeText(row.description)}</td>
                    <td style={{ padding: '14px', fontWeight: 700 }}>{formatAmount(row.amount)}</td>
                    <td style={{ padding: '14px' }}><span style={{ background: 'rgba(99,102,241,.1)', color: 'var(--primary)', padding: '5px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{safeText(row.status)}</span></td>
                    <td style={{ padding: '14px' }}><button type="button" onClick={() => openDetails(row)} className="history-action" style={{ padding: '7px 10px', fontSize: 12 }}>View Details</button></td>
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
        <div role="presentation" onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15,23,42,.58)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <section role="dialog" aria-modal="true" aria-labelledby="history-detail-title" onClick={event => event.stopPropagation()} style={{ width: 'min(760px,100%)', maxHeight: '90vh', overflowY: 'auto', borderRadius: 18, padding: 24, background: 'var(--bg-dark)', border: '1px solid var(--border-color)', boxShadow: '0 24px 70px rgba(0,0,0,.3)' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
              <div><h2 id="history-detail-title" style={{ margin: 0, fontSize: 21 }}>{safeText(selectedActivity?.activity)}</h2><p style={{ color: 'var(--text-dim)', margin: '6px 0 0' }}>{formatDate(selectedActivity?.occurredAt)}</p></div>
              <button type="button" aria-label="Close details" onClick={() => setSelected(null)} className="history-action" style={{ padding: 8 }}><X size={18} /></button>
            </header>
            {detailLoading ? <p style={{ color: 'var(--text-dim)' }}>Loading activity details…</p> : null}
            {detailError && <p role="alert" style={{ color: '#dc2626' }}>{detailError}</p>}
            {!detailLoading && selectedDetailsData && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
                  <DetailBlock title="Reference" value={selectedActivity.referenceId} />
                  <DetailBlock title="Order ID" value={details.order?.referenceId || details.orderId || selectedActivity.orderId} />
                  <DetailBlock title="Customer" value={detailCustomer?.name || selectedActivity.customer?.name} subvalue={detailCustomer?.phone || selectedActivity.customer?.phone} />
                  <DetailBlock title="Amount" value={formatAmount(selectedActivity.amount)} />
                  <DetailBlock title="Status" value={selectedActivity.status} />
                  <DetailBlock title="Payment Method" value={details.paymentMethod || details.order?.paymentMethod} />
                </div>
                {detailCustomer?.address && <p style={{ color: 'var(--text-dim)', marginTop: 14 }}><strong>Customer address:</strong> {[detailCustomer.address, detailCustomer.city, detailCustomer.state, detailCustomer.pincode].filter(Boolean).join(', ')}</p>}
                {details.description && <p style={{ color: 'var(--text-dim)' }}>{details.description}</p>}
                {(details.items || details.order?.items || details.returnItems) && (
                  <DetailList title="Products" items={details.returnItems || details.items || details.order?.items} />
                )}
                {details.invoiceReferences?.length > 0 && <DetailBlock title="Invoice References" value={details.invoiceReferences.join(', ')} />}
                {details.invoiceNumber && <DetailBlock title="Invoice" value={details.invoiceNumber} />}
                {details.driverName && <DetailBlock title="Assigned Driver" value={details.driverName} subvalue={details.driverPhone} />}
                {details.relatedOrders?.length > 0 && (
                  <DetailList title="Related Orders" items={details.relatedOrders.map(order => ({
                    name: order.referenceId,
                    quantity: order.items?.length || 0,
                    unit: 'items',
                    amount: order.items?.reduce((total, item) => total + (Number(item.amount) || 0), 0)
                  }))} />
                )}
                {(details.pickup || details.order?.pickup || []).map((pickup, index) => (
                  <DetailBlock key={`${pickup.id || 'pickup'}-${index}`} title="Pickup" value={[pickup.status, pickup.scheduledDate && formatDate(pickup.scheduledDate)].filter(Boolean).join(' · ')} subvalue={pickup.driver?.name ? `${pickup.driver.name}${pickup.driver.phone ? ` · ${pickup.driver.phone}` : ''}` : ''} />
                ))}
                {selectedDetailsData.relatedTransactions?.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <h3 style={{ fontSize: 15 }}>Related transaction history</h3>
                    {selectedDetailsData.relatedTransactions.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border-color)' }}>
                        <span>{safeText(item.activity)} <small style={{ color: 'var(--text-dim)' }}>{formatDate(item.occurredAt)}</small></span>
                        <strong>{formatAmount(item.amount)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
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
      <div style={{ fontWeight: 650 }}>{safeText(value)}</div>
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
