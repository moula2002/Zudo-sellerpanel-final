import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { uploadApi } from '../utils/api';
import { findCategoryCommission, calculateCustomerPrice } from '../utils/pricing';
import { Package, ArrowLeft, Loader2, Image as ImageIcon, FileText, CheckCircle, Plus, Trash2, IndianRupee, Info, Sparkles } from 'lucide-react';

const AddProduct = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [priceTiers, setPriceTiers] = useState([]);
  const [b2bVariants, setB2bVariants] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    subCategoryId: '',
    sellerB2bPrice: '',
    b2bPrice: '',
    commissionType: 'flat',
    commissionValue: '2',
    gstPercent: 0,
    moq: 1,
    unit: 'pcs',
    sellerId: '',
    stock: 0,
    stockStatus: 'Available',
    sku: '',
    hsn: '',
    description: '',
    image: null,
    pdf: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cats, sells, comms] = await Promise.all([
          api.get('/categories'),
          api.get('/sellers'),
          api.get('/commissions').catch(() => ({ data: [] }))
        ]);
        setCategories(cats.data || []);
        setSellers(sells.data || []);
        setCommissions(comms.data || []);
        
        // Auto-populate logged-in seller's ID
        const storedUserStr = localStorage.getItem('zudo_seller_user');
        const storedUser = storedUserStr ? JSON.parse(storedUserStr) : {};
        if (storedUser && storedUser._id) {
          setFormData(prev => ({ ...prev, sellerId: storedUser._id }));
        }
      } catch (err) {
        console.error('Failed to fetch required data', err);
        setError('Failed to load categories or sellers');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // Update commission when Category or Unit changes
  const applyAdminCommissionRule = (catId, unitStr) => {
    if (!catId) return;
    const rule = findCategoryCommission(commissions, catId, unitStr);
    if (rule) {
      setFormData(prev => ({
        ...prev,
        commissionType: rule.commissionType || 'flat',
        commissionValue: rule.commissionValue !== undefined ? String(rule.commissionValue) : '2'
      }));
    }
  };

  // Filter subcategories based on selected category
  const selectedCategory = categories.find(c => c._id === formData.categoryId);
  const subCategories = selectedCategory?.subCategories || [];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'categoryId' || name === 'unit') {
        const catId = name === 'categoryId' ? value : updated.categoryId;
        const u = name === 'unit' ? value : updated.unit;
        applyAdminCommissionRule(catId, u);
      }
      return updated;
    });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData(prev => ({ ...prev, [name]: files[0] }));
  };

  const handleAddTier = () => setPriceTiers([...priceTiers, { minQty: '', sellerPrice: '', price: '' }]);
  const handleRemoveTier = (index) => setPriceTiers(priceTiers.filter((_, i) => i !== index));
  const handleTierChange = (index, field, value) => {
    const newTiers = [...priceTiers];
    newTiers[index][field] = value;
    setPriceTiers(newTiers);
  };

  const handleAddB2b = () => setB2bVariants([...b2bVariants, { packetSizeVal: '', packetSizeUnit: formData.unit || 'kg', sellerPrice: '', price: '', stock: '' }]);
  const handleRemoveB2b = (index) => setB2bVariants(b2bVariants.filter((_, i) => i !== index));
  const handleB2bChange = (index, field, value) => {
    const newArr = [...b2bVariants];
    newArr[index][field] = value;
    setB2bVariants(newArr);
  };

  // Live calculation of Customer Wholesale Prices
  const sellerB2bVal = parseFloat(formData.sellerB2bPrice) || 0;
  const commType = formData.commissionType || 'flat';
  const commVal = parseFloat(formData.commissionValue) || 0;

  const b2bCalculation = calculateCustomerPrice(sellerB2bVal, commType, commVal);
  const gstNum = parseFloat(formData.gstPercent) || 0;
  const b2bGstAmount = (b2bCalculation.customerPrice * gstNum) / 100;
  const b2bTotalWithGst = b2bCalculation.customerPrice + b2bGstAmount;

  // Check if current commission matches an admin rule
  const matchedAdminRule = findCategoryCommission(commissions, formData.categoryId, formData.unit);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '' && key !== 'image' && key !== 'pdf') {
          data.append(key, formData[key]);
        }
      });

      // Pass calculated customer prices and explicit seller prices (mirroring B2B to root fields for broad compatibility)
      data.set('sellerB2bPrice', sellerB2bVal);
      data.set('b2bPrice', b2bCalculation.customerPrice);
      data.set('sellerPrice', sellerB2bVal);
      data.set('price', b2bCalculation.customerPrice);
      data.set('commissionType', commType);
      data.set('commissionValue', commVal);
      data.set('commissionAmount', b2bCalculation.commissionAmount);

      if (formData.image) data.append('image', formData.image);
      if (formData.pdf) data.append('pdf', formData.pdf);

      const formattedB2b = b2bVariants
        .filter(v => v.packetSizeVal && (v.sellerPrice || v.price))
        .map(v => {
          const sPrice = parseFloat(v.sellerPrice || v.price) || 0;
          const vCalc = calculateCustomerPrice(sPrice, commType, commVal);
          return {
            packetSize: `${v.packetSizeVal}${v.packetSizeUnit}`,
            sellerPrice: sPrice,
            price: vCalc.customerPrice,
            stock: parseInt(v.stock) || 0
          };
        });

      const formattedTiers = priceTiers
        .filter(t => t.minQty && (t.sellerPrice || t.price))
        .map(t => {
          const sPrice = parseFloat(t.sellerPrice || t.price) || 0;
          const tCalc = calculateCustomerPrice(sPrice, commType, commVal);
          return {
            minQty: parseInt(t.minQty),
            sellerPrice: sPrice,
            price: tCalc.customerPrice
          };
        });

      data.append('priceTiers', JSON.stringify(formattedTiers));
      data.append('b2b', JSON.stringify(formattedB2b));
      data.append('b2c', JSON.stringify([]));

      await uploadApi.post('/products', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      navigate('/products');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create product');
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}><Loader2 className="animate-spin" size={32} color="#6366f1" /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={() => navigate('/products')} 
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)' }}>Add New B2B Product</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-dim)' }}>Set your wholesale selling price and inventory details</p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Basic Details */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={18} color="#6366f1" /> Basic Details
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>Product Name *</label>
              <input type="text" name="name" className="input-field" value={formData.name} onChange={handleInputChange} required placeholder="Enter product name" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>Description</label>
              <textarea name="description" className="input-field" value={formData.description} onChange={handleInputChange} placeholder="Enter description" style={{ minHeight: '100px', resize: 'vertical' }}></textarea>
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />

        {/* Classification */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#e2e8f0' }}>Classification & Seller</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>Category *</label>
              <select name="categoryId" className="input-field" value={formData.categoryId} onChange={handleInputChange} required>
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>SubCategory</label>
              <select name="subCategoryId" className="input-field" value={formData.subCategoryId} onChange={handleInputChange} disabled={!formData.categoryId}>
                <option value="">Select SubCategory (Optional)</option>
                {subCategories.map(sub => (
                  <option key={sub._id} value={sub._id}>{sub.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>Assign Seller</label>
              <select name="sellerId" className="input-field" value={formData.sellerId} onChange={handleInputChange} disabled={formData.sellerId !== ''}>
                <option value="">Select Seller (Optional)</option>
                {sellers.map(seller => (
                  <option key={seller._id} value={seller._id}>{seller.storeName || seller.businessName || seller.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />

        {/* Seller Pricing Configuration */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IndianRupee size={18} color="#22c55e" /> B2B Pricing
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
                Base Price (₹) *
              </label>
              <input 
                type="number" 
                name="sellerB2bPrice" 
                className="input-field" 
                value={formData.sellerB2bPrice} 
                onChange={handleInputChange} 
                required 
                min="0" 
                step="0.01" 
                placeholder="e.g. 2800" 
              />
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>Your net wholesale payout price</span>
            </div>



            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>Unit Type *</label>
              <select name="unit" className="input-field" value={formData.unit} onChange={handleInputChange} required>
                <option value="pcs">pcs</option>
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ltr">ltr</option>
                <option value="ml">ml</option>
                <option value="bag">bag</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>GST % *</label>
              <input type="number" name="gstPercent" className="input-field" value={formData.gstPercent} onChange={handleInputChange} required min="0" step="0.1" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>Stock Quantity *</label>
              <input type="number" name="stock" className="input-field" value={formData.stock} onChange={handleInputChange} required min="0" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>MOQ *</label>
              <input type="number" name="moq" className="input-field" value={formData.moq} onChange={handleInputChange} required min="1" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>SKU (Optional)</label>
              <input type="text" name="sku" className="input-field" value={formData.sku} onChange={handleInputChange} placeholder="SKU-XYZ-001" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>HSN Code</label>
              <input type="text" name="hsn" className="input-field" value={formData.hsn} onChange={handleInputChange} placeholder="e.g. 25010090" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>Stock Status</label>
              <select name="stockStatus" className="input-field" value={formData.stockStatus} onChange={handleInputChange}>
                <option value="Available">Available</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Pricing Breakdown Preview Card */}
          {sellerB2bVal > 0 && (
            <div style={{
              marginTop: '20px',
              padding: '20px',
              borderRadius: '16px',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: 'var(--primary)', fontWeight: 700, fontSize: '15px' }}>
                <Info size={18} /> Live Pricing Breakdown
              </div>
              <div style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '10px' }}>B2B WHOLESALE PRICING</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-dim)', fontWeight: 600, opacity: 0.85 }}>Base Price:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>₹{sellerB2bVal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-dim)', fontWeight: 600, opacity: 0.85 }}>GST ({gstNum}%):</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>₹{((sellerB2bVal * gstNum) / 100).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-color)', fontSize: '15px' }}>
                  <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>Total Price (incl. GST):</span>
                  <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '17px' }}>₹{(sellerB2bVal + (sellerB2bVal * gstNum) / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* B2B Size Variants Section */}
          <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>B2B Size Variants</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Configure packet sizes with custom wholesale seller pricing.</p>
              </div>
              <button type="button" onClick={handleAddB2b} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={14} /> Add B2B Variant
              </button>
            </div>
            {b2bVariants.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {b2bVariants.map((variant, index) => {
                  const vSellerPrice = parseFloat(variant.sellerPrice) || 0;
                  return (
                    <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1.2, minWidth: '100px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Size Value *</label>
                        <input type="number" className="input-field" value={variant.packetSizeVal} onChange={(e) => handleB2bChange(index, 'packetSizeVal', e.target.value)} placeholder="e.g. 500 or 1" required min="0" step="0.01" />
                      </div>
                      <div style={{ flex: 1, minWidth: '90px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Unit *</label>
                        <select className="input-field" value={variant.packetSizeUnit} onChange={(e) => handleB2bChange(index, 'packetSizeUnit', e.target.value)} required>
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="ltr">ltr</option>
                          <option value="ml">ml</option>
                          <option value="pcs">pcs</option>
                          <option value="bag">bag</option>
                        </select>
                      </div>
                      <div style={{ flex: 1.5, minWidth: '130px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Base Price (₹) *</label>
                        <input type="number" className="input-field" value={variant.sellerPrice} onChange={(e) => handleB2bChange(index, 'sellerPrice', e.target.value)} placeholder="Base Net Price" min="0" step="0.01" required />
                      </div>
                      <div style={{ flex: 1.5, minWidth: '140px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#22c55e', marginBottom: '4px', fontWeight: 600 }}>Total with GST (₹)</label>
                        <input type="text" className="input-field" value={vSellerPrice > 0 ? `₹${(vSellerPrice + (vSellerPrice * gstNum) / 100).toFixed(2)}` : '₹0.00'} disabled style={{ background: 'rgba(34, 197, 94, 0.05)', borderColor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontWeight: 700 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: '80px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Stock *</label>
                        <input type="number" className="input-field" value={variant.stock} onChange={(e) => handleB2bChange(index, 'stock', e.target.value)} placeholder="Stock" min="0" required />
                      </div>
                      <button type="button" onClick={() => handleRemoveB2b(index)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', height: '40px', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>B2B Tiered Pricing</h4>
              <button type="button" onClick={handleAddTier} style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={14} /> Add Tier
              </button>
            </div>
            {priceTiers.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {priceTiers.map((tier, index) => {
                  const tSellerPrice = parseFloat(tier.sellerPrice) || 0;
                  return (
                    <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '120px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Min Quantity</label>
                        <input type="number" className="input-field" value={tier.minQty} onChange={(e) => handleTierChange(index, 'minQty', e.target.value)} placeholder="e.g. 50" min="2" />
                      </div>
                      <div style={{ flex: 1.5, minWidth: '140px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Base Price per Unit (₹)</label>
                        <input type="number" className="input-field" value={tier.sellerPrice} onChange={(e) => handleTierChange(index, 'sellerPrice', e.target.value)} placeholder="e.g. 190" min="0" step="0.01" />
                      </div>
                      <div style={{ flex: 1.5, minWidth: '140px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#22c55e', marginBottom: '4px' }}>Total with GST (₹)</label>
                        <input type="text" className="input-field" value={tSellerPrice > 0 ? `₹${(tSellerPrice + (tSellerPrice * gstNum) / 100).toFixed(2)}` : '₹0.00'} disabled style={{ background: 'rgba(34, 197, 94, 0.05)', color: '#22c55e', fontWeight: 600 }} />
                      </div>
                      <button type="button" onClick={() => handleRemoveTier(index)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', height: '40px', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />

        {/* Media */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#e2e8f0' }}>Media Assets</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px', color: '#6366f1' }}>
                  <ImageIcon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>Product Image *</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>JPEG, PNG, WEBP</div>
                </div>
              </div>
              <input type="file" name="image" onChange={handleFileChange} accept="image/*" required style={{ width: '100%', fontSize: '13px' }} />
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '10px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '10px', color: '#ec4899' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>Product Brochure / PDF</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>PDF document (Optional)</div>
                </div>
              </div>
              <input type="file" name="pdf" onChange={handleFileChange} accept="application/pdf" style={{ width: '100%', fontSize: '13px' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: '14px 32px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {submitting ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle size={18} /> Create B2B Product</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;
