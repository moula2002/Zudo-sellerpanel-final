import { useEffect, useState } from 'react';
import api from '../utils/api';
import { Truck, Package, CheckCircle, AlertCircle, User, FileText, Phone, RefreshCw } from 'lucide-react';
import Layout from '../components/Layout';
import { formatOrderNumber } from '../utils/orderFormat';

const completedPickupStatuses = new Set([
  'Picked Up',
  'Out for Delivery',
  'Shipped',
  'Delivered',
  'Partially Returned',
  'Returned'
]);

const formatMoney = (value) => {
  const amount = Number(value);
  return `₹${(Number.isFinite(amount) ? amount : 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const formatDate = (value) => {
  if (!value) return 'Not Scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not Scheduled';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isToday = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[character]);

const getOrderDisplayId = (order) => {
  if (order?.orderNumber !== undefined && order?.orderNumber !== null && String(order.orderNumber).trim()) {
    return formatOrderNumber(order);
  }
  if (order?.orderRef) return String(order.orderRef);
  return order?._id ? `#${String(order._id).slice(-6).toUpperCase()}` : 'Order ID unavailable';
};

const getCustomerAddress = (customer = {}) => [
  customer.address,
  customer.city,
  customer.state,
  customer.pincode
].filter(Boolean).join(', ');

const getCustomerDisplayName = (customer = {}) => {
  const name = customer.name?.trim() || customer.fullName?.trim();
  return name || 'Guest Customer';
};

const getDriverDisplayName = (driver, assignmentStatus) => {
  if (driver?.name?.trim()) return driver.name.trim();
  if (assignmentStatus === 'Assignment Pending') return 'Assignment Pending';
  return 'Not Assigned';
};

const PickupCard = ({ pickup, onGenerateInvoice }) => {
  const customer = pickup.customer || {};
  const driver = pickup.driver;
  const assignmentStatus = pickup.assignmentStatus || (driver ? 'Assigned' : 'Not Assigned');
  const customerName = getCustomerDisplayName(customer);
  const pickupReference = pickup.pickupId || pickup._id || 'Pickup ID unavailable';

  return (
    <div className="glass-card" style={{ padding: '16px', borderRadius: '20px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: pickup.status === 'Out for Delivery' ? '#22c55e' : '#6366f1' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.5px' }}>PICKUP ID</div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)', overflowWrap: 'anywhere' }}>{pickupReference}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Order {getOrderDisplayId(pickup)}</div>
        </div>
        <span style={{
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: 800,
          background: pickup.status === 'Out for Delivery' ? 'rgba(34, 197, 94, 0.1)' : pickup.status === 'Pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(99, 102, 241, 0.1)',
          color: pickup.status === 'Out for Delivery' ? '#22c55e' : pickup.status === 'Pending' ? '#f59e0b' : '#6366f1',
          border: `1px solid ${pickup.status === 'Out for Delivery' ? '#22c55e' : pickup.status === 'Pending' ? '#f59e0b' : '#6366f1'}20`
        }}>
          {(pickup.status || 'Pending').toUpperCase()}
        </span>
      </div>

      {pickup.pickupCode && (
        <div style={{ background: 'var(--glass-bg)', borderRadius: '16px', padding: '12px', textAlign: 'center', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600 }}>VERIFICATION CODE</div>
          <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '4px', color: 'var(--text-main)', fontFamily: 'monospace' }}>{pickup.pickupCode}</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <User size={16} color="#ec4899" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>{customerName}</div>
            {customer.phone && <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}><Phone size={10} /> {customer.phone}</div>}
            {getCustomerAddress(customer) && <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{getCustomerAddress(customer)}</div>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <Truck size={16} color="#6366f1" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
              {getDriverDisplayName(driver, assignmentStatus)}
            </div>
            {driver?.phone && <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}><Phone size={10} /> {driver.phone}</div>}
            {driver?.vehicleDetails && <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>{driver.vehicleDetails}</div>}
          </div>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
          Pickup date: <strong style={{ color: 'var(--text-main)' }}>{formatDate(pickup.scheduledDate)}</strong>
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '8px' }}>ITEMS DETAILS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pickup.items?.slice(0, 3).map((item, index) => (
            <div key={`${item.productId || item.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-main)', minWidth: 0 }}>
                {item.name || 'Product'}
                {item.unitLabel && <span style={{ display: 'block', color: 'var(--text-dim)' }}>{item.unitLabel}</span>}
                <span style={{ color: 'var(--text-dim)' }}>Qty: {item.quantity}</span>
              </span>
              <span style={{ color: 'var(--text-main)', whiteSpace: 'nowrap' }}>{formatMoney(item.amount)}</span>
            </div>
          ))}
          {pickup.items?.length > 3 && (
            <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: 600 }}>+{pickup.items.length - 3} more items</div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 8px', fontSize: '11px', marginBottom: '14px' }}>
        <span style={{ color: 'var(--text-dim)' }}>Items subtotal</span><span>{formatMoney(pickup.subtotal)}</span>
        <span style={{ color: 'var(--text-dim)' }}>GST / Tax</span><span>{formatMoney(pickup.taxAmount)}</span>
        <strong>Grand total</strong><strong style={{ color: '#22c55e' }}>{formatMoney(pickup.totalAmount)}</strong>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => onGenerateInvoice(pickup)}
          style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', padding: 0, cursor: 'pointer' }}
        >
          <FileText size={14} />
          Pickup Slip
        </button>
      </div>
    </div>
  );
};

const Pickups = () => {
  const [pickups, setPickups] = useState([]);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    const initData = async () => {
      setLoading(true);
      setError('');
      const [pickupsResult, sellerResult] = await Promise.allSettled([
        api.get('/sellers/pickups'),
        api.get('/sellers/me')
      ]);
      if (!active) return;

      if (pickupsResult.status === 'fulfilled' && Array.isArray(pickupsResult.value.data)) {
        setPickups(pickupsResult.value.data);
      } else {
        const requestError = pickupsResult.status === 'rejected'
          ? pickupsResult.reason
          : null;
        console.error('Failed to fetch pickup data:', requestError || 'Invalid pickup response');
        setPickups([]);
        setError(requestError?.response?.data?.message || 'Could not load pickups. Please retry.');
      }

      if (sellerResult.status === 'fulfilled') {
        setSeller(sellerResult.value.data);
      } else {
        console.error('Failed to fetch seller profile for pickup slips:', sellerResult.reason);
      }

      setLoading(false);
    };
    initData();
    return () => {
      active = false;
    };
  }, [retryKey]);

  const generateInvoice = (pickup) => {
    const invoiceWindow = window.open('', '_blank');
    if (!invoiceWindow) {
      window.alert('Please allow pop-ups to open the Pickup Slip.');
      return;
    }

    const customer = pickup.customer || {};
    const driver = pickup.driver;
    const sellerName = seller?.storeName || seller?.businessName || seller?.name || '';
    const sellerAddress = seller?.businessAddress || seller?.billingAddress || seller?.pickupLocation?.address || '';
    const orderId = getOrderDisplayId(pickup);
    const pickupId = pickup.pickupId || pickup._id || 'Pickup ID unavailable';
    const logoUrl = new URL('/logo.png', window.location.origin).href;
    const customerAddress = getCustomerAddress(customer);
    const items = (pickup.items || []).map(item => `
      <tr>
        <td class="description">${escapeHtml(item.name || 'Product')}${item.unitLabel ? `<span class="unit">${escapeHtml(item.unitLabel)}</span>` : ''}</td>
        <td class="qty-col">${escapeHtml(item.quantity)}</td>
        <td class="price-col">${formatMoney(item.amount)}</td>
      </tr>
    `).join('');
    const invoiceContent = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Pickup_Slip_${escapeHtml(orderId)}</title>
          <style>
            @page { size: A5; margin: 0; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 8mm; color: #0f172a; margin: 0; width: 148mm; min-height: 210mm; background: #fff; }
            .no-print { display: flex; gap: 12px; margin-bottom: 16px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; }
            .print-btn { padding: 9px 16px; background: #4338ca; color: white; border: 0; border-radius: 6px; cursor: pointer; font-weight: 700; }
            .content-wrapper { border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; }
            .header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid #4338ca; }
            .logo { display: block; width: 78px; height: auto; margin-bottom: 4px; }
            .slip-type { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; }
            .id-section { text-align: right; overflow-wrap: anywhere; }
            .id-label { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; }
            .id-value { font-size: 14px; font-weight: 800; }
            .pickup-id { font-size: 8px; color: #64748b; margin-top: 3px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
            .info-box h3 { font-size: 9px; color: #4338ca; text-transform: uppercase; margin: 0 0 5px; }
            .info-box p { margin: 0 0 3px; font-size: 9px; font-weight: 500; line-height: 1.4; overflow-wrap: anywhere; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            th { text-align: left; background: #f1f5f9; padding: 7px; font-size: 8px; text-transform: uppercase; }
            td { padding: 7px; border-top: 1px solid #e2e8f0; font-size: 9px; vertical-align: top; }
            .qty-col { text-align: center; width: 40px; }
            .price-col { text-align: right; width: 78px; white-space: nowrap; }
            .description { font-weight: 600; }
            .unit { display: block; color: #64748b; font-size: 8px; font-weight: 400; margin-top: 2px; }
            .summary { width: 175px; margin: 0 0 18px auto; }
            .summary-row { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; font-size: 9px; }
            .summary-row.total { border-top: 1px solid #cbd5e1; margin-top: 3px; padding-top: 7px; font-weight: 800; font-size: 11px; }
            .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 20px; }
            .sign-line { border-top: 1px dashed #94a3b8; height: 24px; }
            .sign-label { font-size: 8px; color: #475569; font-weight: 700; text-transform: uppercase; }
            .sign-detail { font-size: 8px; color: #475569; margin-top: 3px; }
            .footer { text-align: center; color: #64748b; font-size: 8px; padding-top: 10px; margin-top: 14px; border-top: 1px solid #e2e8f0; }
            @media print { .no-print { display: none; } body { padding: 8mm; } .content-wrapper { border: 0; padding: 0; } }
          </style>
        </head>
        <body>
          <div class="no-print"><button class="print-btn" onclick="window.print()">Print A5 Pickup Slip</button></div>
          <main class="content-wrapper">
            <header class="header">
              <div><img class="logo" src="${escapeHtml(logoUrl)}" alt="ZUDO"><div class="slip-type">Official Pickup Slip</div></div>
              <div class="id-section">
                <div class="id-label">Order ID</div>
                <div class="id-value">${escapeHtml(orderId)}</div>
                <div class="pickup-id">Pickup ID: ${escapeHtml(pickupId || 'Unavailable')}</div>
              </div>
            </header>
            <section class="info-grid">
              <div class="info-box">
                <h3>From (Seller)</h3>
                ${sellerName ? `<p><strong>${escapeHtml(sellerName)}</strong></p>` : ''}
                ${sellerAddress ? `<p>${escapeHtml(sellerAddress)}</p>` : ''}
                ${seller?.phone ? `<p>Phone: ${escapeHtml(seller.phone)}</p>` : ''}
                ${seller?.gstNumber ? `<p>GSTIN: ${escapeHtml(seller.gstNumber)}</p>` : ''}
              </div>
              <div class="info-box">
                <h3>To (Customer)</h3>
                <p><strong>${escapeHtml(getCustomerDisplayName(customer))}</strong></p>
                ${customerAddress ? `<p>${escapeHtml(customerAddress)}</p>` : ''}
                ${customer.phone ? `<p>Phone: ${escapeHtml(customer.phone)}</p>` : ''}
                <p>Pickup date: ${escapeHtml(formatDate(pickup.scheduledDate))}</p>
              </div>
            </section>
            <table>
              <thead><tr><th>Product description</th><th class="qty-col">Qty</th><th class="price-col">Amount</th></tr></thead>
              <tbody>${items}</tbody>
            </table>
            <section class="summary">
              <div class="summary-row"><span>Items subtotal</span><span>${formatMoney(pickup.subtotal)}</span></div>
              <div class="summary-row"><span>GST / Tax</span><span>${formatMoney(pickup.taxAmount)}</span></div>
              <div class="summary-row total"><span>Grand total</span><span>${formatMoney(pickup.totalAmount)}</span></div>
            </section>
            <section class="signature-section">
              <div><div class="sign-line"></div><div class="sign-label">Authorized Seller</div></div>
              <div><div class="sign-line"></div><div class="sign-label">Receiver / Driver</div>
                <div class="sign-detail">${escapeHtml(getDriverDisplayName(driver, pickup.assignmentStatus || (driver ? 'Assigned' : 'Not Assigned')))}</div>
                ${driver?.phone ? `<div class="sign-detail">${escapeHtml(driver.phone)}</div>` : ''}
              </div>
            </section>
            <footer class="footer">This is a system-generated pickup slip.</footer>
          </main>
        </body>
      </html>
    `;

    invoiceWindow.document.open();
    invoiceWindow.document.write(invoiceContent);
    invoiceWindow.document.close();
  };

  const filteredPickups = pickups.filter(pickup => {
    if (filterType === 'Pending / Packed' && !['Pending', 'Packed'].includes(pickup.status)) return false;
    if (filterType === 'Completed' && !completedPickupStatuses.has(pickup.status)) return false;

    const search = searchTerm.toLowerCase();
    const searchable = [
      pickup.customer?.name,
      pickup.customer?.phone,
      pickup.address,
      pickup.pickupId,
      pickup.totalAmount,
      getOrderDisplayId(pickup),
      ...(pickup.items || []).map(item => item.name)
    ].filter(Boolean).join(' ').toLowerCase();
    return searchable.includes(search);
  });

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>Pickups</h1>
          <p style={{ color: 'var(--text-dim)' }}>Track order pickups from your store.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
        <input
          type="text"
          placeholder="Search by order, customer, items or price..."
          className="input-field"
          style={{ flex: 1, minWidth: '260px' }}
          value={searchTerm}
          onChange={event => setSearchTerm(event.target.value)}
        />
        <div style={{ display: 'flex', gap: '8px', background: 'var(--glass-bg)', padding: '4px', borderRadius: '14px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
          {['All', 'Pending / Packed', 'Completed'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: filterType === type ? 'rgba(99, 102, 241, 0.1)' : 'transparent', color: filterType === type ? 'var(--primary)' : 'var(--text-dim)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '16px', borderRadius: '20px', textAlign: 'center', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
          <Truck size={24} color="var(--primary)" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>Scheduled Today</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>{pickups.filter(pickup => isToday(pickup.scheduledDate)).length}</div>
        </div>
        <div className="glass-card" style={{ padding: '16px', borderRadius: '20px', textAlign: 'center', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
          <AlertCircle size={24} color="#f59e0b" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>Pending / Packed</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>{pickups.filter(pickup => ['Pending', 'Packed'].includes(pickup.status)).length}</div>
        </div>
        <div className="glass-card" style={{ padding: '16px', borderRadius: '20px', textAlign: 'center', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
          <CheckCircle size={24} color="#22c55e" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>Completed Pickups</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>{pickups.filter(pickup => completedPickupStatuses.has(pickup.status)).length}</div>
        </div>
      </div>

      <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>Upcoming Pickups</h2>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><div className="animate-spin" style={{ display: 'inline-block' }}><Truck size={24} /></div></div>
      ) : error ? (
        <div className="glass-card" role="alert" style={{ padding: '32px', borderRadius: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
          <p>{error}</p>
          <button type="button" onClick={() => setRetryKey(current => current + 1)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      ) : filteredPickups.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px', borderRadius: '24px', textAlign: 'center' }}>
          <Package size={32} color="#64748b" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>No pickups found</h3>
          <p style={{ color: 'var(--text-dim)' }}>Pickup records matching your filters will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredPickups.map(pickup => (
            <PickupCard key={pickup.pickupId || pickup._id} pickup={pickup} onGenerateInvoice={generateInvoice} />
          ))}
        </div>
      )}
    </Layout>
  );
};

export default Pickups;
