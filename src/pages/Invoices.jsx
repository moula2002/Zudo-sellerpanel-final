import React, { useState, useEffect, useRef } from 'react';
import api, { BASE_URL } from '../utils/api';
import { 
  FileText, Download, Plus, AlertCircle, Calendar, CheckCircle, 
  RefreshCw, Upload, X, Eye, Image as ImageIcon, Check, Hash, ExternalLink, Trash2 
} from 'lucide-react';
import Layout from '../components/Layout';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [nextExpectedNumber, setNextExpectedNumber] = useState(1);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState(null);
  const [usedNumbers, setUsedNumbers] = useState([]);
  
  // Image Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Authenticated Image Blobs Cache (invoiceId -> blobUrl)
  const [imageBlobs, setImageBlobs] = useState({});
  const [imageLoading, setImageLoading] = useState({});

  // Modal State for Invoice Details & Image View
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchInvoices();
    fetchNextSequence();
  }, []);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(imageBlobs).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [imageBlobs]);

  const fetchNextSequence = async () => {
    try {
      const { data } = await api.get('/seller-invoices/next-number');
      if (data) {
        setNextExpectedNumber(data.nextExpectedNumber || 1);
        setLastInvoiceNumber(data.lastInvoiceNumber || null);
        setUsedNumbers(data.usedNumbers || []);
        if (!invoiceNumber) {
          setInvoiceNumber(String(data.nextExpectedNumber || 1));
        }
      }
    } catch (err) {
      console.warn('Could not fetch next sequence number:', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data } = await api.get('/seller-invoices/my-invoices');
      setInvoices(data || []);
      // Prefetch images for invoices with images using the authenticated Axios instance
      (data || []).forEach(inv => {
        if (inv.hasInvoiceImage || inv.invoiceImage) {
          loadAuthenticatedImage(inv._id);
        }
      });
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  // Safely loads the raw binary image via the authenticated Axios instance (with Bearer token & x-location)
  const loadAuthenticatedImage = async (invoiceId) => {
    if (!invoiceId || imageBlobs[invoiceId] || imageLoading[invoiceId]) return;

    setImageLoading(prev => ({ ...prev, [invoiceId]: true }));
    try {
      const res = await api.get(`/seller-invoices/${invoiceId}/image`, {
        responseType: 'blob'
      });
      const blobUrl = URL.createObjectURL(res.data);
      setImageBlobs(prev => ({ ...prev, [invoiceId]: blobUrl }));
    } catch (err) {
      // 404 or image missing is normal for records without images
      console.warn(`Could not load image for invoice ${invoiceId}:`, err.response?.status || err.message);
    } finally {
      setImageLoading(prev => ({ ...prev, [invoiceId]: false }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type.toLowerCase())) {
      setError('Invalid file type. Please upload a JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size exceeds 10MB. Please choose a smaller image.');
      return;
    }

    setError('');
    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (generating) return;
    setError('');
    setSuccessMsg('');
    
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }

    const trimmedInvNum = invoiceNumber.toString().trim();
    if (!trimmedInvNum) {
      setError('Please enter your manual sequential invoice number (e.g. 1, 2, 3...).');
      return;
    }

    if (!/^\d+$/.test(trimmedInvNum)) {
      setError('Invoice number must be a sequential numeric value (1, 2, 3, 4...).');
      return;
    }

    const numVal = parseInt(trimmedInvNum, 10);
    if (numVal <= 0) {
      setError('Invoice number must be a positive integer greater than 0.');
      return;
    }

    if (numVal !== nextExpectedNumber) {
      setError(`Sequential numbering required. The next sequential invoice number is ${nextExpectedNumber}. You entered ${numVal}. Skipping or repeating numbers is not allowed.`);
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date cannot be after end date.');
      return;
    }

    setGenerating(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('startDate', startDate);
      formData.append('endDate', endDate);
      formData.append('invoiceNumber', trimmedInvNum);
      if (selectedFile) {
        formData.append('invoiceImage', selectedFile);
      }

      const { data } = await api.post('/seller-invoices/generate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      setStartDate('');
      setEndDate('');
      handleRemoveImage();

      const amountStr = (data.totalAmount !== undefined ? data.totalAmount : data.netAmount) || 0;
      setSuccessMsg(`Invoice #${data.invoiceNumber || data._id} generated successfully for ₹${Number(amountStr).toLocaleString('en-IN')}!`);

      // Refresh invoices and update sequence status
      await fetchInvoices();
      await fetchNextSequence();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to generate invoice. No delivered orders found or date overlaps.';
      setError(msg);
    } finally {
      setGenerating(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (id, invNum) => {
    try {
      const response = await api.get(`/seller-invoices/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${invNum || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download invoice');
    }
  };

  const handleDelete = async (invoice) => {
    const invId = invoice._id;
    const invNumberStr = invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : `#${invId.toString().substring(0, 8)}`;
    const confirmDelete = window.confirm(`Are you sure you want to delete Invoice ${invNumberStr}? This action cannot be undone.`);
    if (!confirmDelete) return;

    setDeletingId(invId);
    setError('');
    setSuccessMsg('');

    // Immediately close modal if deleting from inside modal
    if (selectedInvoice && selectedInvoice._id === invId) {
      setShowModal(false);
      setSelectedInvoice(null);
    }

    try {
      await api.delete(`/seller-invoices/${invId}`);

      // Clean up cached blob URL for deleted invoice
      if (imageBlobs[invId]) {
        URL.revokeObjectURL(imageBlobs[invId]);
        setImageBlobs(prev => {
          const updated = { ...prev };
          delete updated[invId];
          return updated;
        });
      }

      // Optimistically remove from frontend list
      setInvoices(prev => prev.filter(item => item._id !== invId));
      setSuccessMsg(`Invoice ${invNumberStr} was deleted successfully.`);

      // Update sequence info
      await fetchNextSequence();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete invoice.';
      setError(msg);
      await fetchInvoices(); // restore list on error
    } finally {
      setDeletingId(null);
    }
  };

  const openInvoiceDetails = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
    if ((invoice.hasInvoiceImage || invoice.invoiceImage) && !imageBlobs[invoice._id]) {
      loadAuthenticatedImage(invoice._id);
    }
  };

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>Invoices</h1>
          <p style={{ color: 'var(--text-dim)' }}>Generate, track and upload sequential invoices for order settlements.</p>
        </div>

        {/* Sequential Sequence Banner */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '16px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#60a5fa', fontWeight: 700, letterSpacing: '0.5px', display: 'block' }}>
              NEXT SEQUENTIAL INVOICE
            </span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6' }}>
              #{nextExpectedNumber}
            </span>
          </div>
          {lastInvoiceNumber && (
            <div style={{ borderLeft: '1px solid rgba(59, 130, 246, 0.2)', paddingLeft: '16px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600, display: 'block' }}>
                LAST INVOICE
              </span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                #{lastInvoiceNumber}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* GENERATE NEW INVOICE FORM */}
      <div className="glass-card" style={{ padding: '28px', borderRadius: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <FileText size={20} style={{ color: '#3b82f6' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Generate New Invoice</h2>
        </div>

        {error && (
          <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{error}</span>
          </div>
        )}
        {successMsg && (
          <div style={{ padding: '16px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleGenerate}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {/* START DATE */}
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>
                START DATE *
              </label>
              <input 
                type="date" 
                className="input-field" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            {/* END DATE */}
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>
                END DATE *
              </label>
              <input 
                type="date" 
                className="input-field" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            {/* MANUAL SEQUENTIAL INVOICE NUMBER */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>
                  INVOICE NUMBER *
                </label>
                <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 600 }}>
                  Expected: #{nextExpectedNumber}
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number" 
                  min="1"
                  step="1"
                  placeholder={`Enter ${nextExpectedNumber}`}
                  className="input-field" 
                  value={invoiceNumber} 
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  style={{ paddingLeft: '36px', fontWeight: 700 }}
                  required
                />
                <Hash size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Enter sequential number: 1, 2, 3...
              </p>
            </div>
          </div>

          {/* IMAGE UPLOAD SECTION */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--border-color)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'block' }}>
                  Upload Invoice Image
                </label>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  Attach your signed tax invoice copy (JPG, JPEG, PNG, WEBP - Max 10MB). Stored securely in MongoDB.
                </span>
              </div>

              {selectedFile && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <X size={14} /> Remove Image
                </button>
              )}
            </div>

            {!previewUrl ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed rgba(59, 130, 246, 0.3)',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(59, 130, 246, 0.02)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Upload size={32} style={{ color: '#3b82f6', margin: '0 auto 10px', display: 'block' }} />
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Click to select invoice image
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  PNG, JPG, JPEG, WEBP up to 10MB
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  style={{ display: 'none' }} 
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{
                  position: 'relative',
                  width: '120px',
                  height: '120px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  background: '#000'
                }}>
                  <img 
                    src={previewUrl} 
                    alt="Invoice Preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    {selectedFile?.name}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                    {(selectedFile?.size / 1024).toFixed(1)} KB • {selectedFile?.type}
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '12px', height: 'auto', gap: '6px' }}
                  >
                    Replace Image
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    style={{ display: 'none' }} 
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            )}
          </div>

          {/* UPLOAD PROGRESS */}
          {generating && uploadProgress > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                <span>Uploading invoice and image...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.2s ease' }} />
              </div>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={generating} 
              style={{ height: '48px', padding: '0 28px', whiteSpace: 'nowrap', fontSize: '14px', fontWeight: 700 }}
            >
              {generating ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={16} className="animate-spin" /> Generating...
                </div>
              ) : (
                <>
                  <Plus size={18} /> Generate Invoice #{invoiceNumber || nextExpectedNumber}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* INVOICE LIST TABLE */}
      <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Generated Invoices</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{invoices.length} Total</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--glass-bg)' }}>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>INVOICE NUMBER</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>INVOICE IMAGE</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>BILLING PERIOD</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>INVOICE AMOUNT</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>STATUS</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center' }}>
                  <div className="animate-spin" style={{ display: 'inline-block' }}><FileText size={24} /></div>
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  No invoices generated yet. Generate your first invoice (#1) above.
                </td>
              </tr>
            ) : invoices.map((inv) => {
              const hasImg = inv.hasInvoiceImage || Boolean(inv.invoiceImage);
              const blobUrl = imageBlobs[inv._id];
              const isLoadingImg = imageLoading[inv._id];

              return (
                <tr key={inv._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }} className="table-row-hover">
                  {/* INVOICE NUMBER */}
                  <td style={{ padding: '16px 24px', fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#3b82f6',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 800
                      }}>
                        #{inv.invoiceNumber || inv.invoiceSequenceNumber || inv._id.toString().substring(0, 6)}
                      </span>
                    </div>
                  </td>

                  {/* INVOICE IMAGE THUMBNAIL */}
                  <td style={{ padding: '16px 24px' }}>
                    {hasImg ? (
                      <div 
                        onClick={() => {
                          if (blobUrl) {
                            setImageModalUrl(blobUrl);
                          }
                        }}
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          cursor: blobUrl ? 'pointer' : 'default',
                          position: 'relative',
                          background: 'rgba(0,0,0,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title={blobUrl ? "Click to view full invoice image" : "Loading invoice image..."}
                      >
                        {blobUrl ? (
                          <>
                            <img 
                              src={blobUrl} 
                              alt="Invoice" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0,0,0,0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0,
                              transition: 'opacity 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                            >
                              <Eye size={14} color="#fff" />
                            </div>
                          </>
                        ) : isLoadingImg ? (
                          <RefreshCw size={14} className="animate-spin" style={{ color: '#3b82f6' }} />
                        ) : (
                          <ImageIcon size={16} style={{ color: 'var(--text-dim)' }} />
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        No Image
                      </span>
                    )}
                  </td>

                  {/* BILLING PERIOD */}
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                      {new Date(inv.startDate).toLocaleDateString()} - {new Date(inv.endDate).toLocaleDateString()}
                    </div>
                  </td>

                  {/* INVOICE AMOUNT */}
                  <td style={{ padding: '16px 24px', fontWeight: 700, color: '#22c55e' }}>
                    ₹{Number(inv.totalAmount || inv.netAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>

                  {/* STATUS */}
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

                  {/* ACTIONS */}
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => openInvoiceDetails(inv)}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', height: 'auto', gap: '4px' }}
                        title="View complete details"
                      >
                        <Eye size={14} /> View
                      </button>
                      <button 
                        onClick={() => handleDownload(inv._id, inv.invoiceNumber)}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '12px', height: 'auto', gap: '6px' }}
                        title="Download PDF"
                      >
                        <Download size={14} /> PDF
                      </button>
                      <button 
                        onClick={() => handleDelete(inv)}
                        disabled={deletingId === inv._id}
                        title="Delete Invoice"
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '10px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          height: 'auto'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                      >
                        {deletingId === inv._id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL: INVOICE DETAILS & IMAGE */}
      {showModal && selectedInvoice && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg, #18181b)',
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#60a5fa', fontWeight: 800, letterSpacing: '0.5px' }}>
                  INVOICE DETAILS
                </span>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                  Invoice #{selectedInvoice.invoiceNumber || selectedInvoice._id}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '8px',
                  color: 'var(--text-dim)',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Billing Period</span>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>
                  {new Date(selectedInvoice.startDate).toLocaleDateString()} - {new Date(selectedInvoice.endDate).toLocaleDateString()}
                </span>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Status</span>
                <span style={{ 
                  display: 'inline-block',
                  marginTop: '4px',
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontSize: '11px', 
                  fontWeight: 800,
                  background: selectedInvoice.status === 'Cleared' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                  color: selectedInvoice.status === 'Cleared' ? '#22c55e' : '#eab308'
                }}>
                  {selectedInvoice.status}
                </span>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Invoice Amount</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#22c55e' }}>
                  ₹{Number(selectedInvoice.totalAmount || selectedInvoice.netAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Total Orders</span>
                <span style={{ fontSize: '16px', fontWeight: 800 }}>
                  {selectedInvoice.orderCount || selectedInvoice.orders?.length || 0} Orders
                </span>
              </div>
            </div>

            {/* UPLOADED INVOICE IMAGE */}
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                Uploaded Invoice Copy
              </span>
              {(selectedInvoice.hasInvoiceImage || selectedInvoice.invoiceImage) ? (
                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#09090b',
                  textAlign: 'center'
                }}>
                  {imageBlobs[selectedInvoice._id] ? (
                    <img 
                      src={imageBlobs[selectedInvoice._id]} 
                      alt={`Invoice #${selectedInvoice.invoiceNumber}`} 
                      style={{ width: '100%', maxHeight: '360px', objectFit: 'contain', display: 'block' }}
                    />
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                      <RefreshCw size={24} className="animate-spin" style={{ color: '#3b82f6', margin: '0 auto 8px', display: 'block' }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Loading invoice copy...</span>
                    </div>
                  )}
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                      {selectedInvoice.imageMetadata?.originalName || 'Invoice Image'}
                    </span>
                    {imageBlobs[selectedInvoice._id] && (
                      <a 
                        href={imageBlobs[selectedInvoice._id]} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11px', textDecoration: 'none' }}
                      >
                        <ExternalLink size={12} /> Open Full Size
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                  <ImageIcon size={32} style={{ color: 'var(--text-dim)', margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>
                    No physical invoice copy was uploaded for this record.
                  </p>
                </div>
              )}
            </div>

            {/* FOOTER ACTIONS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={() => handleDelete(selectedInvoice)}
                disabled={deletingId === selectedInvoice._id}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '12px',
                  padding: '10px 18px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {deletingId === selectedInvoice._id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete Invoice
              </button>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  style={{ padding: '10px 20px' }}
                >
                  Close
                </button>
                <button 
                  onClick={() => handleDownload(selectedInvoice._id, selectedInvoice.invoiceNumber)}
                  className="btn-primary"
                  style={{ padding: '10px 20px', gap: '6px' }}
                >
                  <Download size={16} /> Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN IMAGE PREVIEW LIGHTBOX */}
      {imageModalUrl && (
        <div 
          onClick={() => setImageModalUrl('')}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            cursor: 'zoom-out'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img 
              src={imageModalUrl} 
              alt="Invoice Preview" 
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} 
            />
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Invoices;
