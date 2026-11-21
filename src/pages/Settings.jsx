import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { User, Store, Phone, Mail, Building2, MapPin, Loader2, ShieldCheck, Lock, FileText, CheckCircle2 } from 'lucide-react';
import Layout from '../components/Layout';

const InfoRow = ({ label, value, icon: Icon, color, badge }) => (
  <div style={{ display: 'flex', gap: '16px', padding: '16px 0', borderBottom: '1px solid var(--border-color)', alignItems: 'flex-start' }}>
    <div style={{
      color: color || 'var(--primary)',
      marginTop: '2px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      background: 'var(--glass-bg)',
      border: '1px solid var(--border-color)',
      flexShrink: 0
    }}>
      <Icon size={18} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: 500, lineHeight: 1.5, wordBreak: 'break-word' }}>
        {value || <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Not provided</span>}
      </div>
    </div>
    {badge && (
      <div style={{ alignSelf: 'center' }}>
        {badge}
      </div>
    )}
  </div>
);

const Settings = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sellers/me');
      const data = res.data || {};
      const formattedData = {
        name: data.name || '',
        storeName: data.storeName || data.businessName || '',
        billingAddress: data.billingAddress || data.businessAddress || '',
        phone: data.phone || '',
        email: data.email || '',
        gstNumber: data.gstNumber || '',
        panNumber: data.panNumber || '',
        isVerified: Boolean(data.isVerified),
        status: data.status || 'Active',
        pickupLocation: typeof data.pickupLocation === 'object' && data.pickupLocation !== null
          ? data.pickupLocation
          : { address: data.pickupLocation || data.billingAddress || data.businessAddress || '', lat: null, lng: null }
      };
      setProfile(formattedData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Failed to load profile. Please check your connection or try logging in again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Loader2 className="animate-spin" size={40} color="#6366f1" />
      </div>
    </Layout>
  );

  if (error || !profile) return (
    <Layout>
      <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
          {error || 'Profile not found'}
        </div>
        <button onClick={fetchProfile} className="btn-primary" style={{ width: 'auto', padding: '10px 24px', margin: '0 auto' }}>
          Retry
        </button>
      </div>
    </Layout>
  );

  const pickupAddressText = profile.pickupLocation?.address || profile.billingAddress || 'Not set';
  const hasCoordinates = profile.pickupLocation?.lat && profile.pickupLocation?.lng;

  return (
    <Layout>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
              Store Profile
            </h1>
            <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>
              Verified store credentials, tax registration, and business details.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: profile.isVerified ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
              border: profile.isVerified ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(234, 179, 8, 0.25)',
              color: profile.isVerified ? '#16a34a' : '#ca8a04',
              fontSize: '13px',
              fontWeight: 600
            }}>
              <ShieldCheck size={16} />
              <span>{profile.isVerified ? 'Verified Profile' : 'Verification Pending'}</span>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-dim)',
              fontSize: '12px',
              fontWeight: 500
            }}>
              <Lock size={13} />
              <span>Read-Only</span>
            </div>
          </div>
        </header>

        {/* Read-Only Notice */}
        <div style={{
          padding: '16px 20px',
          background: 'rgba(99, 102, 241, 0.05)',
          border: '1px solid rgba(99, 102, 241, 0.18)',
          borderRadius: '16px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          color: 'var(--text-main)',
          fontSize: '13.5px',
          lineHeight: 1.5
        }}>
          <Lock size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong style={{ color: 'var(--primary)' }}>Profile is locked:</strong> Seller profile and legal tax details (Store Name, Phone, GST, PAN, and pickup location) are officially verified and locked to maintain compliance. If you need to update any of your business details, please contact platform administration.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* General Business Info */}
          <div className="glass-card" style={{ padding: '28px 32px', borderRadius: '20px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
              <User size={18} color="var(--primary)" />
              Store & Identity Information
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0 40px' }}>
              <InfoRow label="Seller / Contact Name" value={profile.name} icon={User} color="#6366f1" />
              <InfoRow label="Store / Business Name" value={profile.storeName} icon={Store} color="#8b5cf6" />
              <InfoRow label="Registered Phone" value={profile.phone} icon={Phone} color="#ec4899" />
              <InfoRow label="Registered Email" value={profile.email} icon={Mail} color="#06b6d4" />
              <InfoRow
                label="GST Registration No"
                value={profile.gstNumber}
                icon={FileText}
                color="#eab308"
                badge={profile.gstNumber ? (
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', fontWeight: 600 }}>
                    Registered
                  </span>
                ) : null}
              />
              <InfoRow
                label="PAN Card No"
                value={profile.panNumber}
                icon={FileText}
                color="#3b82f6"
                badge={profile.panNumber ? (
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', fontWeight: 600 }}>
                    Verified
                  </span>
                ) : null}
              />
            </div>
          </div>

          {/* Billing & Registered Locations */}
          <div className="glass-card" style={{ padding: '28px 32px', borderRadius: '20px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
              <Building2 size={18} color="var(--secondary)" />
              Registered Locations
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <InfoRow
                label="Official Business / Billing Address"
                value={profile.billingAddress}
                icon={Building2}
                color="#ec4899"
              />
              <InfoRow
                label="Registered Pickup Location"
                value={pickupAddressText}
                icon={MapPin}
                color="#22c55e"
                badge={hasCoordinates ? (
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', fontWeight: 600 }}>
                    GPS: {Number(profile.pickupLocation.lat).toFixed(4)}, {Number(profile.pickupLocation.lng).toFixed(4)}
                  </span>
                ) : null}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
