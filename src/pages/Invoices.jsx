import React, { useState, useEffect, useRef } from 'react';
import api, { BASE_URL } from '../utils/api';
import { 
  FileText, Download, Plus, AlertCircle, Calendar, CheckCircle, 
  RefreshCw, Upload, X, Eye, Image as ImageIcon, Check, Hash, ExternalLink, Trash2, Layers 
} from 'lucide-react';
import Layout from '../components/Layout';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextExpectedNumber, setNextExpectedNumber] = useState(1);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState(null);
  const [usedNumbers, setUsedNumbers] = useState([]);

  // Multi-invoice form entries:
  // Each entry: { id, startDate, endDate, invoiceNumber, images: [ { file, previewUrl, name, size, type } ] }
  const [invoiceEntries, setInvoiceEntries] = useState([
    {
      id: 1,
      startDate: '',
      endDate: '',
      invoiceNumber: '1',
      images: []
    }
  ]);

  // Authenticated Image Blobs Cache: { [invoiceId]: { [imageId || 'primary']: blobUrl } }
  const [imageBlobs, setImageBlobs] = useState({});
  const [imageLoading, setImageLoading] = useState({});

  // Modal State for Invoice Details & Image View
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const [generating, setGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Refs for hidden file inputs per invoice entry
  const fileInputRefs = useRef({});

  useEffect(() => {
    fetchInvoices();
    fetchNextSequence();
  }, []);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      // Clean up server image blob URLs
      Object.values(imageBlobs).forEach(obj => {
        if (typeof obj === 'string' && obj.startsWith('blob:')) {
          URL.revokeObjectURL(obj);
        } else if (typeof obj === 'object' && obj !== null) {
          Object.values(obj).forEach(url => {
            if (url && typeof url === 'string' && url.startsWith('blob:')) {
              URL.revokeObjectURL(url);
            }
          });
        }
      });
      // Clean up local preview URLs
      invoiceEntries.forEach(entry => {
        (entry.images || []).forEach(img => {
          if (img.previewUrl && img.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(img.previewUrl);
          }
        });
      });
    };
  }, []);

  const fetchNextSequence = async () => {
    try {
      const { data } = await api.get('/seller-invoices/next-number');
      if (data) {
        const nextNum = data.nextExpectedNumber || 1;
        setNextExpectedNumber(nextNum);
        setLastInvoiceNumber(data.lastInvoiceNumber || null);
        setUsedNumbers(data.usedNumbers || []);

        // Prepopulate first entry's invoiceNumber if not customized
        setInvoiceEntries(prev => {
          if (prev.length === 1 && (!prev[0].invoiceNumber || prev[0].invoiceNumber === '1')) {
            return [{ ...prev[0], invoiceNumber: String(nextNum) }];
          }
          return prev;
        });
      }
    } catch (err) {
      console.warn('Could not fetch next sequence number:', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data } = await api.get('/seller-invoices/my-invoices');
      setInvoices(data || []);
      // Prefetch primary thumbnail for each invoice that has images
      (data || []).forEach(inv => {
        if (inv.hasInvoiceImage || inv.imageCount > 0 || inv.invoiceImage) {
          loadAuthenticatedPrimaryImage(inv._id);
        }
      });
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  // Loads primary thumbnail image
  const loadAuthenticatedPrimaryImage = async (invoiceId) => {
    if (!invoiceId || imageBlobs[invoiceId]?.primary || imageLoading[`${invoiceId}_primary`]) return;

    setImageLoading(prev => ({ ...prev, [`${invoiceId}_primary`]: true }));
    try {
      const res = await api.get(`/seller-invoices/${invoiceId}/image`, {
        responseType: 'blob'
      });
      const blobUrl = URL.createObjectURL(res.data);
      setImageBlobs(prev => ({
        ...prev,
        [invoiceId]: { ...(prev[invoiceId] || {}), primary: blobUrl }
      }));
    } catch (err) {
      // Missing image is normal for legacy records without images
    } finally {
      setImageLoading(prev => ({ ...prev, [`${invoiceId}_primary`]: false }));
    }
  };

  // Loads specific image by imageId for modal gallery
  const loadAuthenticatedImageById = async (invoiceId, imageId) => {
    const key = `${invoiceId}_${imageId}`;
    if (!invoiceId || !imageId || imageBlobs[invoiceId]?.[imageId] || imageLoading[key]) return;

    setImageLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await api.get(`/seller-invoices/${invoiceId}/images/${imageId}`, {
        responseType: 'blob'
      });
      const blobUrl = URL.createObjectURL(res.data);
      setImageBlobs(prev => ({
        ...prev,
        [invoiceId]: { ...(prev[invoiceId] || {}), [imageId]: blobUrl }
      }));
    } catch (err) {
      console.warn(`Could not load image ${imageId} for invoice ${invoiceId}:`, err.message);
    } finally {
      setImageLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  // --- Add & Remove Invoice Entries ---
  const handleAddInvoiceEntry = () => {
    setError('');
    setInvoiceEntries(prev => {
      // Suggest the next sequential invoice number based on previous entries and expected number
      const existingEnteredNums = prev
        .map(e => parseInt(e.invoiceNumber, 10))
        .filter(n => !isNaN(n) && n > 0);

      const maxSoFar = existingEnteredNums.length > 0 
        ? Math.max(...existingEnteredNums, nextExpectedNumber - 1)
        : nextExpectedNumber - 1;

      const suggestedNumber = String(maxSoFar + 1);

      // Inherit the latest entry's date range if available for seller convenience
      const lastEntry = prev[prev.length - 1];

      return [
        ...prev,
        {
          id: Date.now() + Math.random(),
          startDate: lastEntry?.startDate || '',
          endDate: lastEntry?.endDate || '',
          invoiceNumber: suggestedNumber,
          images: []
        }
      ];
    });
  };

  const handleRemoveInvoiceEntry = (entryId) => {
    if (invoiceEntries.length <= 1) {
      setError('At least one invoice entry is required.');
      return;
    }
    setError('');
    setInvoiceEntries(prev => {
      const target = prev.find(e => e.id === entryId);
      if (target?.images) {
        target.images.forEach(img => {
          if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
        });
      }
      return prev.filter(e => e.id !== entryId);
    });
  };

  const updateEntryField = (entryId, field, value) => {
    setInvoiceEntries(prev => prev.map(entry => {
      if (entry.id === entryId) {
        return { ...entry, [field]: value };
      }
      return entry;
    }));
  };

  // --- Multi-Image Handling Per Invoice Entry ---
  const handleFilesAdded = (entryId, fileList) => {
    if (!fileList || fileList.length === 0) return;
    setError('');

    const targetEntry = invoiceEntries.find(e => e.id === entryId);
    const currentImages = targetEntry?.images || [];
    const availableSlots = 5 - currentImages.length;

    if (availableSlots <= 0) {
      setError('Maximum 5 images allowed per invoice.');
      return;
    }

    const filesToProcess = Array.from(fileList).slice(0, availableSlots);
    if (fileList.length > availableSlots) {
      setError(`Only ${availableSlots} more image(s) could be added (max 5 per invoice).`);
    }

    const newValidImages = [];

    for (const file of filesToProcess) {
      const ext = (file.name || '').split('.').pop()?.toLowerCase();
      const isAllowedExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
      const isAllowedMime = ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase());

      if (!isAllowedMime && !isAllowedExt) {
        setError(`"${file.name}" has an unsupported format. Only JPG, JPEG, PNG, and WEBP are allowed.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" exceeds the 10MB file size limit.`);
        continue;
      }

      const localUrl = URL.createObjectURL(file);
      newValidImages.push({
        id: Date.now() + Math.random(),
        file,
        previewUrl: localUrl,
        name: file.name,
        size: file.size,
        type: file.type || 'image/jpeg'
      });
    }

    if (newValidImages.length > 0) {
      setInvoiceEntries(prev => prev.map(entry => {
        if (entry.id === entryId) {
          return {
            ...entry,
            images: [...(entry.images || []), ...newValidImages]
          };
        }
        return entry;
      }));
    }

    // Reset input element value so re-selecting same file triggers change
    if (fileInputRefs.current[entryId]) {
      fileInputRefs.current[entryId].value = '';
    }
  };

  const handleRemoveSingleImage = (entryId, imageObjId) => {
    setInvoiceEntries(prev => prev.map(entry => {
      if (entry.id === entryId) {
        const imgToRemove = entry.images.find(img => img.id === imageObjId);
        if (imgToRemove?.previewUrl) {
          URL.revokeObjectURL(imgToRemove.previewUrl);
        }
        return {
          ...entry,
          images: entry.images.filter(img => img.id !== imageObjId)
        };
      }
      return entry;
    }));
  };

  // --- Validation and Submission ---
  const handleGenerateAll = async (e) => {
    e.preventDefault();
    if (generating) return;
    setError('');
    setSuccessMsg('');

    // 1. Validation across all invoice entries
    const seenNumbers = new Set();

    for (let i = 0; i < invoiceEntries.length; i++) {
      const entry = invoiceEntries[i];
      const entryLabel = `Invoice Entry #${i + 1}`;

      if (!entry.startDate || !entry.endDate) {
        setError(`${entryLabel}: Please select both Start Date and End Date.`);
        return;
      }

      if (new Date(entry.startDate) > new Date(entry.endDate)) {
        setError(`${entryLabel}: Start Date cannot be after End Date.`);
        return;
      }

      const trimmedNum = (entry.invoiceNumber || '').toString().trim();
      if (!trimmedNum) {
        setError(`${entryLabel}: Please enter a sequential invoice number.`);
        return;
      }

      if (!/^\d+$/.test(trimmedNum)) {
        setError(`${entryLabel}: Invoice number must be a sequential positive number (1, 2, 3...).`);
        return;
      }

      const numVal = parseInt(trimmedNum, 10);
      if (numVal <= 0) {
        setError(`${entryLabel}: Invoice number must be greater than 0.`);
        return;
      }

      if (seenNumbers.has(trimmedNum)) {
        setError(`Duplicate invoice number "${trimmedNum}" found in your entries. Each invoice must have an independent, unique invoice number.`);
        return;
      }
      seenNumbers.add(trimmedNum);

      // Check against already existing used numbers in DB
      if (usedNumbers.includes(trimmedNum)) {
        setError(`Invoice number "${trimmedNum}" has already been used in an existing invoice. Please choose another sequential number.`);
        return;
      }

      // Validate image count (1-5 required)
      const imgCount = entry.images ? entry.images.length : 0;
      if (imgCount === 0) {
        setError(`${entryLabel} (Invoice #${trimmedNum}): Please upload at least 1 invoice image (minimum 1, maximum 5).`);
        return;
      }
      if (imgCount > 5) {
        setError(`${entryLabel} (Invoice #${trimmedNum}): Exceeds maximum 5 images.`);
        return;
      }
    }

    setGenerating(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      // Build metadata array
      const metadata = invoiceEntries.map(entry => ({
        startDate: entry.startDate,
        endDate: entry.endDate,
        invoiceNumber: entry.invoiceNumber.toString().trim()
      }));
      formData.append('invoices', JSON.stringify(metadata));

      // Append files with keyed names: invoice_{index}_image_{imageIndex}
      invoiceEntries.forEach((entry, invIdx) => {
        (entry.images || []).forEach((imgObj, imgIdx) => {
          formData.append(`invoice_${invIdx}_image_${imgIdx}`, imgObj.file);
        });
      });

      const { data } = await api.post('/seller-invoices/generate-batch', formData, {
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

      // Cleanup local preview URLs
      invoiceEntries.forEach(entry => {
        (entry.images || []).forEach(img => {
          if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
        });
      });

      // Reset form to 1 clean entry
      const nextNum = (data.invoices && data.invoices.length > 0)
        ? (Math.max(...data.invoices.map(i => parseInt(i.invoiceNumber, 10)).filter(n => !isNaN(n))) + 1)
        : nextExpectedNumber + invoiceEntries.length;

      setInvoiceEntries([
        {
          id: Date.now(),
          startDate: '',
          endDate: '',
          invoiceNumber: String(nextNum),
          images: []
        }
      ]);

      const count = data.invoices?.length || invoiceEntries.length;
      setSuccessMsg(`Successfully generated ${count} invoice(s)! Records and raw binary images are saved in MongoDB.`);

      await fetchInvoices();
      await fetchNextSequence();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to generate invoice(s).';
      setError(msg);
    } finally {
      setGenerating(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (id, invNum) => {
    if (!id || downloadingId) return;
    setDownloadingId(id);
    setError('');

    try {
      const response = await api.get(`/seller-invoices/${id}/download`, { 
        responseType: 'blob',
        withCredentials: true 
      });

      if (response.data && response.data.type === 'application/json') {
        const text = await response.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || 'Failed to download invoice PDF.');
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invNum || id}.pdf`;
      link.setAttribute('download', `Invoice-${invNum || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Download error:', err);
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          setError(json.message || 'Failed to download invoice PDF.');
        } catch (e) {
          setError('Failed to download invoice PDF. Please try again.');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to download invoice PDF.');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (invoice) => {
    const invId = invoice._id;
    const invNumberStr = invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : `#${invId.toString().substring(0, 8)}`;
    const confirmDelete = window.confirm(`Are you sure you want to delete Invoice ${invNumberStr}? This will safely delete associated images from MongoDB.`);
    if (!confirmDelete) return;

    setDeletingId(invId);
    setError('');
    setSuccessMsg('');

    if (selectedInvoice && selectedInvoice._id === invId) {
      setShowModal(false);
      setSelectedInvoice(null);
    }

    try {
      await api.delete(`/seller-invoices/${invId}`);

      // Clean up cached blob URLs for deleted invoice
      if (imageBlobs[invId]) {
        Object.values(imageBlobs[invId]).forEach(url => {
          if (url && typeof url === 'string') URL.revokeObjectURL(url);
        });
        setImageBlobs(prev => {
          const updated = { ...prev };
          delete updated[invId];
          return updated;
        });
      }

      setInvoices(prev => prev.filter(item => item._id !== invId));
      setSuccessMsg(`Invoice ${invNumberStr} deleted successfully.`);
      await fetchNextSequence();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete invoice.';
      setError(msg);
      await fetchInvoices();
    } finally {
      setDeletingId(null);
    }
  };

  const openInvoiceDetails = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);

    // Fetch full invoice image details (all 1-5 images)
    try {
      const { data } = await api.get(`/seller-invoices/${invoice._id}/images`);
      if (Array.isArray(data)) {
        setSelectedInvoice(prev => ({ ...prev, detailedImages: data }));
        data.forEach(img => {
          loadAuthenticatedImageById(invoice._id, img._id);
        });
      }
    } catch (e) {
      console.warn('Could not fetch detailed images for modal:', e.message);
    }
  };

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>Invoices</h1>
          <p style={{ color: 'var(--text-dim)' }}>Generate, track and upload sequential invoices with multiple documents for order settlements.</p>
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
              NEXT SUGGESTED INVOICE
            </span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6' }}>
              #{nextExpectedNumber}
            </span>
          </div>
          {lastInvoiceNumber && (
            <div style={{ borderLeft: '1px solid rgba(59, 130, 246, 0.2)', paddingLeft: '16px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600, display: 'block' }}>
                LAST GENERATED
              </span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                #{lastInvoiceNumber}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* GENERATE NEW INVOICE(S) FORM */}
      <div className="glass-card" style={{ padding: '28px', borderRadius: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} style={{ color: '#3b82f6' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Generate Invoices</h2>
            {invoiceEntries.length > 1 && (
              <span style={{ 
                background: 'rgba(59, 130, 246, 0.15)', 
                color: '#3b82f6', 
                fontSize: '11px', 
                fontWeight: 700, 
                padding: '3px 8px', 
                borderRadius: '8px' 
              }}>
                {invoiceEntries.length} Invoices
              </span>
            )}
          </div>

          {/* "+ Add Another Invoice" Button */}
          <button
            type="button"
            onClick={handleAddInvoiceEntry}
            className="btn-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              gap: '6px',
              borderRadius: '12px',
              borderColor: 'rgba(59, 130, 246, 0.4)',
              color: '#3b82f6',
              background: 'rgba(59, 130, 246, 0.08)'
            }}
          >
            <Plus size={16} /> + Add Another Invoice
          </button>
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

        <form onSubmit={handleGenerateAll}>
          {invoiceEntries.map((entry, index) => {
            const entryImages = entry.images || [];

            return (
              <div 
                key={entry.id} 
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '18px',
                  padding: '22px',
                  marginBottom: '24px',
                  background: 'rgba(255, 255, 255, 0.01)',
                  position: 'relative'
                }}
              >
                {/* Entry Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#3b82f6',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800
                    }}>
                      Invoice #{index + 1}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                      Invoice Number: #{entry.invoiceNumber || nextExpectedNumber}
                    </span>
                  </div>

                  {invoiceEntries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveInvoiceEntry(entry.id)}
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
                      <X size={14} /> Remove Entry
                    </button>
                  )}
                </div>

                {/* Date and Invoice Number Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  {/* START DATE */}
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>
                      START DATE *
                    </label>
                    <input 
                      type="date" 
                      className="input-field" 
                      value={entry.startDate} 
                      onChange={(e) => updateEntryField(entry.id, 'startDate', e.target.value)}
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
                      value={entry.endDate} 
                      onChange={(e) => updateEntryField(entry.id, 'endDate', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  {/* MANUAL / SUGGESTED INVOICE NUMBER */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>
                        INVOICE NUMBER *
                      </label>
                      <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 600 }}>
                        Auto-suggested
                      </span>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="number" 
                        min="1"
                        step="1"
                        placeholder="e.g. 1"
                        className="input-field" 
                        value={entry.invoiceNumber} 
                        onChange={(e) => updateEntryField(entry.id, 'invoiceNumber', e.target.value)}
                        style={{ paddingLeft: '36px', fontWeight: 700 }}
                        required
                      />
                      <Hash size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Unique sequential number for this seller.
                    </p>
                  </div>
                </div>

                {/* MULTIPLE IMAGE UPLOAD SECTION (1-5 Images) */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '16px',
                  padding: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                          Upload Invoice Images *
                        </label>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: entryImages.length > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: entryImages.length > 0 ? '#22c55e' : '#ef4444'
                        }}>
                          {entryImages.length} / 5 Images
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                        Upload 1 to 5 images (Signed Invoice Front, Back, Supporting Docs). JPG, JPEG, PNG, WEBP (Max 10MB each).
                      </span>
                    </div>

                    {entryImages.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[entry.id]?.click()}
                        className="btn-secondary"
                        style={{
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          gap: '6px',
                          borderRadius: '8px',
                          height: 'auto'
                        }}
                      >
                        <Upload size={14} /> + Add Image
                      </button>
                    )}
                  </div>

                  <input 
                    type="file" 
                    ref={el => fileInputRefs.current[entry.id] = el}
                    style={{ display: 'none' }} 
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={(e) => handleFilesAdded(entry.id, e.target.files)}
                  />

                  {/* Empty state Drop Zone */}
                  {entryImages.length === 0 ? (
                    <div 
                      onClick={() => fileInputRefs.current[entry.id]?.click()}
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
                        Click to select 1–5 invoice images
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        PNG, JPG, JPEG, WEBP up to 10MB per image. Multi-file selection supported.
                      </p>
                    </div>
                  ) : (
                    /* Image Preview Grid */
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '14px',
                      marginTop: '12px'
                    }}>
                      {entryImages.map((img, imgIdx) => (
                        <div 
                          key={img.id}
                          style={{
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            padding: '10px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}
                        >
                          {/* Image Box */}
                          <div style={{
                            width: '100%',
                            height: '110px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            position: 'relative',
                            background: '#0a0a0c'
                          }}>
                            <img 
                              src={img.previewUrl} 
                              alt={img.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <span style={{
                              position: 'absolute',
                              top: '6px',
                              left: '6px',
                              background: 'rgba(0, 0, 0, 0.75)',
                              color: '#fff',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              Image #{imgIdx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSingleImage(entry.id, img.id)}
                              title="Remove image"
                              style={{
                                position: 'absolute',
                                top: '6px',
                                right: '6px',
                                background: 'rgba(239, 68, 68, 0.85)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '22px',
                                height: '22px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <X size={12} />
                            </button>
                          </div>

                          {/* Image Details */}
                          <div style={{ overflow: 'hidden' }}>
                            <p style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              margin: 0,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }} title={img.name}>
                              {img.name}
                            </p>
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              {(img.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Add Image Card if fewer than 5 */}
                      {entryImages.length < 5 && (
                        <div 
                          onClick={() => fileInputRefs.current[entry.id]?.click()}
                          style={{
                            border: '2px dashed rgba(59, 130, 246, 0.3)',
                            borderRadius: '12px',
                            minHeight: '150px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            background: 'rgba(59, 130, 246, 0.02)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Plus size={24} style={{ color: '#3b82f6', marginBottom: '6px' }} />
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6' }}>
                            Add Image ({5 - entryImages.length} left)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* UPLOAD PROGRESS */}
          {generating && uploadProgress > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                <span>Uploading {invoiceEntries.length} invoice(s) and raw binary images to MongoDB...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.2s ease' }} />
              </div>
            </div>
          )}

          {/* ACTIONS STRIP */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <button
              type="button"
              onClick={handleAddInvoiceEntry}
              className="btn-secondary"
              style={{
                height: '46px',
                padding: '0 20px',
                fontSize: '13px',
                fontWeight: 700,
                gap: '8px',
                borderRadius: '14px'
              }}
            >
              <Plus size={16} /> + Add Another Invoice
            </button>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={generating} 
              style={{ height: '48px', padding: '0 32px', whiteSpace: 'nowrap', fontSize: '14px', fontWeight: 700, borderRadius: '14px' }}
            >
              {generating ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={16} className="animate-spin" /> Generating...
                </div>
              ) : (
                <>
                  <Plus size={18} /> Generate {invoiceEntries.length > 1 ? `${invoiceEntries.length} Invoices` : `Invoice #${invoiceEntries[0]?.invoiceNumber || nextExpectedNumber}`}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* GENERATED INVOICES LIST TABLE */}
      <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Generated Invoices</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{invoices.length} Total</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--glass-bg)' }}>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>INVOICE NUMBER</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>INVOICE IMAGES</th>
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
              const imgCount = inv.imageCount || (inv.hasInvoiceImage ? 1 : 0);
              const blobUrl = imageBlobs[inv._id]?.primary;
              const isLoadingImg = imageLoading[`${inv._id}_primary`];

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

                  {/* INVOICE IMAGES (THUMBNAIL & COUNT) */}
                  <td style={{ padding: '16px 24px' }}>
                    {imgCount > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div 
                          onClick={() => {
                            if (blobUrl) {
                              setImageModalUrl(blobUrl);
                            } else {
                              openInvoiceDetails(inv);
                            }
                          }}
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            cursor: 'pointer',
                            position: 'relative',
                            background: 'rgba(0,0,0,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title={blobUrl ? "Click to view full image" : "Click to view details"}
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

                        {/* Image count badge */}
                        <span 
                          onClick={() => openInvoiceDetails(inv)}
                          style={{ 
                            fontSize: '12px', 
                            color: 'var(--text-dim)', 
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Click to view all images"
                        >
                          <Layers size={13} style={{ color: '#3b82f6' }} />
                          {imgCount} {imgCount === 1 ? 'Image' : 'Images'}
                        </span>
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

                  {/* ACTIONS: View, PDF, Delete */}
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => openInvoiceDetails(inv)}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', height: 'auto', gap: '4px' }}
                        title="View complete details and all images"
                      >
                        <Eye size={14} /> View
                      </button>
                      <button 
                        onClick={() => handleDownload(inv._id, inv.invoiceNumber)}
                        disabled={downloadingId === inv._id}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '12px', height: 'auto', gap: '6px' }}
                        title="Download PDF"
                      >
                        {downloadingId === inv._id ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" /> Downloading...
                          </>
                        ) : (
                          <>
                            <Download size={14} /> PDF
                          </>
                        )}
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

      {/* MODAL: INVOICE DETAILS & ALL UPLOADED IMAGES */}
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
            maxWidth: '780px',
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

            {/* UPLOADED INVOICE IMAGES GALLERY (ALL 1-5 IMAGES) */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Uploaded Documents & Images ({selectedInvoice.detailedImages?.length || selectedInvoice.images?.length || (selectedInvoice.hasInvoiceImage ? 1 : 0)})
                </span>
                <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 600 }}>
                  Raw Binary MongoDB Storage
                </span>
              </div>

              {((selectedInvoice.detailedImages && selectedInvoice.detailedImages.length > 0) || 
                (selectedInvoice.images && selectedInvoice.images.length > 0)) ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  {(selectedInvoice.detailedImages || selectedInvoice.images).map((imgDoc, idx) => {
                    const imgBlobUrl = imageBlobs[selectedInvoice._id]?.[imgDoc._id] || (idx === 0 ? imageBlobs[selectedInvoice._id]?.primary : null);
                    const isLoading = imageLoading[`${selectedInvoice._id}_${imgDoc._id}`];

                    return (
                      <div 
                        key={imgDoc._id || idx}
                        style={{
                          border: '1px solid var(--border-color)',
                          borderRadius: '16px',
                          overflow: 'hidden',
                          background: '#09090b',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        {/* Image Frame */}
                        <div 
                          onClick={() => imgBlobUrl && setImageModalUrl(imgBlobUrl)}
                          style={{
                            height: '160px',
                            background: '#000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: imgBlobUrl ? 'pointer' : 'default',
                            position: 'relative'
                          }}
                        >
                          {imgBlobUrl ? (
                            <>
                              <img 
                                src={imgBlobUrl} 
                                alt={imgDoc.originalName || `Document ${idx + 1}`} 
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                              <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0,0,0,0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0,
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity = 1}
                              onMouseLeave={e => e.currentTarget.style.opacity = 0}
                              >
                                <Eye size={18} color="#fff" />
                              </div>
                            </>
                          ) : isLoading ? (
                            <RefreshCw size={20} className="animate-spin" style={{ color: '#3b82f6' }} />
                          ) : (
                            <ImageIcon size={24} style={{ color: 'var(--text-dim)' }} />
                          )}
                        </div>

                        {/* Image Info & Full Size Link */}
                        <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ overflow: 'hidden', paddingRight: '6px' }}>
                            <p style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              margin: 0,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }} title={imgDoc.originalName || imgDoc.filename}>
                              Doc #{idx + 1}: {imgDoc.originalName || imgDoc.filename || 'Invoice Image'}
                            </p>
                            {imgDoc.size > 0 && (
                              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                                {(imgDoc.size / 1024).toFixed(1)} KB
                              </span>
                            )}
                          </div>

                          {imgBlobUrl && (
                            <button
                              type="button"
                              onClick={() => setImageModalUrl(imgBlobUrl)}
                              className="btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '10px', height: 'auto', gap: '4px' }}
                            >
                              <ExternalLink size={10} /> Full
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (selectedInvoice.hasInvoiceImage || selectedInvoice.invoiceImage) ? (
                /* Legacy single image fallback */
                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#09090b',
                  textAlign: 'center'
                }}>
                  {imageBlobs[selectedInvoice._id]?.primary ? (
                    <img 
                      src={imageBlobs[selectedInvoice._id].primary} 
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
                    {imageBlobs[selectedInvoice._id]?.primary && (
                      <button
                        type="button"
                        onClick={() => setImageModalUrl(imageBlobs[selectedInvoice._id].primary)}
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        <ExternalLink size={12} /> Open Full Size
                      </button>
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
                  disabled={downloadingId === selectedInvoice._id}
                  className="btn-primary"
                  style={{ padding: '10px 20px', gap: '6px' }}
                >
                  {downloadingId === selectedInvoice._id ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download size={16} /> Download PDF
                    </>
                  )}
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
            background: 'rgba(0, 0, 0, 0.88)',
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
