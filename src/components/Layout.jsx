import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getImageUrl } from '../utils/api';

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const storedUserStr = localStorage.getItem('zudo_seller_user');
    const storedUser = storedUserStr ? JSON.parse(storedUserStr) : {};
    setUser(storedUser);
    const token = localStorage.getItem('zudo_seller_token');
    
    if (token && location.pathname !== '/verification-pending' && location.pathname !== '/complete-profile') {
      if (!storedUser.isVerified) {
        navigate('/verification-pending');
      }
    }
  }, [location.pathname, navigate]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-gradient)' }}>
      {/* Mobile Header */}
      <div 
        className="mobile-only"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '64px',
          background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          zIndex: 30,
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src="/logo.png" 
            alt="Zudo Logo" 
            style={{ 
              height: '40px',
              width: 'auto',
              objectFit: 'contain'
            }} 
          />
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-main)', 
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            background: 'var(--glass-bg)'
          }}
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main style={{ 
        flex: 1, 
        padding: '40px',
        maxWidth: '1400px',
        width: '100%',
        transition: 'all 0.3s ease',
      }} className="main-content">
        <style>
          {`
            @media (min-width: 1025px) {
              .main-content {
                margin-left: 280px;
                width: calc(100% - 280px) !important;
              }
            }
            @media (max-width: 1024px) {
              .main-content {
                margin-top: 64px;
                padding: 24px !important;
              }
            }
          `}
        </style>
        {children}
      </main>
    </div>
  );
};

export default Layout;
