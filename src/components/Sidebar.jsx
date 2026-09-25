import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Truck, 
  Settings, 
  LogOut,
  ChevronRight,
  Sun,
  Moon,
  FileSpreadsheet,
  RotateCcw,
  Rss,
  FileText,
  Layers
} from 'lucide-react';
import { useTheme } from '../utils/ThemeContext';

const SidebarItem = ({ to, icon: Icon, label }) => {
  const { isDarkMode } = useTheme();
  return (
    <NavLink 
      to={to} 
      end={to === '/' || to === '/products'} // Ensure exact match for root and products
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '12px',
        color: isActive ? 'var(--primary)' : 'var(--text-dim)',
        background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
        textDecoration: 'none',
        transition: 'all 0.3s ease',
        border: isActive ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent',
        fontWeight: isActive ? '600' : '400',
      })}
      className="sidebar-link"
    >
      <Icon size={20} />
      <span style={{ flex: 1 }}>{label}</span>
      <ChevronRight size={16} className="chevron" />
    </NavLink>
  );
};

import { getImageUrl } from '../utils/api';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [seller, setSeller] = React.useState(null);

  React.useEffect(() => {
    const userStr = localStorage.getItem('zudo_seller_user');
    if (userStr) {
      try {
        setSeller(JSON.parse(userStr));
      } catch (e) {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('zudo_seller_token');
    localStorage.removeItem('zudo_seller_user');
    navigate('/login');
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
            transition: 'opacity 0.3s ease'
          }}
          className="mobile-only"
        />
      )}

      <div style={{ 
        width: '280px', 
        height: '100vh', 
        position: 'fixed', 
        left: 0, 
        top: 0, 
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
        borderRight: '1px solid var(--border-color)',
        background: 'var(--sidebar-bg)',
        backdropFilter: 'blur(20px)',
        zIndex: 50,
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: typeof isOpen !== 'undefined' ? (isOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
        overflowY: 'auto',
      }} className="sidebar-container custom-scrollbar">
        <style>
          {`
            @media (min-width: 1025px) {
              .sidebar-container {
                transform: translateX(0) !important;
              }
            }
            .custom-scrollbar::-webkit-scrollbar {
              width: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(99, 102, 241, 0.1);
              border-radius: 10px;
            }
            .custom-scrollbar:hover::-webkit-scrollbar-thumb {
              background: rgba(99, 102, 241, 0.3);
            }
          `}
        </style>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 20px 0' }}>
          <img src="/logo.png" alt="Zudo Logo" style={{ maxWidth: '160px', height: 'auto', objectFit: 'contain' }} />
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem to="/categories" icon={Layers} label="Categories" />
          <SidebarItem to="/subcategories" icon={Layers} label="SubCategories" />
          <SidebarItem to="/products" icon={Package} label="Products" />
          <SidebarItem to="/products/bulk" icon={FileSpreadsheet} label="Bulk Upload" />
          <SidebarItem to="/feed-upload" icon={Rss} label="Feed Upload" />
          <SidebarItem to="/orders" icon={ShoppingBag} label="Orders" />
          <SidebarItem to="/returns" icon={RotateCcw} label="Returns" />
          <SidebarItem to="/invoices" icon={FileText} label="Invoices" />
          <SidebarItem to="/pickups" icon={Truck} label="Pickups" />
          <SidebarItem to="/settings" icon={Settings} label="Profile Settings" />
          
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <button 
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                color: 'var(--text-main)',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                cursor: 'pointer',
                width: '100%',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>
        </nav>

        <button 
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '12px',
            color: '#ef4444',
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.1)',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );
};

export default Sidebar;
