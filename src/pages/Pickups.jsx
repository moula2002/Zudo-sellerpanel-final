import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Truck, Calendar, Clock, MapPin, Package, CheckCircle, AlertCircle, Plus, ChevronRight, User, FileText } from 'lucide-react';
import Layout from '../components/Layout';

const PickupCard = ({ pickup, onGenerateInvoice }) => (
  <div className="glass-card" style={{ padding: '16px', borderRadius: '20px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: pickup.status === 'Out for Delivery' ? '#22c55e' : '#6366f1' }}></div>
    
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.5px' }}>PICKUP ID</div>
        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)' }}>#{pickup.pickupId}</div>
      </div>
      <span style={{ 
        padding: '4px 10px', 
        borderRadius: '12px', 
        fontSize: '10px', 
        fontWeight: 800,
        background: pickup.status === 'Out for Delivery' ? 'rgba(34, 197, 94, 0.1)' : 
                   pickup.status === 'Pending' ? 'rgba(245, 158, 11, 0.1)' : 
                   'rgba(99, 102, 241, 0.1)',
        color: pickup.status === 'Out for Delivery' ? '#22c55e' : 
               pickup.status === 'Pending' ? '#f59e0b' : 
               '#6366f1',
        border: `1px solid ${pickup.status === 'Out for Delivery' ? '#22c55e' : pickup.status === 'Pending' ? '#f59e0b' : '#6366f1'}20`
      }}>
        {(pickup.status || 'Pending').toUpperCase()}
      </span>
    </div>

    <div style={{ 
      background: 'var(--glass-bg)', 
      borderRadius: '16px', 
      padding: '12px', 
      textAlign: 'center',
      marginBottom: '16px',
      border: '1px solid var(--border-color)'
    }}>
      <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600 }}>VERIFICATION CODE</div>
      <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '4px', color: 'var(--text-main)', fontFamily: 'monospace' }}>
        {pickup.pickupCode}
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
      {/* Customer Info - Compact */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={16} color="#ec4899" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pickup.customer?.name || 'Guest Customer'}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pickup.address}</div>
        </div>
      </div>

      {/* Driver Info - Compact */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Truck size={16} color="#6366f1" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>{pickup.driver?.name || 'Assigning...'}</div>
          {pickup.driver?.vehicleDetails && (
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
              {pickup.driver.vehicleDetails}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Items Details - New Section */}
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginBottom: '16px' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '8px' }}>ITEMS DETAILS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {pickup.items?.slice(0, 3).map((item, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>{item.name}</span>
            <span style={{ color: 'var(--text-dim)' }}>x{item.quantity}</span>
          </div>
        ))}
        {pickup.items?.length > 3 && (
          <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: 600 }}>+{pickup.items.length - 3} more items</div>
        )}
      </div>
    </div>

    {/* Footer - Compact */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <button 
        onClick={() => onGenerateInvoice(pickup)}
        style={{
          background: 'none',
          border: 'none',
          color: '#6366f1',
          fontSize: '11px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: 0,
          cursor: 'pointer'
        }}
      >
        <FileText size={14} />
        Pickup Slip
      </button>
      <div style={{ fontSize: '14px', fontWeight: 800, color: '#22c55e' }}>₹{pickup.totalAmount}</div>
    </div>
  </div>
);

const Pickups = () => {
  const [pickups, setPickups] = useState([]);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    const initData = async () => {
      try {
        const [pickupsRes, sellerRes] = await Promise.all([
          api.get('/sellers/pickups'),
          api.get('/sellers/me')
        ]);
        setPickups(pickupsRes.data);
        setSeller(sellerRes.data);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const generateInvoice = (pickup) => {
    const invoiceWindow = window.open('', '_blank');
    const sellerName = seller?.storeName || seller?.businessName || 'Zudo Seller';
    const sellerAddress = seller?.billingAddress || seller?.businessAddress || 'N/A';
    const sellerPhone = seller?.phone || 'N/A';

    const invoiceContent = `
      <html>
        <head>
          <title>Pickup_Slip_${pickup.pickupId}</title>
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
            <div style="font-size: 12px; color: #64748b; align-self: center;">
              Optimized for A5 Professional Printing
            </div>
          </div>
          
          <div class="content-wrapper">
            <div class="header">
              <div class="logo-section">
                <div class="logo">ZUDO</div>
                <div class="slip-type">Official Pickup Slip</div>
              </div>
              <div class="id-section">
                <div class="id-label">ORDER ID</div>
                <div class="id-value">#${pickup.pickupId}</div>
              </div>
            </div>
            
            <div class="info-grid">
              <div class="info-box">
                <h3>From (Seller)</h3>
                <p style="color: #0f172a; font-weight: 700;">${sellerName}</p>
                <p>${sellerAddress}</p>
                <p>📞 ${sellerPhone}</p>
                ${seller?.gstNumber ? `<p><strong>GSTIN:</strong> ${seller.gstNumber}</p>` : ''}
              </div>
              <div class="info-box" style="text-align: right;">
                <h3>To (Customer)</h3>
                <p style="color: #0f172a; font-weight: 700;">${pickup.customer?.name || 'Guest'}</p>
                <p>${pickup.address}</p>
                <p>📅 ${new Date(pickup.scheduledDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
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
                ${pickup.items.map(item => `
                  <tr>
                    <td style="font-weight: 600;">${item.name || 'Product'}</td>
                    <td class="qty-col">${item.quantity}</td>
                    <td class="price-col">₹${item.price * item.quantity}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            ${(() => {
              const itemsSubtotal = pickup.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
              const otherCharges = pickup.totalAmount - itemsSubtotal;
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
                    <span class="summary-value">₹${pickup.totalAmount}</span>
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

    invoiceWindow.document.write(invoiceContent);
    invoiceWindow.document.close();
  };

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>Pickups</h1>
          <p style={{ color: 'var(--text-dim)' }}>Schedule and track order pickups from your store.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
          <input 
            type="text" 
            placeholder="Search by customer, items or price..." 
            className="input-field"
            style={{ width: '100%', paddingLeft: '48px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>
            <Package size={20} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: 'var(--glass-bg)', padding: '4px', borderRadius: '14px', border: '1px solid var(--border-color)', overflowX: 'auto' }} className="hide-scrollbar">
          {['All', 'Pending / Packed', 'Completed'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: filterType === type ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                color: filterType === type ? 'var(--primary)' : 'var(--text-dim)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px', 
        marginBottom: '32px' 
      }}>
        <div className="glass-card" style={{ padding: '16px', borderRadius: '20px', textAlign: 'center', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
          <Truck size={24} color="var(--primary)" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>Scheduled Today</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>{pickups.filter(p => new Date(p.scheduledDate).toDateString() === new Date().toDateString()).length}</div>
        </div>
        <div className="glass-card" style={{ padding: '16px', borderRadius: '20px', textAlign: 'center', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
          <AlertCircle size={24} color="#f59e0b" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>Pending / Packed</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>{pickups.filter(p => ['Pending', 'Packed'].includes(p.status)).length}</div>
        </div>
        <div className="glass-card" style={{ padding: '16px', borderRadius: '20px', textAlign: 'center', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
          <CheckCircle size={24} color="#22c55e" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>Completed Pickups</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>{pickups.filter(p => !['Pending', 'Packed'].includes(p.status)).length}</div>
        </div>
      </div>

      <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>Upcoming Pickups</h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="animate-spin" style={{ display: 'inline-block' }}><Truck size={24} /></div>
        </div>
      ) : pickups.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px', borderRadius: '24px', textAlign: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Truck size={32} color="#64748b" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>No pickups scheduled</h3>
          <p style={{ color: 'var(--text-dim)', marginBottom: '24px' }}>Schedule your first pickup to get your orders moving.</p>
          <button className="btn-primary" style={{ margin: '0 auto' }}>
            Schedule Now
          </button>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '20px' 
        }}>
          {pickups
            .filter(p => {
              // 1. Filter by Type
              if (filterType === 'Pending / Packed') {
                if (!['Pending', 'Packed'].includes(p.status)) return false;
              } else if (filterType === 'Completed') {
                if (['Pending', 'Packed'].includes(p.status)) return false;
              }

              // 2. Filter by Search Term
              const customerName = (p.customer?.name || '').toLowerCase();
              const itemNames = (p.items || []).map(i => (i.name || '').toLowerCase()).join(' ');
              const price = (p.totalAmount || '').toString();
              const search = searchTerm.toLowerCase();
              
              return customerName.includes(search) || 
                     itemNames.includes(search) || 
                     price.includes(search) ||
                     (p.pickupId || '').toLowerCase().includes(search);
            })
            .map(pickup => <PickupCard key={pickup._id} pickup={pickup} onGenerateInvoice={generateInvoice} />)
          }
        </div>
      )}
    </Layout>
  );
};

export default Pickups;
