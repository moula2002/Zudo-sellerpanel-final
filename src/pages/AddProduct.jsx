import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { uploadApi } from '../utils/api';
import { Package, ArrowLeft, Loader2, Image as ImageIcon, FileText, CheckCircle, Plus, Trash2  } from 'lucide-react';

const AddProduct = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [priceTiers, setPriceTiers] = useState([]);
  const [b2bVariants, setB2bVariants] = useState([]);
  const [b2cVariants, setB2cVariants] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    subCategoryId: '',
    price: '',
    b2bPrice: '',
    gstPercent: 0,
    moq: 1,
    unit: 'pcs',
    sellerId: '',
    stock: 0,
    sku: '',
    description: '',
    image: null,
    pdf: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cats, sells] = await Promise.all([
          api.get('/categories'),
          api.get('/sellers')
        ]);
        setCategories(cats.data);
        setSellers(sells.data);
        
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

  // Filter subcategories based on selected category
  const selectedCategory = categories.find(c => c._id === formData.categoryId);
  const subCategories = selectedCategory?.subCategories || [];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData(prev => ({ ...prev, [name]: files[0] }));
  };

  const handleAddTier = () => setPriceTiers([...priceTiers, { minQty: '', price: '' }]);
  const handleRemoveTier = (index) => setPriceTiers(priceTiers.filter((_, i) => i !== index));
  const handleTierChange = (index, field, value) => {
    const newTiers = [...priceTiers];
    newTiers[index][field] = value;
    setPriceTiers(newTiers);
  };


  const handleAddB2c = () => setB2cVariants([...b2cVariants, { packetSizeVal: '', packetSizeUnit: 'kg', price: '', stock: '' }]);
  const handleRemoveB2c = (index) => setB2cVariants(b2cVariants.filter((_, i) => i !== index));
  const handleB2cChange = (index, field, value) => {
    const newArr = [...b2cVariants];
    newArr[index][field] = value;
    setB2cVariants(newArr);
  };

  const handleAddB2b = () => setB2bVariants([...b2bVariants, { packetSizeVal: '', packetSizeUnit: 'kg', price: '', stock: '' }]);
  const handleRemoveB2b = (index) => setB2bVariants(b2bVariants.filter((_, i) => i !== index));
  const handleB2bChange = (index, field, value) => {
    const newArr = [...b2bVariants];
    newArr[index][field] = value;
    setB2bVariants(newArr);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          data.append(key, formData[key]);
        }
      });
      const formattedB2c = b2cVariants
        .filter(v => v.packetSizeVal && v.price)
        .map(v => ({
          packetSize: `${v.packetSizeVal}${v.packetSizeUnit}`,
          price: parseFloat(v.price),
          stock: parseInt(v.stock) || 0
        }));

      const formattedB2b = b2bVariants
        .filter(v => v.packetSizeVal && v.price)
        .map(v => ({
          packetSize: `${v.packetSizeVal}${v.packetSizeUnit}`,
          price: parseFloat(v.price),
          stock: parseInt(v.stock) || 0
        }));

      data.append('priceTiers', JSON.stringify(priceTiers.filter(t => t.minQty && t.price)));
      data.append('b2c', JSON.stringify(formattedB2c));
      data.append('b2b', JSON.stringify(formattedB2b));

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={() => navigate('/products')} 
          style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Add New Product</h2>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>Create a new item in your inventory</p>
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

        {/* Pricing & Inventory */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#e2e8f0' }}>Pricing & Inventory</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>B2C Price (Base ₹) *</label>
              <input type="number" name="price" className="input-field" value={formData.price} onChange={handleInputChange} required min="0" step="0.01" placeholder="0.00" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>B2B Price (Base ₹) *</label>
              <input type="number" name="b2bPrice" className="input-field" value={formData.b2bPrice} onChange={handleInputChange} required min="0" step="0.01" placeholder="0.00" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>SKU (Optional)</label>
              <input type="text" name="sku" className="input-field" value={formData.sku} onChange={handleInputChange} placeholder="SKU-XYZ-001" />
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
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>GST % *</label>
              <input type="number" name="gstPercent" className="input-field" value={formData.gstPercent} onChange={handleInputChange} required min="0" step="0.1" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>Unit *</label>
              <select name="unit" className="input-field" value={formData.unit} onChange={handleInputChange} required>
                <option value="pcs">pcs</option>
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ltr">ltr</option>
                <option value="ml">ml</option>
              </select>
            </div>
          </div>

          {/* B2C Size Variants Section */}
          <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>B2C Size Variants</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Configure packet sizes with custom B2C pricing and stock.</p>
              </div>
              <button type="button" onClick={handleAddB2c} style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={14} /> Add B2C Variant
              </button>
            </div>
            {b2cVariants.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {b2cVariants.map((variant, index) => (
                  <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ flex: 1.5 }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Size Value *</label>
                      <input type="number" className="input-field" value={variant.packetSizeVal} onChange={(e) => handleB2cChange(index, 'packetSizeVal', e.target.value)} placeholder="e.g. 500 or 1" required min="0" step="0.01" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Unit *</label>
                      <select className="input-field" value={variant.packetSizeUnit} onChange={(e) => handleB2cChange(index, 'packetSizeUnit', e.target.value)} required>
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ltr">ltr</option>
                        <option value="ml">ml</option>
                      </select>
                    </div>
                    <div style={{ flex: 1.5 }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>B2C Price (₹) *</label>
                      <input type="number" className="input-field" value={variant.price} onChange={(e) => handleB2cChange(index, 'price', e.target.value)} placeholder="Price" min="0" step="0.01" required />
                    </div>
                    <div style={{ flex: 1.2 }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Stock *</label>
                      <input type="number" className="input-field" value={variant.stock} onChange={(e) => handleB2cChange(index, 'stock', e.target.value)} placeholder="Stock" min="0" required />
                    </div>
                    <button type="button" onClick={() => handleRemoveB2c(index)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', height: '40px', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* B2B Size Variants Section */}
          <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>B2B Size Variants</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Configure packet sizes with custom B2B pricing and stock.</p>
              </div>
              <button type="button" onClick={handleAddB2b} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={14} /> Add B2B Variant
              </button>
            </div>
            {b2bVariants.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {b2bVariants.map((variant, index) => (
                  <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ flex: 1.5 }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Size Value *</label>
                      <input type="number" className="input-field" value={variant.packetSizeVal} onChange={(e) => handleB2bChange(index, 'packetSizeVal', e.target.value)} placeholder="e.g. 500 or 1" required min="0" step="0.01" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Unit *</label>
                      <select className="input-field" value={variant.packetSizeUnit} onChange={(e) => handleB2bChange(index, 'packetSizeUnit', e.target.value)} required>
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ltr">ltr</option>
                        <option value="ml">ml</option>
                      </select>
                    </div>
                    <div style={{ flex: 1.5 }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>B2B Price (₹) *</label>
                      <input type="number" className="input-field" value={variant.price} onChange={(e) => handleB2bChange(index, 'price', e.target.value)} placeholder="Price" min="0" step="0.01" required />
                    </div>
                    <div style={{ flex: 1.2 }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Stock *</label>
                      <input type="number" className="input-field" value={variant.stock} onChange={(e) => handleB2bChange(index, 'stock', e.target.value)} placeholder="Stock" min="0" required />
                    </div>
                    <button type="button" onClick={() => handleRemoveB2b(index)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', height: '40px', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
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
                {priceTiers.map((tier, index) => (
                  <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Min Quantity</label>
                      <input type="number" className="input-field" value={tier.minQty} onChange={(e) => handleTierChange(index, 'minQty', e.target.value)} placeholder="e.g. 50" min="2" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Price per Unit (₹)</label>
                      <input type="number" className="input-field" value={tier.price} onChange={(e) => handleTierChange(index, 'price', e.target.value)} placeholder="e.g. 190" min="0" step="0.01" />
                    </div>
                    <button type="button" onClick={() => handleRemoveTier(index)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', height: '40px', display: 'flex', alignItems: 'center' }}>
                      <Plus size={16} style={{ transform: 'rotate(45deg)' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>


        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />

        {/* Media */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#e2e8f0' }}>Media Assets</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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
            {submitting ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle size={18} /> Create Product</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;
