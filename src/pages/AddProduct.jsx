import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { uploadApi } from '../utils/api';
import { calculateCustomerPrice } from '../utils/pricing';
import { 
  Package, 
  ArrowLeft, 
  Loader2, 
  Image as ImageIcon, 
  FileText, 
  CheckCircle, 
  Plus, 
  Trash2, 
  IndianRupee, 
  Info,
  RefreshCcw,
  Check
} from 'lucide-react';
import Layout from '../components/Layout';

const AddProduct = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [priceTiers, setPriceTiers] = useState([]);
  const [b2bVariants, setB2bVariants] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentSellerInfo, setCurrentSellerInfo] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    subCategoryId: '',
    sellerB2bPrice: '',
    b2bPrice: '',
    commissionType: 'flat',
    commissionValue: 0,
    gstPercent: 0,
    moq: 1,
    unit: 'pcs',
    sellerId: '',
    stock: 0,
    stockStatus: 'Available',
    hsn: '',
    description: '',
    image: null,
    pdf: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cats, sells] = await Promise.all([
          api.get('/categories').catch(() => ({ data: [] })),
          api.get('/sellers').catch(() => ({ data: [] }))
        ]);
        setCategories(cats.data || []);
        setSellers(sells.data || []);
        
        // Auto-populate logged-in seller's ID and details
        const storedUserStr = localStorage.getItem('zudo_seller_user');
        const storedUser = storedUserStr ? JSON.parse(storedUserStr) : {};
        setCurrentSellerInfo(storedUser);
        const sId = storedUser?._id || storedUser?.id || '';
        if (sId) {
          setFormData(prev => ({ ...prev, sellerId: sId }));
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

  // Filter subcategories based on selected category
  const selectedCategory = categories.find(c => String(c._id) === String(formData.categoryId));
  const subCategories = selectedCategory?.subCategories || [];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // When category changes, reset subcategory to avoid invalid selections
      if (name === 'categoryId') {
        updated.subCategoryId = '';
      }
      return updated;
    });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files[0];
    if (file) {
      setFormData(prev => ({ ...prev, [name]: file }));
      if (name === 'image') {
        setImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleAddTier = () => setPriceTiers([...priceTiers, { minQty: '', sellerPrice: '', price: '' }]);
  const handleRemoveTier = (index) => setPriceTiers(priceTiers.filter((_, i) => i !== index));
  const handleTierChange = (index, field, value) => {
    const newTiers = [...priceTiers];
    newTiers[index][field] = value;
    setPriceTiers(newTiers);
  };

  const handleAddB2b = () => setB2bVariants([
    ...b2bVariants, 
    { packetSizeVal: '', packetSizeUnit: formData.unit || 'kg', sellerPrice: '', price: '', stock: '' }
  ]);
  const handleRemoveB2b = (index) => setB2bVariants(b2bVariants.filter((_, i) => i !== index));
  const handleB2bChange = (index, field, value) => {
    const newArr = [...b2bVariants];
    newArr[index][field] = value;
    setB2bVariants(newArr);
  };

  // Live calculation of Customer Wholesale Prices (Seller Price + GST, with 0 Commission)
  const sellerB2bVal = parseFloat(formData.sellerB2bPrice) || 0;
  const b2bCalculation = calculateCustomerPrice(sellerB2bVal, 'flat', 0);
  const gstNum = parseFloat(formData.gstPercent) || 0;
  const b2bGstAmount = (sellerB2bVal * gstNum) / 100;
  const b2bTotalWithGst = sellerB2bVal + b2bGstAmount;

  // Resolve display name for the current seller
  const resolvedSellerName = 
    sellers.find(s => String(s._id) === String(formData.sellerId))?.storeName ||
    sellers.find(s => String(s._id) === String(formData.sellerId))?.businessName ||
    sellers.find(s => String(s._id) === String(formData.sellerId))?.name ||
    currentSellerInfo?.storeName ||
    currentSellerInfo?.businessName ||
    currentSellerInfo?.name ||
    'My Store';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Field Validations
    if (!formData.name.trim()) {
      setError('Please enter a product name');
      return;
    }
    if (!formData.categoryId) {
      setError('Please select a product category');
      return;
    }
    if (!sellerB2bVal || sellerB2bVal <= 0) {
      setError('Please enter a valid base price greater than 0');
      return;
    }
    if (!formData.image) {
      setError('Please upload a product image');
      return;
    }

    setSubmitting(true);

    try {
      const data = new FormData();
      
      // Basic text fields
      data.append('name', formData.name.trim());
      data.append('categoryId', formData.categoryId);
      
      // Only append subCategoryId if selected and non-empty
      if (formData.subCategoryId && formData.subCategoryId.trim() !== '') {
        data.append('subCategoryId', formData.subCategoryId.trim());
      }

      // Explicitly set wholesale pricing without commission addition
      data.append('sellerB2bPrice', sellerB2bVal);
      data.append('b2bPrice', sellerB2bVal);
      data.append('sellerPrice', sellerB2bVal);
      data.append('price', sellerB2bVal);
      data.append('commissionType', 'flat');
      data.append('commissionValue', 0);
      data.append('commissionAmount', 0);
      
      data.append('gstPercent', gstNum);
      data.append('moq', parseInt(formData.moq) || 1);
      data.append('unit', formData.unit);
      data.append('stock', parseInt(formData.stock) || 0);
      data.append('stockStatus', formData.stockStatus || 'Available');
      
      if (formData.hsn && formData.hsn.trim() !== '') {
        data.append('hsn', formData.hsn.trim());
      }
      if (formData.description && formData.description.trim() !== '') {
        data.append('description', formData.description.trim());
      }
      if (formData.sellerId) {
        data.append('sellerId', formData.sellerId);
      }

      // File assets
      if (formData.image) data.append('image', formData.image);
      if (formData.pdf) data.append('pdf', formData.pdf);

      // Format B2B Variants
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

      // Format Price Tiers
      const formattedTiers = priceTiers
        .filter(t => t.minQty && (t.sellerPrice || t.price))
        .map(t => {
          const sPrice = parseFloat(t.sellerPrice || t.price) || 0;
          return {
            minQty: parseInt(t.minQty),
            sellerPrice: sPrice,
            price: sPrice
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
      console.error('Failed to create product:', err);
      setError(err.response?.data?.message || 'Failed to create product. Please verify all details.');
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px' }}>
          <Loader2 className="animate-spin" size={36} color="#6366f1" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '950px', margin: '0 auto', paddingBottom: '60px' }}>
        {/* Header navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            type="button"
            onClick={() => navigate('/products')} 
            style={{ 
              background: 'var(--card-bg)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-main)', 
              width: '42px', 
              height: '42px', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
              Add New B2B Product
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginTop: '2px' }}>
              Set your wholesale selling price, units, inventory, and variants
            </p>
          </div>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: '#ef4444', 
            padding: '16px 20px', 
            borderRadius: '14px', 
            border: '1px solid rgba(239, 68, 68, 0.25)',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '28px', border: '1px solid var(--border-color)' }}>
          
          {/* Section 1: Basic Details */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={18} color="#6366f1" /> Basic Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 600 }}>
                  Product Name *
                </label>
                <input 
                  type="text" 
                  name="name" 
                  className="input-field" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  required 
                  placeholder="e.g. Premium Basmati Rice" 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 500 }}>
                  Description
                </label>
                <textarea 
                  name="description" 
                  className="input-field" 
                  value={formData.description} 
                  onChange={handleInputChange} 
                  placeholder="Enter detailed specifications, quality standards, or usage instructions..." 
                  style={{ minHeight: '100px', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

          {/* Section 2: Classification & Seller */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-main)' }}>
              Classification & Seller
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 600 }}>
                  Category *
                </label>
                <select 
                  name="categoryId" 
                  className="input-field" 
                  value={formData.categoryId} 
                  onChange={handleInputChange} 
                  required
                  style={{ height: '48px', cursor: 'pointer' }}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 500 }}>
                  SubCategory
                </label>
                <select 
                  name="subCategoryId" 
                  className="input-field" 
                  value={formData.subCategoryId} 
                  onChange={handleInputChange} 
                  disabled={!formData.categoryId || subCategories.length === 0}
                  style={{ height: '48px', cursor: 'pointer' }}
                >
                  <option value="">Select SubCategory (Optional)</option>
                  {subCategories.map(sub => (
                    <option key={sub._id} value={sub._id}>{sub.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 500 }}>
                  Seller Store
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={resolvedSellerName} 
                  disabled 
                  style={{ height: '48px', opacity: 0.9, cursor: 'not-allowed', background: 'var(--card-bg)' }}
                />
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

          {/* Section 3: B2B Pricing & Inventory */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IndianRupee size={18} color="#22c55e" /> B2B Pricing
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 600 }}>
                  Base Price (₹) *
                </label>
                <input 
                  type="number" 
                  name="sellerB2bPrice" 
                  className="input-field" 
                  value={formData.sellerB2bPrice} 
                  onChange={handleInputChange} 
                  required 
                  min="0.01" 
                  step="0.01" 
                  placeholder="e.g. 2800" 
                />
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                  Your net wholesale payout price
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 600 }}>
                  Unit Type *
                </label>
                <select 
                  name="unit" 
                  className="input-field" 
                  value={formData.unit} 
                  onChange={handleInputChange} 
                  required
                  style={{ height: '48px', cursor: 'pointer' }}
                >
                  <option value="pcs">pcs</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ltr">ltr</option>
                  <option value="ml">ml</option>
                  <option value="bag">bag</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 600 }}>
                  GST % *
                </label>
                <input 
                  type="number" 
                  name="gstPercent" 
                  className="input-field" 
                  value={formData.gstPercent} 
                  onChange={handleInputChange} 
                  required 
                  min="0" 
                  step="0.1" 
                  placeholder="0"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 600 }}>
                  Stock Quantity *
                </label>
                <input 
                  type="number" 
                  name="stock" 
                  className="input-field" 
                  value={formData.stock} 
                  onChange={handleInputChange} 
                  required 
                  min="0" 
                  placeholder="100"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 600 }}>
                  MOQ *
                </label>
                <input 
                  type="number" 
                  name="moq" 
                  className="input-field" 
                  value={formData.moq} 
                  onChange={handleInputChange} 
                  required 
                  min="1" 
                  placeholder="1"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 500 }}>
                  HSN Code
                </label>
                <input 
                  type="text" 
                  name="hsn" 
                  className="input-field" 
                  value={formData.hsn} 
                  onChange={handleInputChange} 
                  placeholder="e.g. 25010090" 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 500 }}>
                  Stock Status
                </label>
                <select 
                  name="stockStatus" 
                  className="input-field" 
                  value={formData.stockStatus} 
                  onChange={handleInputChange}
                  style={{ height: '48px', cursor: 'pointer' }}
                >
                  <option value="Available">Available</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>
            </div>

            {/* Live Pricing Breakdown Preview Card */}
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
                  <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '10px' }}>
                    B2B WHOLESALE PRICING
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-dim)', fontWeight: 600, opacity: 0.85 }}>Base Price:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>₹{sellerB2bVal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-dim)', fontWeight: 600, opacity: 0.85 }}>GST ({gstNum}%):</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>₹{b2bGstAmount.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-color)', fontSize: '15px' }}>
                    <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>Total Price (incl. GST):</span>
                    <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '17px' }}>₹{b2bTotalWithGst.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* B2B Size Variants Section */}
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>B2B Size Variants</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Configure specific packet sizes with custom wholesale pricing.
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={handleAddB2b} 
                  style={{ 
                    background: 'rgba(245, 158, 11, 0.1)', 
                    color: '#f59e0b', 
                    border: 'none', 
                    padding: '8px 14px', 
                    borderRadius: '8px', 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px' 
                  }}
                >
                  <Plus size={14} /> Add B2B Variant
                </button>
              </div>

              {b2bVariants.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {b2bVariants.map((variant, index) => {
                    const vSellerPrice = parseFloat(variant.sellerPrice) || 0;
                    return (
                      <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', background: 'var(--card-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1.2, minWidth: '100px' }}>
                          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-main)', marginBottom: '4px', fontWeight: 600 }}>Size Value *</label>
                          <input 
                            type="number" 
                            className="input-field" 
                            value={variant.packetSizeVal} 
                            onChange={(e) => handleB2bChange(index, 'packetSizeVal', e.target.value)} 
                            placeholder="e.g. 500 or 1" 
                            required 
                            min="0" 
                            step="0.01" 
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: '90px' }}>
                          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-main)', marginBottom: '4px', fontWeight: 600 }}>Unit *</label>
                          <select 
                            className="input-field" 
                            value={variant.packetSizeUnit} 
                            onChange={(e) => handleB2bChange(index, 'packetSizeUnit', e.target.value)} 
                            required
                            style={{ height: '45px', cursor: 'pointer' }}
                          >
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                            <option value="ltr">ltr</option>
                            <option value="ml">ml</option>
                            <option value="pcs">pcs</option>
                            <option value="bag">bag</option>
                          </select>
                        </div>
                        <div style={{ flex: 1.5, minWidth: '130px' }}>
                          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-main)', marginBottom: '4px', fontWeight: 600 }}>Base Price (₹) *</label>
                          <input 
                            type="number" 
                            className="input-field" 
                            value={variant.sellerPrice} 
                            onChange={(e) => handleB2bChange(index, 'sellerPrice', e.target.value)} 
                            placeholder="Base Net Price" 
                            min="0" 
                            step="0.01" 
                            required 
                          />
                        </div>
                        <div style={{ flex: 1.5, minWidth: '140px' }}>
                          <label style={{ display: 'block', fontSize: '11px', color: '#22c55e', marginBottom: '4px', fontWeight: 600 }}>Total with GST (₹)</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            value={vSellerPrice > 0 ? `₹${(vSellerPrice + (vSellerPrice * gstNum) / 100).toFixed(2)}` : '₹0.00'} 
                            disabled 
                            style={{ background: 'rgba(34, 197, 94, 0.05)', borderColor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontWeight: 700 }} 
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: '80px' }}>
                          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-main)', marginBottom: '4px', fontWeight: 600 }}>Stock *</label>
                          <input 
                            type="number" 
                            className="input-field" 
                            value={variant.stock} 
                            onChange={(e) => handleB2bChange(index, 'stock', e.target.value)} 
                            placeholder="Stock" 
                            min="0" 
                            required 
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveB2b(index)} 
                          style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* B2B Tiered Pricing Section */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>B2B Tiered Pricing</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Offer bulk volume discounts when buyers order larger quantities.
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={handleAddTier} 
                  style={{ 
                    background: 'rgba(99, 102, 241, 0.1)', 
                    color: '#6366f1', 
                    border: 'none', 
                    padding: '8px 14px', 
                    borderRadius: '8px', 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px' 
                  }}
                >
                  <Plus size={14} /> Add Tier
                </button>
              </div>

              {priceTiers.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {priceTiers.map((tier, index) => {
                    const tSellerPrice = parseFloat(tier.sellerPrice) || 0;
                    return (
                      <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', background: 'var(--card-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-main)', marginBottom: '4px', fontWeight: 600 }}>Min Quantity</label>
                          <input 
                            type="number" 
                            className="input-field" 
                            value={tier.minQty} 
                            onChange={(e) => handleTierChange(index, 'minQty', e.target.value)} 
                            placeholder="e.g. 50" 
                            min="2" 
                          />
                        </div>
                        <div style={{ flex: 1.5, minWidth: '140px' }}>
                          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-main)', marginBottom: '4px', fontWeight: 600 }}>Base Price per Unit (₹)</label>
                          <input 
                            type="number" 
                            className="input-field" 
                            value={tier.sellerPrice} 
                            onChange={(e) => handleTierChange(index, 'sellerPrice', e.target.value)} 
                            placeholder="e.g. 190" 
                            min="0" 
                            step="0.01" 
                          />
                        </div>
                        <div style={{ flex: 1.5, minWidth: '140px' }}>
                          <label style={{ display: 'block', fontSize: '11px', color: '#22c55e', marginBottom: '4px', fontWeight: 600 }}>Total with GST (₹)</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            value={tSellerPrice > 0 ? `₹${(tSellerPrice + (tSellerPrice * gstNum) / 100).toFixed(2)}` : '₹0.00'} 
                            disabled 
                            style={{ background: 'rgba(34, 197, 94, 0.05)', color: '#22c55e', fontWeight: 600 }} 
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveTier(index)} 
                          style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

          {/* Section 4: Media Assets */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-main)' }}>
              Media Assets
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
              {/* Product Image */}
              <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '16px', border: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px', color: '#6366f1' }}>
                    <ImageIcon size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Product Image *</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>JPEG, PNG, WEBP (Max 5MB)</div>
                  </div>
                </div>

                {imagePreview && (
                  <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}>
                      Selected
                    </div>
                  </div>
                )}

                <input 
                  type="file" 
                  name="image" 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  required={!imagePreview} 
                  style={{ width: '100%', fontSize: '13px' }} 
                />
              </div>

              {/* Product Brochure PDF */}
              <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '16px', border: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '10px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '10px', color: '#ec4899' }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Product Brochure / PDF</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>PDF document (Optional)</div>
                  </div>
                </div>

                {formData.pdf && (
                  <div style={{ padding: '10px 14px', background: 'rgba(236, 72, 153, 0.08)', borderRadius: '10px', border: '1px solid rgba(236, 72, 153, 0.2)', fontSize: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} color="#ec4899" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formData.pdf.name}
                    </span>
                  </div>
                )}

                <input 
                  type="file" 
                  name="pdf" 
                  onChange={handleFileChange} 
                  accept="application/pdf" 
                  style={{ width: '100%', fontSize: '13px' }} 
                />
              </div>
            </div>
          </div>

          {/* Section 5: Submit Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button 
              type="button" 
              onClick={() => navigate('/products')}
              style={{
                padding: '14px 24px',
                borderRadius: '12px',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={submitting} 
              style={{ 
                padding: '14px 32px', 
                fontSize: '15px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                borderRadius: '12px'
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Creating Product...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Create B2B Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default AddProduct;
