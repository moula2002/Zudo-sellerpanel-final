import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  Truck,
  Search,
  Filter,
  ExternalLink,
  ShoppingBag,
  Clock,
  CheckCircle,
  User,
  Phone,
  MapPin,
  XCircle,
  AlertCircle
} from 'lucide-react';
import Layout from '../components/Layout';

const StatusBadge = ({ status }) => {
  const configs = {
    'Packed': { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', icon: Clock },
    'Picked Up': { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', icon: CheckCircle },
  };

  const config = configs[status] || { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8', icon: AlertCircle };
  const Icon = config.icon;

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
      {status.toUpperCase()}
    </span>
  );
};

const Pickup = () => {
  const [orders, setOrders] = useState([]);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        const [ordersRes, sellerRes] = await Promise.all([
          api.get('/sellers/orders'),
          api.get('/sellers/me')
        ]);
        const pickupOrders = ordersRes.data.filter(o => o.orderStatus === 'Packed' || o.orderStatus === 'Picked Up');
        setOrders(pickupOrders);
        setSeller(sellerRes.data);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/sellers/orders');
      const pickupOrders = data.filter(o => o.orderStatus === 'Packed' || o.orderStatus === 'Picked Up');
      setOrders(pickupOrders);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  const generatePickupSlip = (order) => {
    const slipWindow = window.open('', '_blank');
    const sellerName = seller?.storeName || seller?.businessName || 'Zudo Seller';
    const sellerAddress = seller?.billingAddress || seller?.businessAddress || 'N/A';
    const sellerPhone = seller?.phone || 'N/A';

    const slipContent = `
      <html>
        <head>
          <title>Pickup_Slip_${order.orderId || order._id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
            @page { size: A5; margin: 0; }
            body { 
              font-family: 'Outfit', sans-serif; 
              padding: 8mm; 
              color: #0f172a; 
              margin: 0; 
              width: 148mm; 
              height: 210mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              background: #fff;
            }
            .no-print { 
              display: flex; gap: 12px; margin-bottom: 20px; padding: 12px; 
              background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;
              position: fixed; top: 8mm; left: 8mm; right: 8mm; z-index: 100;
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            .print-btn { 
              padding: 10px 20px; background: #6366f1; color: white; border: none; 
              border-radius: 8px; cursor: pointer; font-weight: 700; display: flex;
              align-items: center; gap: 8px; font-size: 13px;
            }
            .content-wrapper { margin-top: 55px; border: 1px solid #e2e8f0; padding: 15px; border-radius: 10px; flex: 1; display: flex; flex-direction: column; }
            
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #6366f1; padding-bottom: 15px; }
            .logo-section { display: flex; flex-direction: column; }
            .logo { font-size: 24px; font-weight: 800; color: #6366f1; letter-spacing: -1px; }
            .slip-type { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-top: -4px; }
            .id-section { text-align: right; }
            .id-label { font-size: 10px; color: #64748b; font-weight: 700; }
            .id-value { font-size: 16px; font-weight: 800; color: #0f172a; }

            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
            .info-box h3 { font-size: 9px; color: #6366f1; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px; font-weight: 800; }
            .info-box p { margin: 0; font-size: 11px; font-weight: 600; line-height: 1.5; color: #334155; }
            
            table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 20px; border: 1px solid #f1f5f9; border-radius: 8px; overflow: hidden; }
            th { text-align: left; background: #f8fafc; padding: 10px; font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700; }
            td { padding: 10px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #334155; }
            .qty-col { text-align: center; width: 40px; }
            .price-col { text-align: right; width: 80px; }

            .summary { margin-left: auto; width: 150px; margin-bottom: 30px; }
            .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .summary-label { font-size: 10px; color: #64748b; font-weight: 700; }
            .summary-value { font-size: 14px; font-weight: 800; color: #6366f1; }

            .signature-section { margin-top: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding: 20px 0; }
            .sign-container { display: flex; flex-direction: column; align-items: center; }
            .sign-line { width: 100%; border-top: 1px dashed #cbd5e1; margin-bottom: 8px; height: 40px; }
            .sign-label { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; }

            .footer { text-align: center; color: #94a3b8; font-size: 9px; padding-top: 15px; border-top: 1px solid #f1f5f9; }
            
            @media print { 
              .no-print { display: none; } 
              .content-wrapper { margin-top: 0; border: none; padding: 0; }
              body { padding: 8mm; }
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button class="print-btn" onclick="window.print()">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Print Premium Slip
            </button>
          </div>
          
          <div class="content-wrapper">
            <div class="header">
              <div class="logo-section">
                <div class="logo">ZUDO</div>
                <div class="slip-type">Official Pickup Slip</div>
              </div>
              <div class="id-section">
                <div class="id-label">ORDER ID</div>
                <div class="id-value">#${order.orderId || order._id.slice(-6).toUpperCase()}</div>
              </div>
            </div>
            
            <div class="info-grid">
              <div class="info-box">
                <h3>From (Seller)</h3>
                <p style="color: #0f172a; font-weight: 700;">${sellerName}</p>
                <p>${sellerAddress}</p>
                <p>📞 ${sellerPhone}</p>
              </div>
              <div class="info-box" style="text-align: right;">
                <h3>To (Customer)</h3>
                <p style="color: #0f172a; font-weight: 700;">${order.userId?.name || 'Guest'}</p>
                <p>${order.shippingAddress?.address}</p>
                <p>📅 ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th class="qty-col">Qty</th>
                  <th class="price-col">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td style="font-weight: 600;">${item.name || 'Product'}</td>
                    <td class="qty-col">${item.quantity}</td>
                    <td class="price-col">₹${item.price * item.quantity}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            ${(() => {
        const itemsSubtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const otherCharges = order.totalAmount - itemsSubtotal;
        return `
                <div class="summary">
                  <div class="summary-row">
                    <span class="summary-label">Items Subtotal</span>
                    <span class="summary-value" style="font-size: 11px; color: #64748b;">₹${itemsSubtotal}</span>
                  </div>
                  ${otherCharges > 0 ? `
                  <div class="summary-row">
                    <span class="summary-label">Other Charges</span>
                    <span class="summary-value" style="font-size: 11px; color: #64748b;">₹${otherCharges}</span>
                  </div>
                  ` : ''}
                  <div class="summary-row" style="border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
                    <span class="summary-label">Tax (0%)</span>
                    <span class="summary-value" style="font-size: 11px; color: #64748b;">₹0</span>
                  </div>
                  <div class="summary-row">
                    <span class="summary-label">Grand Total</span>
                    <span class="summary-value">₹${order.totalAmount}</span>
                  </div>
                </div>
              `;
      })()}

            <div class="signature-section">
              <div class="sign-container">
                <div class="sign-line"></div>
                <div class="sign-label">Authorized Seller</div>
              </div>
              <div class="sign-container">
                <div class="sign-line"></div>
                <div class="sign-label">Receiver / Driver</div>
              </div>
            </div>

            <div class="footer">
              <p>Thank you for choosing Zudo. This is a system-generated document.</p>
              <p style="margin-top: 4px; font-weight: 600;">zudo.com</p>
            </div>
          </div>
        </body>
      </html>
    `;
    slipWindow.document.close();
    slipWindow.document.write(slipContent);
  };

  const handleMarkPickedUp = async (orderId) => {
    if (!window.confirm('Mark this order as Picked Up?')) return;
    setUpdatingStatus(true);
    try {
      await api.post(`/orders/${orderId}/status`, { status: 'Picked Up' });
      fetchOrders();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const orderIdStr = order.orderId || order._id.slice(-6).toUpperCase();
    const customerName = order.userId?.name || 'Guest';
    const driverName = order.deliveryBoyId?.name || '';
    return orderIdStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driverName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>Driver Pickup</h1>
          <p style={{ color: 'var(--text-dim)' }}>Manage orders ready for driver collection.</p>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', marginBottom: '24px' }}>
        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
        <input
          type="text"
          placeholder="Search by Order ID, Customer, or Driver..."
          className="input-field"
          style={{ paddingLeft: '48px' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
            <div className="animate-spin" style={{ display: 'inline-block' }}><Truck size={32} color="#6366f1" /></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', background: 'var(--glass-bg)', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
            <AlertCircle size={40} color="var(--text-dim)" style={{ marginBottom: '16px' }} />
            <p style={{ color: 'var(--text-dim)' }}>No orders waiting for pickup.</p>
          </div>
        ) : filteredOrders.map((order) => (
          <div key={order._id} className="glass-card" style={{ padding: '24px', borderRadius: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '4px' }}>ORDER ID</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>#{order.orderId || order._id.slice(-6).toUpperCase()}</div>
                  <button
                    onClick={() => generatePickupSlip(order)}
                    style={{ background: 'rgba(99, 102, 241, 0.1)', border: 'none', color: '#6366f1', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Printer size={12} /> Slip
                  </button>
                </div>
              </div>
              <StatusBadge status={order.orderStatus} />
            </div>

            {/* Driver Section */}
            <div style={{
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.1)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Truck size={14} />
                ASSIGNED DRIVER
              </div>
              {(() => {
                const driver = order.driverId || order.deliveryBoyId;
                if (!driver) return (
                  <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                    No driver assigned yet.
                  </div>
                );

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                      {driver.name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{driver.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={10} /> {driver.phone}
                        </span>
                        {driver.vehicleDetails && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6366f1', fontWeight: 600 }}>
                            • {driver.vehicleDetails}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Customer & Items */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <User size={14} color="#64748b" />
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Customer: </span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{order.userId?.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={14} color="#64748b" />
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Items: </span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{order.items?.length} items</span>
              </div>
            </div>

            {/* Actions */}
            {order.orderStatus === 'Packed' && (
              <button
                onClick={() => handleMarkPickedUp(order._id)}
                disabled={updatingStatus}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: updatingStatus ? 0.7 : 1
                }}
              >
                <CheckCircle size={18} />
                Mark as Picked Up
              </button>
            )}

            {order.orderStatus === 'Picked Up' && (
              <div style={{
                textAlign: 'center',
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(34, 197, 94, 0.1)',
                color: '#22c55e',
                fontSize: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <CheckCircle size={18} />
                Successfully Picked Up
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default Pickup;
