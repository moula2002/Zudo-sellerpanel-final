import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { IMAGE_BASE_URL, getImageUrl } from '../utils/api';
import { Package, Plus, Search, Filter, MoreVertical, Edit2, Trash2, Eye, X, IndianRupee, Percent } from 'lucide-react';
import Layout from '../components/Layout';

const ProductDetailModal = ({ product, onClose }) => {
  if (!product) return null;

  const gstRate = product.gstRate || product.gstPercent || 0;
  
  // Base B2B wholesale prices
  const sellerPrice = product.sellerB2bPrice !== undefined && product.sellerB2bPrice !== null
    ? product.sellerB2bPrice
    : (product.sellerPrice !== undefined && product.sellerPrice !== null
        ? product.sellerPrice
        : (product.b2b && product.b2b.length > 0 && product.b2b[0].sellerPrice !== undefined
            ? product.b2b[0].sellerPrice
            : (product.b2bPrice || product.price || 0)));

  const customerPrice = product.b2bPrice || (product.b2b && product.b2b.length > 0 ? product.b2b[0].price : product.price || 0);
  const customerTotalWithGst = customerPrice + (customerPrice * gstRate) / 100;

  const commType = product.commissionType || 'flat';
  const commVal = product.commissionValue !== undefined && product.commissionValue !== null ? product.commissionValue : 0;
  const commLabel = commType === 'flat' ? `₹${commVal}/unit` : `${commVal}%`;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        borderRadius: '32px',
        padding: '32px',
        position: 'relative',
        border: '1px solid var(--glass-border)',
        background: 'var(--bg-dark)'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            right: '24px',
            top: '24px',
            background: 'var(--glass-bg)',
            border: 'none',
            color: 'var(--text-dim)',
            padding: '8px',
            borderRadius: '12px',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '32px' 
        }} className="modal-grid">
          <style>
            {`
              @media (max-width: 768px) {
                .modal-grid {
                  grid-template-columns: 1fr !important;
                  gap: 20px !important;
                }
              }
            `}
          </style>
          <div>
            <div style={{ 
              width: '100%', 
              aspectRatio: '1', 
              borderRadius: '24px', 
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <img 
                src={getImageUrl(product.imageUrl)} 
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x400?text=No+Image'; }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ 
                  background: 'rgba(99, 102, 241, 0.1)', 
                  color: '#6366f1', 
                  padding: '6px 14px', 
                  borderRadius: '10px', 
                  fontSize: '11px', 
                  fontWeight: 700,
                  letterSpacing: '0.5px'
                }}>
                  {product.categoryId?.name || 'Category'}
                </div>
                <div style={{ color: '#64748b' }} className="desktop-only">/</div>
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  color: '#94a3b8', 
                  padding: '6px 14px', 
                  borderRadius: '10px', 
                  fontSize: '11px', 
                  fontWeight: 700,
                  letterSpacing: '0.5px'
                }}>
                  {product.subCategoryId?.name || 'Sub-Category'}
                </div>
              </div>
              <h2 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '6px', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>{product.name}</h2>
              <div style={{ color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>
                SELLER: <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{product.sellerName || 'Your Store'}</span>
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: '13px', fontWeight: 500 }}>PRODUCT SKU: <span style={{ color: 'var(--text-main)' }}>{product.sku || 'N/A'}</span></div>
            </div>

            {/* Price & Commission Breakdown Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '14px', background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '4px' }}>SELLER PRICE (NET)</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-main)' }}>₹{sellerPrice}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Your Payout</div>
              </div>

              <div style={{ padding: '14px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700, marginBottom: '4px' }}>COMMISSION</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#f59e0b' }}>{commLabel}</div>
                <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '2px' }}>Platform Fee</div>
              </div>

              <div style={{ padding: '14px', background: 'rgba(34, 197, 94, 0.08)', borderRadius: '16px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 700, marginBottom: '4px' }}>CUSTOMER PRICE</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#22c55e' }}>₹{customerPrice}</div>
                <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '2px' }}>
                  Incl. GST: ₹{customerTotalWithGst.toFixed(2)}
                </div>
              </div>

              <div style={{ padding: '14px', background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '4px' }}>AVAILABLE STOCK</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: product.stock < 10 ? '#ef4444' : 'var(--text-main)' }}>
                  {product.stock} <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{product.unit || 'pcs'}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>MOQ: {product.moq || 1}</div>
              </div>
            </div>

            {/* B2B Size Variants Table if any */}
            {product.b2b && product.b2b.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '8px' }}>B2B SIZE VARIANTS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {product.b2b.map((v, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', fontSize: '13px' }}>
                      <span style={{ fontWeight: 600 }}>{v.packetSize}</span>
                      <span style={{ color: '#94a3b8' }}>Seller: ₹{v.sellerPrice !== undefined ? v.sellerPrice : v.price}</span>
                      <span style={{ color: '#ec4899', fontWeight: 700 }}>Customer: ₹{v.price}</span>
                      <span style={{ color: '#64748b' }}>Stock: {v.stock}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* B2B Tiered Pricing if any */}
            {product.priceTiers && product.priceTiers.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '8px' }}>B2B TIERED PRICING</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {product.priceTiers.map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', fontSize: '13px' }}>
                      <span style={{ fontWeight: 600 }}>Min Qty: {t.minQty}</span>
                      <span style={{ color: '#94a3b8' }}>Seller: ₹{t.sellerPrice !== undefined ? t.sellerPrice : t.price}</span>
                      <span style={{ color: '#ec4899', fontWeight: 700 }}>Customer: ₹{t.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.5px' }}>DESCRIPTION</div>
              <div style={{ 
                padding: '16px', 
                background: 'var(--glass-bg)', 
                borderRadius: '16px', 
                border: '1px solid var(--border-color)',
                fontSize: '13px', 
                color: 'var(--text-main)', 
                lineHeight: '1.6',
                maxHeight: '140px',
                overflowY: 'auto'
              }}>
                {product.description || 'No detailed description available for this product.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedSubCat, setSelectedSubCat] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deleteModalData, setDeleteModalData] = useState({ show: false, productId: null, productName: '' });
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/sellers/products');
      setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const openDeleteModal = (id, name) => {
    setDeleteModalData({ show: true, productId: id, productName: name });
  };

  const confirmDeleteProduct = async () => {
    try {
      await api.delete(`/products/${deleteModalData.productId}`);
      setProducts(products.filter(p => p._id !== deleteModalData.productId));
      setDeleteModalData({ show: false, productId: null, productName: '' });
    } catch (err) {
      alert('Failed to delete product');
    }
  };

  const selectedCategoryData = categories.find(c => String(c._id) === String(selectedCat));

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.categoryId?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const productCatId = p.categoryId?._id || p.categoryId;
    const productSubCatId = p.subCategoryId?._id || p.subCategoryId;

    const matchesCat = !selectedCat || String(productCatId) === String(selectedCat);
    const matchesSubCat = !selectedSubCat || String(productSubCatId) === String(selectedSubCat);

    return matchesSearch && matchesCat && matchesSubCat;
  });

  return (
    <Layout>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>Products</h1>
          <p style={{ color: 'var(--text-dim)' }}>Manage your wholesale selling prices, platform commissions, and customer pricing.</p>
        </div>
        <button 
          onClick={() => navigate('/products/add')}
          className="btn-primary" 
          style={{ padding: '12px 24px', width: 'auto' }}
        >
          <Plus size={20} />
          <span>Add New Product</span>
        </button>
      </div>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px', 
        marginBottom: '24px',
        background: 'rgba(255, 255, 255, 0.02)',
        padding: '24px',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text" 
              placeholder="Search products..." 
              className="input-field" 
              style={{ paddingLeft: '48px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '8px' }}>CATEGORY</label>
            <select 
              className="input-field" 
              style={{ height: '45px' }}
              value={selectedCat}
              onChange={(e) => {
                setSelectedCat(e.target.value);
                setSelectedSubCat('');
              }}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '8px' }}>SUB-CATEGORY</label>
            <select 
              className="input-field" 
              style={{ height: '45px' }}
              value={selectedSubCat}
              onChange={(e) => setSelectedSubCat(e.target.value)}
              disabled={!selectedCat}
            >
              <option value="">All Sub-Categories</option>
              {selectedCategoryData?.subCategories?.map(sub => (
                <option key={sub._id} value={sub._id}>{sub.name}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => { setSelectedCat(''); setSelectedSubCat(''); setSearchTerm(''); }}
            style={{ 
              marginTop: '25px',
              height: '45px',
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              color: '#ef4444',
              padding: '0 20px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              flex: 'none'
            }}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="glass-card desktop-only" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--glass-bg)' }}>
              <th style={{ padding: '18px 20px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700 }}>PRODUCT</th>
              <th style={{ padding: '18px 20px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700 }}>CATEGORY</th>
              <th style={{ padding: '18px 20px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700 }}>SELLER PRICE</th>
              <th style={{ padding: '18px 20px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700 }}>COMMISSION</th>
              <th style={{ padding: '18px 20px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700 }}>CUSTOMER PRICE</th>
              <th style={{ padding: '18px 20px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700 }}>STOCK</th>
              <th style={{ padding: '18px 20px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700 }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ padding: '40px', textAlign: 'center' }}>
                  <div className="animate-spin" style={{ display: 'inline-block' }}><Package size={24} /></div>
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  No products found. Start by adding one!
                </td>
              </tr>
            ) : filteredProducts.map((product) => {
              const sellerPrice = product.sellerB2bPrice !== undefined && product.sellerB2bPrice !== null
                ? product.sellerB2bPrice
                : (product.sellerPrice !== undefined && product.sellerPrice !== null
                    ? product.sellerPrice
                    : (product.b2b && product.b2b.length > 0 && product.b2b[0].sellerPrice !== undefined
                        ? product.b2b[0].sellerPrice
                        : (product.b2bPrice || product.price || 0)));

              const customerPrice = product.b2bPrice || (product.b2b && product.b2b.length > 0 ? product.b2b[0].price : product.price || 0);
              const displayGstRate = product.gstRate || product.gstPercent || 0;
              const customerPriceWithGst = customerPrice + (customerPrice * displayGstRate) / 100;

              const commType = product.commissionType || 'flat';
              const commVal = product.commissionValue !== undefined && product.commissionValue !== null ? product.commissionValue : 0;
              const commLabel = commType === 'flat' ? `₹${commVal}/unit` : `${commVal}%`;

              return (
                <tr key={product._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }} className="table-row-hover">
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <img 
                          src={getImageUrl(product.imageUrl)} 
                          alt="" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/48x48?text=No+Image'; }}
                        />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{product.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>SKU: {product.sku || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{product.categoryId?.name || product.category || 'N/A'}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{product.subCategoryId?.name || product.subCategory || ''}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0' }}>₹{sellerPrice}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Seller Payout</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ fontSize: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      {commLabel}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#22c55e' }}>₹{customerPrice}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      ₹{customerPriceWithGst.toFixed(2)} ({displayGstRate}% GST)
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                    <div style={{ color: (product.stockStatus === 'Out of Stock' || product.stock < 10) ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                      {product.stock} {product.unit || 'pcs'}
                    </div>
                    {product.stockStatus && (
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        display: 'inline-block',
                        marginTop: '4px',
                        background: product.stockStatus === 'Out of Stock' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                        color: product.stockStatus === 'Out of Stock' ? '#ef4444' : '#22c55e'
                      }}>
                        {product.stockStatus}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => setSelectedProduct(product)}
                        title="View Details"
                        style={{ padding: '8px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.05)', border: 'none', color: '#6366f1', cursor: 'pointer' }}
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => navigate(`/products/edit/${product._id}`)}
                        title="Edit Product"
                        style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => openDeleteModal(product._id, product.name)}
                        title="Delete Product"
                        style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div className="animate-spin" style={{ display: 'inline-block' }}><Package size={24} /></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            No products found.
          </div>
        ) : filteredProducts.map((product) => {
          const sellerPrice = product.sellerB2bPrice !== undefined && product.sellerB2bPrice !== null
            ? product.sellerB2bPrice
            : (product.sellerPrice !== undefined && product.sellerPrice !== null
                ? product.sellerPrice
                : (product.b2b && product.b2b.length > 0 && product.b2b[0].sellerPrice !== undefined
                    ? product.b2b[0].sellerPrice
                    : (product.b2bPrice || product.price || 0)));

          const customerPrice = product.b2bPrice || (product.b2b && product.b2b.length > 0 ? product.b2b[0].price : product.price || 0);
          const commType = product.commissionType || 'flat';
          const commVal = product.commissionValue !== undefined && product.commissionValue !== null ? product.commissionValue : 0;
          const commLabel = commType === 'flat' ? `₹${commVal}/unit` : `${commVal}%`;

          return (
            <div key={product._id} className="glass-card" style={{ padding: '16px', borderRadius: '20px', display: 'flex', gap: '16px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', flexShrink: 0 }}>
                <img 
                  src={getImageUrl(product.imageUrl)} 
                  alt="" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/80x80?text=No+Image'; }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '2px' }}>{product.name}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>{product.categoryId?.name}</div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Seller: <strong>₹{sellerPrice}</strong></span>
                  <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    {commLabel}
                  </span>
                  <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 800 }}>Customer: ₹{customerPrice}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', color: product.stock < 10 ? '#ef4444' : '#94a3b8' }}>{product.stock} units left</div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button onClick={() => setSelectedProduct(product)} style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', border: 'none', color: '#6366f1', fontSize: '12px', fontWeight: 600 }}>View</button>
                  <button onClick={() => navigate(`/products/edit/${product._id}`)} style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>Edit</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ProductDetailModal 
        product={selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
      />

      {/* Custom Delete Modal */}
      {deleteModalData.show && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px', width: '360px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#ef4444' }}>
              <Trash2 size={32} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-main)' }}>Delete Product</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '24px', lineHeight: '1.5' }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-main)' }}>{deleteModalData.productName}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeleteModalData({ show: false, productId: null, productName: '' })}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProduct}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#ef4444', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Products;
