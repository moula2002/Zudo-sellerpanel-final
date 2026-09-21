import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Settings as SettingsIcon, User, Store, Phone, Building2, MapPin, Save, Loader2, Edit3, X } from 'lucide-react';
import Layout from '../components/Layout';
import MapPicker from '../components/MapPicker';

const InfoRow = ({ label, value, icon: Icon, color }) => (
  <div style={{ display: 'flex', gap: '16px', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
    <div style={{ color: color || 'var(--primary)', marginTop: '2px' }}><Icon size={18} /></div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: 500, lineHeight: 1.4 }}>{value || 'Not set'}</div>
    </div>
  </div>
);

const Settings = () => {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    storeName: '',
    billingAddress: '',
    phone: '',
    pickupLocation: {
      lat: 28.6139,
      lng: 77.2090,
      address: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const MAPS_API_KEY = 'AIzaSyDXn6KSA4exy08KiKicYZ53wCfs20__qWU';

  const fetchProfile = async () => {
    try {
      const res = await api.get('/sellers/me');
      const data = res.data;
      const formattedData = {
        name: data.name || '',
        storeName: data.storeName || data.businessName || '',
        billingAddress: data.billingAddress || data.businessAddress || '',
        phone: data.phone || '',
        pickupLocation: data.pickupLocation || {
          lat: 28.6139,
          lng: 77.2090,
          address: ''
        }
      };
      setProfile(formattedData);
      setFormData(formattedData);
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

  const handleLocationSelect = (coords) => {
    setFormData(prev => ({
      ...prev,
      pickupLocation: {
        ...prev.pickupLocation,
        lat: coords.lat,
        lng: coords.lng,
        address: coords.address || prev.pickupLocation.address
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/sellers/profile', formData);
      setSuccess(true);
      setIsEditing(false);
      setProfile(formData);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <Loader2 className="animate-spin" size={40} color="#6366f1" />
      </div>
    </Layout>
  );

  if (error || !profile) return (
    <Layout>
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>{error || 'Profile not found'}</div>
        <button onClick={fetchProfile} className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>Retry</button>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div style={{ maxWidth: '1000px' }}>
        <header style={{
          marginBottom: '40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-main)' }}>Store Settings</h1>
            <p style={{ color: 'var(--text-dim)' }}>View and manage your professional profile.</p>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-primary"
              style={{ padding: '12px 24px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid #6366f1', color: '#6366f1', width: 'auto' }}
            >
              <Edit3 size={18} />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData(profile);
                }}
                className="btn-primary"
                style={{ padding: '12px 24px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', width: 'auto' }}
              >
                <X size={18} />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </header>

        {success && (
          <div style={{ padding: '16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', color: '#22c55e', borderRadius: '12px', marginBottom: '24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            ✓ Profile updated successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* General Info */}
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
              <User size={18} color="var(--primary)" />
              Store Profile
            </h2>

            {isEditing ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dim)' }}>Full Name</label>
                  <input type="text" className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dim)' }}>Store Name</label>
                  <input type="text" className="input-field" value={formData.storeName} onChange={e => setFormData({ ...formData, storeName: e.target.value })} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dim)' }}>Phone Number</label>
                  <input type="tel" className="input-field" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0 40px' }}>
                <InfoRow label="Full Name" value={profile.name} icon={User} />
                <InfoRow label="Store Name" value={profile.storeName} icon={Store} color="#8b5cf6" />
                <InfoRow label="Phone Number" value={profile.phone} icon={Phone} color="#ec4899" />
              </div>
            )}
          </div>

          {/* Billing & Location */}
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
              <Building2 size={18} color="var(--secondary)" />
              Location Details
            </h2>

            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dim)' }}>Billing Address</label>
                  <textarea className="input-field" style={{ minHeight: '100px' }} value={formData.billingAddress} onChange={e => setFormData({ ...formData, billingAddress: e.target.value })} required />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dim)' }}>Pickup Location (Map)</label>
                  <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', height: '300px' }}>
                    <MapPicker apiKey={MAPS_API_KEY} onLocationSelect={handleLocationSelect} initialLocation={formData.pickupLocation} />
                  </div>
                  <input type="text" className="input-field" value={formData.pickupLocation.address} onChange={e => setFormData({ ...formData, pickupLocation: { ...formData.pickupLocation, address: e.target.value } })} required placeholder="Specific address..." />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <InfoRow label="Billing Address" value={profile.billingAddress} icon={Building2} color="#ec4899" />
                <InfoRow label="Pickup Point" value={profile.pickupLocation.address} icon={MapPin} color="#22c55e" />
              </div>
            )}
          </div>

          {isEditing && (
            <button type="submit" className="btn-primary" style={{ padding: '16px 40px', alignSelf: 'flex-start', width: '100%' }} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : (
                <>
                  <Save size={20} />
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          )}
        </form>
      </div>
    </Layout>
  );
};

export default Settings;
