import React, { useState, useEffect } from 'react';
import api, { getImageUrl } from '../utils/api';
import { RefreshCcw, Search, User, MapPin, Package, AlertCircle, Calendar, ExternalLink, XCircle } from 'lucide-react';
import Layout from '../components/Layout';

const Returns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReturn, setSelectedReturn] = useState(null);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const { data } = await api.get('/sellers/returns');
      setReturns(data);
    } catch (err) {
      console.error('Failed to fetch returns:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReturns = returns.filter(ret => {
    const orderIdStr = ret.orderId || ret._id.slice(-6).toUpperCase();
    const customerName = ret.userId?.name || 'Guest';
    return orderIdStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
           customerName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleItemReturnAction = async (orderId, itemId, status) => {
    try {
      await api.put(`/orders/${orderId}/items/${itemId}/return-status`, { status });
      fetchReturns();
      setSelectedOrder(null);
    } catch (error) {
      alert('Failed to update return status');
    }
  };

  const ReturnDetailPanel = ({ order, onClose }) => {
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
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>Return Details</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <XCircle size={24} />
          </button>
        </div>

        <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>ORDER ID</div>
              <div style={{ fontWeight: 700, fontSize: '18px', color: '#6366f1' }}>#{order.orderId || order._id.slice(-6).toUpperCase()}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>STATUS</div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#ef4444' }}>{order.orderStatus.toUpperCase()}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', borderRadius: '10px' }}>
                <User size={18} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{order.userId?.name || 'Guest'}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{order.userId?.phone}</div>
              </div>
            </div>
            

          </div>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Items to Return</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {order.items?.filter(item => item.returnStatus && item.returnStatus !== 'None').map((item, idx) => (
            <div key={idx} style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '12px', 
              padding: '16px',
              background: 'rgba(245, 158, 11, 0.05)',
              border: '1px dashed #f59e0b',
              borderRadius: '16px'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img src={getImageUrl(item.image)} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/48x48?text=No+Image'; }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Qty: {item.quantity} × ₹{item.price}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>Status: {item.returnStatus.toUpperCase()}</div>
                </div>
              </div>
              
              <div style={{ fontSize: '13px', color: 'var(--text-dim)', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                <strong style={{ color: 'var(--text-main)' }}>Reason:</strong> {item.returnReason || 'No reason provided'}
                {item.returnComment && <div style={{ marginTop: '8px' }}><strong style={{ color: 'var(--text-main)' }}>Comment:</strong> {item.returnComment}</div>}
                
                {item.refundBankName && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Refund Bank Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div><strong style={{ color: 'var(--text-main)' }}>Bank:</strong> {item.refundBankName}</div>
                      <div><strong style={{ color: 'var(--text-main)' }}>A/C Name:</strong> {item.refundAccountName}</div>
                      <div><strong style={{ color: 'var(--text-main)' }}>A/C No:</strong> {item.refundAccountNumber}</div>
                      <div><strong style={{ color: 'var(--text-main)' }}>IFSC:</strong> {item.refundIfscCode}</div>
                    </div>
                  </div>
                )}
              </div>

              {item.returnImage && (
                <a href={getImageUrl(item.returnImage)} target="_blank" rel="noopener noreferrer">
                  <img src={getImageUrl(item.returnImage)} alt="Return proof" style={{ width: '100px', height: '100px', borderRadius: '8px', objectFit: 'cover' }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100?text=No+Image'; }} />
                </a>
              )}
              
              {item.returnStatus === 'Return Requested' && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button 
                    onClick={() => handleItemReturnAction(order._id, item._id, 'Return Approved')} 
                    className="btn-primary" 
                    style={{ flex: 1, padding: '8px', fontSize: '12px', background: '#10b981' }}
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleItemReturnAction(order._id, item._id, 'Return Rejected')} 
                    className="btn-primary" 
                    style={{ flex: 1, padding: '8px', fontSize: '12px', background: '#ef4444' }}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>Return Orders</h1>
        <p style={{ color: 'var(--text-dim)' }}>Manage and track customer return requests.</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input 
            type="text" 
            placeholder="Search return orders..." 
            className="input-field"
            style={{ paddingLeft: '48px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--glass-bg)' }}>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>ORDER ID</th>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>CUSTOMER</th>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>RETURN REASON</th>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>STATUS</th>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center' }}>
                  <RefreshCcw className="animate-spin" size={24} />
                </td>
              </tr>
            ) : filteredReturns.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  No return orders found.
                </td>
              </tr>
            ) : filteredReturns.map((order) => (
              <tr key={order._id} style={{ borderBottom: '1px solid var(--border-color)' }} className="table-row-hover">
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ fontWeight: 600, color: '#6366f1' }}>#{order.orderId || order._id.slice(-6).toUpperCase()}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{new Date(order.updatedAt).toLocaleDateString()}</div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{order.userId?.name || 'Guest'}</div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: 600 }}>
                    {order.items && order.items.length > 0 
                      ? (order.items[0].returnReason || 'Reason not specified') 
                      : 'Reason not specified'}
                  </div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    {order.orderStatus.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <button 
                    onClick={() => setSelectedReturn(order)}
                    style={{ padding: '8px', borderRadius: '8px', background: 'var(--glass-bg)', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                  >
                    <ExternalLink size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedReturn && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.5)', 
          backdropFilter: 'blur(4px)',
          zIndex: 999 
        }} onClick={() => setSelectedReturn(null)}>
          <div onClick={e => e.stopPropagation()}>
            <ReturnDetailPanel 
              order={selectedReturn} 
              onClose={() => setSelectedReturn(null)} 
            />
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Returns;
