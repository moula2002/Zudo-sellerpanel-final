import React, { useState, useCallback, useEffect } from 'react';
import { Clock, ShieldAlert, FileSearch, CheckCircle2, Loader2, RefreshCcw } from 'lucide-react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const VerificationPending = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const { data } = await api.get('/sellers/me');
      if (data.isVerified) {
        // Update local storage
        const user = JSON.parse(localStorage.getItem('zudo_seller_user') || '{}');
        user.isVerified = true;
        localStorage.setItem('zudo_seller_user', JSON.stringify(user));
        // Redirect to dashboard
        navigate('/');
      }
    } catch (err) {
      console.error('Status check failed:', err);
    } finally {
      setChecking(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [checkStatus]);
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'var(--bg-gradient)',
      padding: '20px'
    }}>
      <div className="glass-card" style={{ 
        maxWidth: '500px', 
        width: '100%', 
        padding: '48px', 
        borderRadius: '32px', 
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          background: 'rgba(99, 102, 241, 0.1)', 
          borderRadius: '24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 32px',
          color: '#6366f1'
        }}>
          <FileSearch size={40} className="animate-pulse" />
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-main)' }}>
          Documents Under Review
        </h1>
        
        <p style={{ color: 'var(--text-dim)', lineHeight: '1.6', marginBottom: '32px' }}>
          Your profile and legal documents have been submitted successfully. Our admin team is currently verifying your details. This process typically takes 24-48 hours.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
            <div style={{ color: '#22c55e' }}><CheckCircle2 size={18} /></div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>Profile Details Submitted</div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
            <div style={{ color: '#22c55e' }}><CheckCircle2 size={18} /></div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>Legal Documents Uploaded</div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '16px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <div style={{ color: '#6366f1' }}><Loader2 size={18} className="animate-spin" /></div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#6366f1' }}>Verification In Progress</div>
          </div>
        </div>

        <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <button 
            onClick={checkStatus} 
            disabled={checking}
            style={{
              padding: '16px',
              borderRadius: '16px',
              background: 'rgba(99, 102, 241, 0.1)',
              color: '#6366f1',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              transition: 'all 0.3s'
            }}
          >
            <RefreshCcw size={18} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Checking Status...' : 'Refresh Status Now'}
          </button>

          <div style={{ paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Need help? Contact support at <span style={{ color: '#6366f1', fontWeight: 600 }}>support@zudo.in</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationPending;
