import React, { useState } from 'react';
import api from '../utils/api';
import { Upload, FileText, CheckCircle, AlertCircle, Download, FileSpreadsheet } from 'lucide-react';
import Layout from '../components/Layout';

const BulkUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/products/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage(response.data.message);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload products. Please check the file format.');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Category,SubCategory,GST,MOQ,Unit,Description,ImageUrl,PdfUrl,B2C_Size,B2C_Price,B2C_Stock,B2B_Size,B2B_Price,B2B_Stock,Tier1_Qty,Tier1_Price,Tier2_Qty,Tier2_Price\n"
      + "Example Product,Electronics,Mobile,18,5,pcs,High quality smartphone,https://example.com/image.png,https://example.com/spec.pdf,1kg,10000,50,1kg,9500,50,50,9000,100,8500\n"
      + "Example Product,Electronics,Mobile,18,5,pcs,High quality smartphone,https://example.com/image.png,https://example.com/spec.pdf,2kg,19000,30,2kg,18000,30,50,17000,100,16500";
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "product_bulk_upload_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>Bulk Product Upload</h1>
          <p style={{ color: 'var(--text-dim)' }}>Upload multiple products at once using an Excel or CSV file.</p>
        </div>

        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Instructions Card */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', background: 'var(--card-bg)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={20} color="var(--primary)" />
              How it works
            </h3>
            <ul style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px' }}>
              <li>Download the sample template to see the required column headers.</li>
              <li>Fill in your product details. Mandatory fields: <strong>Name, Category, Unit</strong>.</li>
              <li>Include the <strong>GST</strong> column (use standard brackets: <code>0</code>, <code>5</code>, <code>12</code>, <code>18</code>, <code>28</code>) to set the product tax rate. Defaults to 0 if left empty.</li>
              <li>Use <strong>Description</strong>, <strong>ImageUrl</strong>, and <strong>PdfUrl</strong> for rich product details.</li>
              <li>To add variants, use <strong>B2C_Size</strong>, <strong>B2C_Price</strong>, <strong>B2C_Stock</strong> for customers, and <strong>B2B_Size</strong>, <strong>B2B_Price</strong>, <strong>B2B_Stock</strong> for wholesale partners.</li>
              <li>Upload the file below and wait for the confirmation message.</li>
            </ul>
            <button 
              onClick={downloadTemplate}
              style={{
                marginTop: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--primary)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              <Download size={18} />
              Download CSV Template
            </button>
          </div>

          {/* Upload Area */}
          <div className="glass-card" style={{ padding: '40px', borderRadius: '24px', textAlign: 'center', border: '2px dashed var(--border-color)', background: 'var(--glass-bg)' }}>
            <div 
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px'
              }}
            >
              <Upload size={32} color="var(--primary)" />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
              {file ? file.name : 'Select your file'}
            </h3>
            <p style={{ color: 'var(--text-dim)', marginBottom: '24px' }}>
              Supported formats: .xlsx, .xls, .csv
            </p>

            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileChange}
              id="bulk-file-upload"
              style={{ display: 'none' }}
            />
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <label 
                htmlFor="bulk-file-upload"
                className="btn-secondary"
                style={{ cursor: 'pointer', margin: 0 }}
              >
                Browse Files
              </label>
              
              {file && (
                <button 
                  onClick={handleUpload}
                  disabled={loading}
                  className="btn-primary"
                  style={{ margin: 0 }}
                >
                  {loading ? 'Uploading...' : 'Upload Products'}
                </button>
              )}
            </div>

            {message && (
              <div style={{ marginTop: '24px', padding: '12px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '600' }}>
                <CheckCircle size={18} />
                {message}
              </div>
            )}

            {error && (
              <div style={{ marginTop: '24px', padding: '12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '600' }}>
                <AlertCircle size={18} />
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BulkUpload;
