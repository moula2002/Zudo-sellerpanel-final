import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getImageUrl } from '../utils/api';
import { Store, MapPin, Phone, Building2, Package, ShoppingBag, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import Layout from '../components/Layout';

const StatCard = ({ icon: Icon, label, value, color, onClick }) => (
  <div 
    className="glass-card" 
    style={{ 
      padding: '24px', 
      borderRadius: '24px', 
      display: 'flex', 
      gap: '16px', 
      alignItems: 'center',
      cursor: onClick ? 'pointer' : 'default'
    }}
    onClick={onClick}
  >
    <div style={{ padding: '12px', background: `${color}1a`, color: color, borderRadius: '12px' }}>
      <Icon size={24} />
    </div>
    <div>
      <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)' }}>{value}</div>
    </div>
  </div>
);

const ActionButton = ({ icon: Icon, label, onClick, color }) => (
  <button 
    onClick={onClick}
    style={{ 
      width: '100%', 
      justifyContent: 'space-between',
      background: 'var(--card-bg)',
      border: '1px solid var(--border-color)',
      padding: '16px 20px',
      borderRadius: '16px',
      color: 'var(--text-main)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ color: color || '#6366f1' }}><Icon size={20} /></div>
      <span style={{ fontWeight: 600 }}>{label}</span>
    </div>
    <ArrowRight size={16} color="#64748b" />
  </button>
);

const Dashboard = () => {
  const [seller, setSeller] = useState(null);
  const [stats, setStats] = useState({ todayOrders: 0, totalOrders: 0, outstandingPayments: 0, lowStockCount: 0, lowStockProducts: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, statsRes] = await Promise.all([
          api.get('/sellers/me'),
          api.get('/sellers/stats').catch(() => ({ data: { todayOrders: 0, totalOrders: 0, outstandingPayments: 0, lowStockCount: 0, lowStockProducts: [] } }))
        ]);
        setSeller(profileRes.data);
        setStats(statsRes.data);
        
        // Sync isVerified status to localStorage
        const user = JSON.parse(localStorage.getItem('zudo_seller_user') || '{}');
        if (user.isVerified !== profileRes.data.isVerified) {
          user.isVerified = profileRes.data.isVerified;
          localStorage.setItem('zudo_seller_user', JSON.stringify(user));
          if (!user.isVerified) navigate('/verification-pending');
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        if (err.response?.status === 401) navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <TrendingUp className="animate-spin" size={40} color="#6366f1" />
    </div>
  );

  return (
    <Layout>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-main)' }}>
          Welcome back, <span className="gradient-text">{seller?.name?.split(' ')[0]}</span> 
        </h1>
        <p style={{ color: 'var(--text-dim)' }}>Here's what's happening with your store today.</p>
      </header>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '24px', 
        marginBottom: '40px' 
      }}>
        <StatCard 
          icon={ShoppingBag} 
          label="Today's Orders" 
          value={stats.todayOrders || 0} 
          color="#6366f1" 
          onClick={() => navigate('/orders')}
        />
        <StatCard 
          icon={Package} 
          label="Total Orders" 
          value={stats.totalOrders || 0} 
          color="#ec4899" 
          onClick={() => navigate('/orders')}
        />
        <StatCard 
          icon={TrendingUp} 
          label="Outstanding" 
          value={`₹${(stats.outstandingPayments || 0).toLocaleString()}`} 
          color="#22c55e" 
        />
        <StatCard 
          icon={Package} 
          label="Low Stock Alert" 
          value={stats.lowStockCount || 0} 
          color="#ef4444" 
          onClick={() => navigate('/products')}
        />
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '32px' 
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="glass-card" style={{ padding: '32px', borderRadius: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Store Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', borderRadius: '12px', height: 'fit-content' }}><Store size={20} /></div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Store Name</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>{seller?.storeName || seller?.businessName}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ padding: '10px', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', borderRadius: '12px', height: 'fit-content' }}><Phone size={20} /></div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Phone</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>{seller?.phone}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ padding: '10px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderRadius: '12px', height: 'fit-content' }}><Building2 size={20} /></div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Billing Address</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.4, color: 'var(--text-main)' }}>{seller?.billingAddress || seller?.businessAddress}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '12px', height: 'fit-content' }}><MapPin size={20} /></div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Pickup Point</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>{seller?.pickupLocation?.address || 'Set your location'}</div>
                </div>
              </div>
            </div>
          </div>

          {stats.lowStockProducts?.length > 0 && (
            <div className="glass-card" style={{ padding: '32px', borderRadius: '32px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>Low Stock Alert</h2>
                <button onClick={() => navigate('/products')} style={{ fontSize: '12px', color: '#6366f1', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>View All</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {stats.lowStockProducts.map(product => (
                  <div key={product._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                        <img src={getImageUrl(product.imageUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/48x48?text=No+Image'; }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{product.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>₹{product.price}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>{product.stock} left</div>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>STOCK LOW</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="glass-card" style={{ padding: '32px', borderRadius: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Quick Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ActionButton 
                icon={Plus} 
                label="Add New Product" 
                color="#6366f1"
                onClick={() => navigate('/products/add')} 
              />
              <ActionButton 
                icon={ShoppingBag} 
                label="Manage Orders" 
                color="#ec4899"
                onClick={() => navigate('/orders')} 
              />
              <ActionButton 
                icon={Package} 
                label="Inventory" 
                color="#8b5cf6"
                onClick={() => navigate('/products')} 
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
