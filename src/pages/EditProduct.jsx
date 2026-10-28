import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { uploadApi, IMAGE_BASE_URL, getImageUrl } from '../utils/api';
import { findCategoryCommission, calculateCustomerPrice } from '../utils/pricing';
import {
  Package,
  ChevronLeft,
  Upload,
  Save,
  X,
  Info,
  Tag,
  IndianRupee,
  Layers,
  FileText,
  Boxes,
  ClipboardList,
  RefreshCcw,
  Trash2,
  Plus,
  Sparkles
} from 'lucide-react';
import Layout from '../components/Layout';

const EditProduct = () => {
  const { id } = useParams();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sellerB2bPrice: '',
    b2bPrice: '',
    commissionType: 'flat',
    commissionValue: '2',
    moq: '1',
    unit: 'pcs',
    categoryId: '',
    subCategoryId: '',
    stock: '',
    stockStatus: 'Available',
    sku: '',
    hsn: '',
    gstPercent: '0',
    sellerId: '',
    imageUrl: '',
    pdfUrl: ''
  });

  const [categories, setCategories] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [b2bVariants, setB2bVariants] = useState([]);
  const [previews, setPreviews] = useState({ image: null });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const navigate = useNavigate();
  const [calcQuantity, setCalcQuantity] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, productRes, commRes] = await Promise.all([
          api.get('/categories'),
          api.get(`/products/${id}`),
          api.get('/commissions').catch(() => ({ data: [] }))
        ]);
        setCategories(catRes.data || []);
        setCommissions(commRes.data || []);
        const p = productRes.data;

        // Resolve base wholesale selling price
        const baseSellerB2bPrice = p.sellerB2bPrice !== undefined && p.sellerB2bPrice !== null
          ? String(p.sellerB2bPrice)
          : (p.sellerPrice !== undefined && p.sellerPrice !== null
              ? String(p.sellerPrice)
              : String(p.b2bPrice || p.price || ''));

        const commType = p.commissionType || 'flat';
        const commVal = p.commissionValue !== undefined && p.commissionValue !== null
          ? String(p.commissionValue)
          : '2';

        setFormData({
          name: p.name || '',
          description: p.description || '',
          sellerB2bPrice: baseSellerB2bPrice,
          b2bPrice: p.b2bPrice ? String(p.b2bPrice) : (p.price ? String(p.price) : ''),
          commissionType: commType,
          commissionValue: commVal,
          moq: p.moq ? String(p.moq) : '1',
          unit: p.unit || 'pcs',
          categoryId: p.categoryId?._id || p.categoryId || '',
          subCategoryId: p.subCategoryId?._id || p.subCategoryId || '',
          stock: p.stock !== undefined ? String(p.stock) : '',
          stockStatus: p.stockStatus || 'Available',
          sku: p.sku || '',
          hsn: p.hsn || '',
          gstPercent: p.gstPercent !== undefined ? String(p.gstPercent) : '0',
          sellerId: p.sellerId?._id || p.sellerId || '',
          imageUrl: p.imageUrl || '',
          pdfUrl: p.pdfUrl || ''
        });

        const parsePacketSize = (sizeStr) => {
          if (!sizeStr) return { val: '', unit: 'kg' };
          const valMatch = sizeStr.match(/^[\d\.]+/);
          const unitMatch = sizeStr.match(/[a-zA-Z]+$/);
          return {
            val: valMatch ? valMatch[0] : '',
            unit: unitMatch ? unitMatch[0] : 'kg'
          };
        };

        const parsedB2b = (p.b2b || []).map(v => {
          const parsed = parsePacketSize(v.packetSize);
          const vSeller = v.sellerPrice !== undefined && v.sellerPrice !== null ? v.sellerPrice : (v.price || '');
          return {
            packetSizeVal: parsed.val,
            packetSizeUnit: parsed.unit,
            sellerPrice: vSeller ? String(vSeller) : '',
            price: v.price ? String(v.price) : '',
            stock: v.stock !== undefined ? String(v.stock) : ''
          };
        });

        setB2bVariants(parsedB2b);
        if (p.imageUrl) {
          setPreviews(prev => ({ ...prev, image: getImageUrl(p.imageUrl) }));
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        alert('Failed to load product details');
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [id]);

  // Sync with Admin category commission if seller changes Category or Unit
  const handleCategoryOrUnitChange = (catId, unitStr) => {
    const rule = findCategoryCommission(commissions, catId, unitStr);
    if (rule) {
      setFormData(prev => ({
        ...prev,
        commissionType: rule.commissionType || 'flat',
        commissionValue: rule.commissionValue !== undefined ? String(rule.commissionValue) : '2'
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviews({ ...previews, image: URL.createObjectURL(file) });
    }
  };

  const handleAddB2b = () => setB2bVariants([...b2bVariants, { packetSizeVal: '', packetSizeUnit: formData.unit || 'kg', sellerPrice: '', price: '', stock: '' }]);
  const handleRemoveB2b = (index) => setB2bVariants(b2bVariants.filter((_, i) => i !== index));
  const handleB2bChange = (index, field, value) => {
    const newArr = [...b2bVariants];
    newArr[index][field] = value;
    setB2bVariants(newArr);
  };

  // Calculations for wholesale B2B pricing
  const sellerB2bVal = parseFloat(formData.sellerB2bPrice) || 0;
  const commType = formData.commissionType || 'flat';
  const commVal = parseFloat(formData.commissionValue) || 0;

  const b2bCalc = calculateCustomerPrice(sellerB2bVal, commType, commVal);

  const selectedCategory = categories.find(c => String(c._id) === String(formData.categoryId));
  const gstPercentNum = Number(formData.gstPercent) || 0;

  const b2bCustomerBase = b2bCalc.customerPrice * calcQuantity;
  const b2bSellerBase = sellerB2bVal * calcQuantity;
  const b2bCommissionTotal = b2bCalc.commissionAmount * calcQuantity;
  const b2bGstAmount = (b2bCustomerBase * gstPercentNum) / 100;
  const b2bPriceTotal = b2bCustomerBase + b2bGstAmount;

  const matchedAdminRule = findCategoryCommission(commissions, formData.categoryId, formData.unit);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = formData.imageUrl;

      if (selectedImage) {
        const imgData = new FormData();
        imgData.append('file', selectedImage);
        const { data: imgRes } = await uploadApi.post('/upload', imgData);
        imageUrl = `${IMAGE_BASE_URL}${imgRes.url}`;
      }

      const formattedB2b = b2bVariants
        .filter(v => v.packetSizeVal && (v.sellerPrice || v.price))
        .map(v => {
          const sPrice = parseFloat(v.sellerPrice || v.price) || 0;
          return {
            packetSize: `${v.packetSizeVal}${v.packetSizeUnit}`,
            sellerPrice: sPrice,
            price: sPrice,
            stock: parseInt(v.stock) || 0
          };
        });

      const cleanSubCategoryId = formData.subCategoryId && formData.subCategoryId !== '' && formData.subCategoryId !== 'null'
        ? formData.subCategoryId
        : null;

      await api.put(`/products/${id}`, {
        ...formData,
        subCategoryId: cleanSubCategoryId,
        sellerB2bPrice: sellerB2bVal,
        b2bPrice: sellerB2bVal,
        sellerPrice: sellerB2bVal,
        price: sellerB2bVal,
        commissionType: 'flat',
        commissionValue: 0,
        commissionAmount: 0,
        b2b: formattedB2b,
        b2c: [],
        imageUrl,
        pdfUrl: formData.pdfUrl
      });

      navigate('/products');
    } catch (err) {
      console.error('Update error:', err);
      alert(err.response?.data?.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <div className="animate-spin"><Package size={40} color="#6366f1" /></div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
        {/* Header Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
          <button
            onClick={() => navigate('/products')}
            style={{
              width: '45px',
              height: '45px',
              borderRadius: '15px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
              Edit B2B Product
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginTop: '4px' }}>
              Manage wholesale selling price, platform commission, and customer pricing
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }} className="edit-product-grid">
          <style>{`
            @media (max-width: 900px) {
              .edit-product-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* General Info Card */}
            <div className="glass-card" style={{ padding: '30px', borderRadius: '30px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
                <div style={{ width: '35px', height: '35px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                  <Package size={18} />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Basic Information</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Product Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter product title"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Description</label>
                  <textarea
                    className="input-field"
                    placeholder="Write product description..."
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>

            {/* Pricing & Commission Card */}
            <div className="glass-card" style={{ padding: '30px', borderRadius: '30px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '35px', height: '35px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
                    <IndianRupee size={18} />
                  </div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700 }}>B2B Pricing</h2>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Base Price (₹) *</label>
                  <div style={{ position: 'relative' }}>
                    <IndianRupee size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input
                      type="number"
                      className="input-field"
                      style={{ paddingLeft: '42px' }}
                      placeholder="e.g. 2800"
                      value={formData.sellerB2bPrice}
                      onChange={e => setFormData({ ...formData, sellerB2bPrice: e.target.value })}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Your net wholesale payout price</span>
                </div>


                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>GST Rate (%)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 18"
                    value={formData.gstPercent}
                    onChange={e => setFormData({ ...formData, gstPercent: e.target.value })}
                    required
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Stock Quantity</label>
                  <div style={{ position: 'relative' }}>
                    <Boxes size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input
                      type="number"
                      className="input-field"
                      style={{ paddingLeft: '45px' }}
                      placeholder="0"
                      value={formData.stock}
                      onChange={e => setFormData({ ...formData, stock: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Unit Type</label>
                  <select
                    className="input-field"
                    value={formData.unit}
                    onChange={e => {
                      const newUnit = e.target.value;
                      setFormData(prev => ({ ...prev, unit: newUnit }));
                      handleCategoryOrUnitChange(formData.categoryId, newUnit);
                    }}
                    required
                    style={{ height: '50px', cursor: 'pointer' }}
                  >
                    <option value="pcs">pcs</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ltr">ltr</option>
                    <option value="ml">ml</option>
                    <option value="bag">bag</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>MOQ</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="1"
                    value={formData.moq}
                    onChange={e => setFormData({ ...formData, moq: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>HSN Code</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 25010090"
                    value={formData.hsn}
                    onChange={e => setFormData({ ...formData, hsn: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Stock Status</label>
                  <select
                    className="input-field"
                    value={formData.stockStatus || 'Available'}
                    onChange={e => setFormData({ ...formData, stockStatus: e.target.value })}
                    style={{ height: '50px', cursor: 'pointer' }}
                  >
                    <option value="Available">Available</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Pricing Breakdown Card */}
              {sellerB2bVal > 0 && (
                <div style={{
                  marginTop: '25px',
                  padding: '24px',
                  borderRadius: '20px',
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  fontSize: '13px',
                  lineHeight: '1.6'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
                      <Info size={18} /> Live Pricing Breakdown
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                        Simulate Quantity:
                      </span>
                      <select
                        value={calcQuantity}
                        onChange={e => setCalcQuantity(Number(e.target.value))}
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-main)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <option value="1">1 {formData.unit || 'unit'}</option>
                        <option value="2">2 {formData.unit || 'units'}</option>
                        <option value="3">3 {formData.unit || 'units'}</option>
                        <option value="5">5 {formData.unit || 'units'}</option>
                        <option value="10">10 {formData.unit || 'units'}</option>
                        <option value="20">20 {formData.unit || 'units'}</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Seller Unit Price:</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>₹{sellerB2bVal.toFixed(2)} / {formData.unit || 'unit'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                      <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Total Seller Price ({calcQuantity} {formData.unit}):</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>₹{b2bSellerBase.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                      <span style={{ color: '#6366f1', fontWeight: 600 }}>Commission ({commType === 'flat' ? `Flat ₹${b2bCalc.commissionAmount}/unit` : `${commVal}%`}):</span>
                      <span style={{ color: '#6366f1', fontWeight: 700 }}>+₹{b2bCommissionTotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                      <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Applicable GST ({gstPercentNum}%):</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>+₹{b2bGstAmount.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-color)', fontSize: '15px' }}>
                      <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>Final Customer Price:</span>
                      <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '17px' }}>₹{b2bPriceTotal.toFixed(2)}</span>
                    </div>
                    {commType === 'flat' && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--border-color)', fontSize: '11px', color: 'var(--text-dim)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span>Rate: ₹{b2bCalc.commissionAmount}/unit</span>
                        <span>•</span>
                        <span>Qty 1: ₹{(b2bCalc.commissionAmount * 1).toFixed(2)}</span>
                        <span>•</span>
                        <span>Qty 2: ₹{(b2bCalc.commissionAmount * 2).toFixed(2)}</span>
                        <span>•</span>
                        <span>Qty 3: ₹{(b2bCalc.commissionAmount * 3).toFixed(2)}</span>
                        <span>•</span>
                        <span>Qty 5: ₹{(b2bCalc.commissionAmount * 5).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* B2B Size Variants Section */}
              <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>B2B Size Variants</h4>
                  <button type="button" onClick={handleAddB2b} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={16} /> Add B2B Variant
                  </button>
                </div>
                {b2bVariants.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {b2bVariants.map((variant, index) => {
                      const vSeller = parseFloat(variant.sellerPrice) || 0;
                      return (
                        <div key={index} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '15px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1.2, minWidth: '100px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-main)', marginBottom: '6px', fontWeight: 600 }}>Size Value *</label>
                            <input type="number" className="input-field" value={variant.packetSizeVal} onChange={(e) => handleB2bChange(index, 'packetSizeVal', e.target.value)} placeholder="e.g. 500" required min="0" step="0.01" />
                          </div>
                          <div style={{ flex: 1, minWidth: '90px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-main)', marginBottom: '6px', fontWeight: 600 }}>Unit *</label>
                            <select className="input-field" value={variant.packetSizeUnit} onChange={(e) => handleB2bChange(index, 'packetSizeUnit', e.target.value)} required style={{ height: '48px', cursor: 'pointer' }}>
                              <option value="g">g</option>
                              <option value="kg">kg</option>
                              <option value="ltr">ltr</option>
                              <option value="ml">ml</option>
                              <option value="pcs">pcs</option>
                              <option value="bag">bag</option>
                            </select>
                          </div>
                          <div style={{ flex: 1.5, minWidth: '130px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-main)', marginBottom: '6px', fontWeight: 600 }}>Base Price (₹) *</label>
                            <input type="number" className="input-field" value={variant.sellerPrice} onChange={(e) => handleB2bChange(index, 'sellerPrice', e.target.value)} placeholder="Seller Net Price" min="0" step="0.01" required style={{ height: '48px' }} />
                          </div>
                          <div style={{ flex: 1.5, minWidth: '140px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#22c55e', marginBottom: '6px', fontWeight: 600 }}>Total with GST (₹)</label>
                            <input type="text" className="input-field" value={vSeller > 0 ? `₹${(vSeller + (vSeller * gstPercentNum) / 100).toFixed(2)}` : '₹0.00'} disabled style={{ background: 'rgba(34, 197, 94, 0.05)', borderColor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontWeight: 700, height: '48px' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: '80px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-main)', marginBottom: '6px', fontWeight: 600 }}>Stock *</label>
                            <input type="number" className="input-field" value={variant.stock} onChange={(e) => handleB2bChange(index, 'stock', e.target.value)} placeholder="Stock" min="0" required style={{ height: '48px' }} />
                          </div>
                          <button type="button" onClick={() => handleRemoveB2b(index)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '12px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={20} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Media Card */}
            <div className="glass-card" style={{ padding: '30px', borderRadius: '30px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
                <div style={{ width: '35px', height: '35px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
                  <Upload size={18} />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Media</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div
                  onClick={() => document.getElementById('image-upload').click()}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: '24px',
                    border: '2px dashed rgba(255,255,255,0.1)',
                    background: previews.image ? `url(${previews.image}) center/cover` : 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    transition: 'all 0.3s'
                  }}
                  className="media-upload-container"
                >
                  {!previews.image && (
                    <>
                      <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                        <Upload size={24} color="var(--primary)" />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Upload Image</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>PNG, JPG up to 5MB</span>
                    </>
                  )}
                  {previews.image && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.3s'
                    }} className="upload-overlay">
                      <RefreshCcw size={24} color="white" />
                    </div>
                  )}
                  <input id="image-upload" type="file" hidden accept="image/*" onChange={handleImageChange} />
                </div>
              </div>
            </div>

            {/* Category Card */}
            <div className="glass-card" style={{ padding: '30px', borderRadius: '30px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
                <div style={{ width: '35px', height: '35px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899' }}>
                  <Layers size={18} />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Categorization</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Category</label>
                  <select
                    className="input-field"
                    value={formData.categoryId}
                    onChange={e => {
                      const newCatId = e.target.value;
                      setFormData({ ...formData, categoryId: newCatId, subCategoryId: '' });
                      handleCategoryOrUnitChange(newCatId, formData.unit);
                    }}
                    required
                    style={{ height: '50px', cursor: 'pointer' }}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Sub-Category (Optional)</label>
                  <select
                    className="input-field"
                    value={formData.subCategoryId}
                    onChange={e => setFormData({ ...formData, subCategoryId: e.target.value })}
                    disabled={!formData.categoryId}
                    style={{ height: '50px', cursor: 'pointer' }}
                  >
                    <option value="">Select Sub-Category (Optional)</option>
                    {selectedCategory?.subCategories?.map(sub => (
                      <option key={sub._id} value={sub._id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

          </div>
        </form>

        {/* Bottom Actions */}
        <div style={{
          marginTop: '40px',
          padding: '24px',
          borderRadius: '24px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => navigate('/products')}
            style={{
              padding: '12px 32px',
              borderRadius: '15px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-main)',
              fontWeight: 600,
              cursor: 'pointer',
              flex: '1',
              minWidth: '120px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary"
            style={{ padding: '12px 48px', borderRadius: '15px', flex: '2', minWidth: '200px' }}
            disabled={loading}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="animate-spin"><Save size={18} /></div>
                <span>Updating...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Save size={18} />
                <span>Update B2B Product</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default EditProduct;
