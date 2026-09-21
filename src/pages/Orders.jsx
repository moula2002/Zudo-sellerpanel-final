import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api, { IMAGE_BASE_URL, getImageUrl } from '../utils/api';
import { ShoppingBag, Search, Filter, MoreHorizontal, Calendar, User, MapPin, ExternalLink, Clock, CheckCircle, Truck, XCircle, RefreshCcw, Download, FileText, Printer, Check, X } from 'lucide-react';
import Layout from '../components/Layout';

const StatusBadge = ({ status }) => {
  const configs = {
    'Pending': { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', icon: Clock },
    'Packed': { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', icon: CheckCircle },
    'Picked Up': { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', icon: Truck },
    'Processing': { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', icon: RefreshCcw },
    'Shipped': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', icon: Truck },
    'Delivered': { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', icon: CheckCircle },
    'Cancelled': { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', icon: XCircle },
    'Rejected by Seller': { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', icon: XCircle },
  };

  const config = configs[status] || configs['Pending'];
  const Icon = config.icon || Clock;

  return (
    <span style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 700,
      background: config.bg,
      color: config.color,
      border: `1px solid ${config.color}20`
    }}>
      <Icon size={12} />
      {status?.toUpperCase()}
    </span>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [orderTypeFilter, setOrderTypeFilter] = useState('All');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const exportToExcel = () => {
    const data = filteredOrders.map(order => ({
      'Order ID': order.orderId || order._id,
      'Date': new Date(order.createdAt).toLocaleDateString(),
      'Time': new Date(order.createdAt).toLocaleTimeString(),
      'Customer': order.userId?.name || 'Guest',
      'Phone': order.userId?.phone || order.shippingAddress?.phone,
      'Status': order.orderStatus,
      'Total Amount': `₹${order.totalAmountWithoutCommissions !== undefined ? order.totalAmountWithoutCommissions : (order.sellerItemsNetTotal !== undefined ? order.sellerItemsNetTotal : order.totalAmount)}`,
      'Payment Method': order.paymentMethod,
      'Items Count': order.items?.length || 0,
      'Address': order.shippingAddress?.address,
      'City': order.shippingAddress?.city,
      'Pincode': order.shippingAddress?.pincode,
      'Items': order.items?.map(i => `${i.name} (x${i.quantity})`).join(', ')
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(workbook, `Orders_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdatingStatus(true);
    try {
      await api.post(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
      setSelectedOrder(prev => prev ? { ...prev, orderStatus: newStatus } : null);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const OrderDetailPanel = ({ order, onClose }) => {
    if (!order) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '500px',
        height: '100vh',
        background: 'var(--bg-dark)',
        borderLeft: '1px solid var(--border-color)',
        boxShadow: '-20px 0 50px rgba(0,0,0,0.5)',
        zIndex: 1000,
        padding: '32px',
        overflowY: 'auto',
        transition: 'transform 0.3s ease-in-out',
      }} className="order-detail-panel">
        <style>
          {`
            @media (max-width: 600px) {
              .order-detail-panel {
                width: 100% !important;
                padding: 24px !important;
              }
            }
          `}
        </style>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>Order Details</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <XCircle size={24} />
          </button>
        </div>

        {/* Customer & Status */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>ORDER ID</div>
              <div style={{ fontWeight: 700, fontSize: '18px', color: '#6366f1' }}>#{order.orderId || order._id.slice(-6).toUpperCase()}</div>
            </div>
            <StatusBadge status={order.orderStatus} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', borderRadius: '10px' }}>
                <User size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{order.userId?.name || 'Guest'}</div>
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    background: order.userId?.role === 'b2b' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(236, 72, 153, 0.1)',
                    color: order.userId?.role === 'b2b' ? '#6366f1' : '#ec4899',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    {order.userId?.role || 'B2C'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{order.userId?.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '10px' }}>
                <MapPin size={18} />
              </div>
              <div>
                <div style={{ fontSize: '13px', lineHeight: '1.5' }}>{order.shippingAddress?.address}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{order.shippingAddress?.city}, {order.shippingAddress?.pincode}</div>
              </div>
            </div>

            {/* Driver Info */}
            {(order.driverId || order.deliveryBoyId) && (
              <div style={{
                marginTop: '12px',
                padding: '16px',
                background: 'rgba(99, 102, 241, 0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(99, 102, 241, 0.1)'
              }}>
                <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={14} />
                  ASSIGNED DRIVER
                </div>
                {(() => {
                  const driver = order.driverId || order.deliveryBoyId;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                        {driver.name?.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{driver.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{driver.phone}</span>
                          {driver.vehicleDetails && <span style={{ color: '#6366f1' }}>• {driver.vehicleDetails}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Items Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {order.items?.map((item, idx) => (
              <div key={idx} style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                padding: '12px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <img
                  src={getImageUrl(item.image)}
                  alt=""
                  style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                  onError={(e) => e.target.src = 'https://placehold.co/48'}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    Qty: {item.quantity} × ₹{item.netPrice !== undefined ? item.netPrice : item.price}
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                  ₹{item.netTotal !== undefined ? item.netTotal : (item.quantity * item.price)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/sellers/orders');
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const orderIdStr = order.orderId || order._id.slice(-6).toUpperCase();
    const customerName = order.userId?.name || 'Guest';
    const matchesSearch = orderIdStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' 
      ? true 
      : statusFilter === 'Returns'
        ? order.items && order.items.some(i => i.returnStatus && i.returnStatus !== 'None')
        : order.orderStatus === statusFilter;

    // Order Type Filter (B2B / B2C)
    const matchesType = orderTypeFilter === 'All' ||
      (orderTypeFilter === 'B2B' && order.userId?.role === 'b2b') ||
      (orderTypeFilter === 'B2C' && order.userId?.role === 'b2c');

    // Date Filtering
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

  return (
    <Layout>
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            .glass-card { border: none !important; box-shadow: none !important; background: white !important; color: black !important; }
            body { background: white !important; color: black !important; }
            table { width: 100% !important; border: 1px solid #ddd !important; }
            th, td { border: 1px solid #ddd !important; color: black !important; }
          }
        `}
      </style>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '20px'
      }} className="no-print">
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>Orders</h1>
          <p style={{ color: 'var(--text-dim)' }}>Monitor and manage your customer orders.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            background: 'white',
            padding: '8px 16px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <Calendar size={16} color="#64748b" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              style={{ background: 'transparent', border: 'none', color: '#1e293b', fontSize: '13px', outline: 'none', fontWeight: '500' }}
            />
            <span style={{ color: '#94a3b8', fontWeight: '500' }}>to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              style={{ background: 'transparent', border: 'none', color: '#1e293b', fontSize: '13px', outline: 'none', fontWeight: '500' }}
            />
          </div>

          <button
            onClick={exportToExcel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: 'white',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Download size={18} />
            Export Excel
          </button>
          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              color: 'white',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Printer size={18} />
            Print PDF
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }} className="no-print">
        <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search orders..."
            className="input-field"
            style={{ paddingLeft: '48px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {/* Order Type Filter */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--glass-bg)', padding: '4px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
            {['All', 'B2B', 'B2C'].map(type => (
              <button
                key={type}
                onClick={() => setOrderTypeFilter(type)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: orderTypeFilter === type ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  color: orderTypeFilter === type ? '#6366f1' : 'var(--text-dim)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', gap: '8px', background: 'var(--glass-bg)', padding: '4px', borderRadius: '14px', border: '1px solid var(--border-color)', overflowX: 'auto' }} className="hide-scrollbar">
            {['All', 'Pending', 'Processing', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returns'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: statusFilter === s ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  color: statusFilter === s ? '#6366f1' : 'var(--text-dim)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="glass-card desktop-only" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--glass-bg)' }}>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>ORDER ID</th>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>DATE</th>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>CUSTOMER</th>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>ITEMS</th>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>TOTAL</th>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>STATUS</th>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ padding: '40px', textAlign: 'center' }}>
                  <div className="animate-spin" style={{ display: 'inline-block' }}><ShoppingBag size={24} /></div>
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  No orders found yet.
                </td>
              </tr>
            ) : filteredOrders.map((order) => (
              <tr key={order._id} style={{ borderBottom: '1px solid var(--border-color)' }} className="table-row-hover">
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#6366f1' }}>#{order.orderId || order._id.slice(-6).toUpperCase()}</div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-main)' }}>{new Date(order.createdAt).toLocaleDateString()}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-main)' }}>{order.userId?.name || 'Guest'}</div>
                    <span style={{
                      fontSize: '9px',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      background: order.userId?.role === 'b2b' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(236, 72, 153, 0.1)',
                      color: order.userId?.role === 'b2b' ? '#6366f1' : '#ec4899',
                      fontWeight: 800,
                      textTransform: 'uppercase'
                    }}>
                      {order.userId?.role || 'B2C'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{order.userId?.phone || order.shippingAddress?.phone}</div>
                </td>
                <td style={{ padding: '16px 24px', fontSize: '14px' }}>
                  {order.items?.length || 0} items
                </td>
                <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 600 }}>
                  ₹{order.totalAmountWithoutCommissions !== undefined ? order.totalAmountWithoutCommissions : (order.sellerItemsNetTotal !== undefined ? order.sellerItemsNetTotal : order.totalAmount)}
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <StatusBadge status={order.orderStatus} />
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {(order.orderStatus === 'Pending' || !order.orderStatus) && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateOrderStatus(order._id, 'Packed');
                          }}
                          disabled={updatingStatus}
                          title="Accept & Mark as Packed"
                          style={{
                            padding: '8px 12px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Check size={14} /> Accept
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateOrderStatus(order._id, 'Rejected by Seller');
                          }}
                          disabled={updatingStatus}
                          title="Reject Order"
                          style={{
                            padding: '8px 12px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <X size={14} /> Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedOrder(order)}
                      title="View Details"
                      style={{ padding: '8px', borderRadius: '8px', background: 'var(--glass-bg)', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                    >
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div className="animate-spin" style={{ display: 'inline-block' }}><ShoppingBag size={24} /></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
            No orders found yet.
          </div>
        ) : filteredOrders.map((order) => (
          <div
            key={order._id}
            className="glass-card"
            style={{ padding: '16px', borderRadius: '20px' }}
            onClick={() => setSelectedOrder(order)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, color: '#6366f1' }}>#{order.orderId || order._id.slice(-6).toUpperCase()}</div>
              <StatusBadge status={order.orderStatus} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>{order.userId?.name || 'Guest'}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{new Date(order.createdAt).toLocaleDateString()}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: '16px' }}>₹{order.totalAmountWithoutCommissions !== undefined ? order.totalAmountWithoutCommissions : (order.sellerItemsNetTotal !== undefined ? order.sellerItemsNetTotal : order.totalAmount)}</div>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>{order.items?.length} items</div>
          </div>
        ))}
      </div>

      {selectedOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 999
        }} onClick={() => setSelectedOrder(null)}>
          <div onClick={e => e.stopPropagation()}>
            <OrderDetailPanel
              order={selectedOrder}
              onClose={() => setSelectedOrder(null)}
            />
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Orders;
