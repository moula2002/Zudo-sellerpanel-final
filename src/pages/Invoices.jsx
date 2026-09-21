import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { FileText, Download, Plus, AlertCircle, Calendar } from 'lucide-react';
import Layout from '../components/Layout';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data } = await api.get('/seller-invoices/my-invoices');
      setInvoices(data);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date cannot be after end date.');
      return;
    }

    setGenerating(true);
    try {
      const { data } = await api.post('/seller-invoices/generate', { startDate, endDate });
      setInvoices([data, ...invoices]);
      setStartDate('');
      setEndDate('');
      alert('Invoice generated successfully and sent to Admin!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate invoice. No orders found or date overlaps.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (id) => {
    try {
      const response = await api.get(`/seller-invoices/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download invoice');
    }
  };

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>Invoices</h1>
          <p style={{ color: 'var(--text-dim)' }}>Generate and manage your sale invoices.</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Generate New Invoice</h2>
        {error && (
          <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{error}</span>
          </div>
        )}
        <form onSubmit={handleGenerate} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '8px' }}>START DATE</label>
            <input 
              type="date" 
              className="input-field" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '8px' }}>END DATE</label>
            <input 
              type="date" 
              className="input-field" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={generating} style={{ height: '48px', padding: '0 24px', whiteSpace: 'nowrap' }}>
            {generating ? 'Generating...' : (
              <>
                <Plus size={18} /> Generate
              </>
            )}
          </button>
        </form>
      </div>

      <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--glass-bg)' }}>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>INVOICE ID</th>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>PERIOD</th>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>AMOUNT</th>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>STATUS</th>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center' }}>
                  <div className="animate-spin" style={{ display: 'inline-block' }}><FileText size={24} /></div>
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  No invoices generated yet.
                </td>
              </tr>
            ) : invoices.map((inv) => (
              <tr key={inv._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }} className="table-row-hover">
                <td style={{ padding: '16px 24px', fontWeight: 600 }}>#{inv._id.toString().substring(0,8).toUpperCase()}</td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                    {new Date(inv.startDate).toLocaleDateString()} - {new Date(inv.endDate).toLocaleDateString()}
                  </div>
                </td>
                <td style={{ padding: '16px 24px', fontWeight: 700, color: '#22c55e' }}>₹{inv.totalAmount}</td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ 
                    padding: '6px 12px', 
                    borderRadius: '20px', 
                    fontSize: '11px', 
                    fontWeight: 700,
                    background: inv.status === 'Cleared' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                    color: inv.status === 'Cleared' ? '#22c55e' : '#eab308'
                  }}>
                    {inv.status}
                  </span>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <button 
                    onClick={() => handleDownload(inv._id)}
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px', height: 'auto', gap: '6px' }}
                  >
                    <Download size={14} /> PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
};

export default Invoices;
