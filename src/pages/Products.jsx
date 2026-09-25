import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { IMAGE_BASE_URL, getImageUrl } from '../utils/api';
import { Package, Plus, Search, Filter, MoreVertical, Edit2, Trash2, Eye, X } from 'lucide-react';
import Layout from '../components/Layout';

const ProductDetailModal = ({ product, onClose }) => {
  if (!product) return null;

  const gstRate = product.gstRate || product.gstPercent || 0;
  const retailPriceBase = product.price || (product.b2c && product.b2c.length > 0 ? product.b2c[0].price : 0);
  const b2bPriceBase = product.b2bPrice || (product.b2b && product.b2b.length > 0 ? product.b2b[0].price : 0);
  const regularTotal = retailPriceBase + (retailPriceBase * gstRate) / 100;
  const b2bTotal = b2bPriceBase + (b2bPriceBase * gstRate) / 100;

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
        maxWidth: '850px',
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
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
              <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '6px', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>{product.name}</h2>
              <div style={{ color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>
                SELLER: <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{product.sellerName || 'Your Store'}</span>
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: '13px', fontWeight: 500 }}>PRODUCT SKU: <span style={{ color: 'var(--text-main)' }}>{product.sku || 'N/A'}</span></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'var(--glass-bg)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '6px', letterSpacing: '0.5px' }}>RETAIL PRICE (BASE)</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-main)' }}>₹{retailPriceBase}</div>
                <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600, marginTop: '2px' }}>
                  Incl. {gstRate}% GST: ₹{regularTotal.toFixed(2)}
                </div>
              </div>
              <div style={{ padding: '16px', background: 'var(--glass-bg)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '6px', letterSpacing: '0.5px' }}>B2B PRICE (BASE)</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-main)' }}>₹{b2bPriceBase}</div>
                <div style={{ fontSize: '11px', color: '#ec4899', fontWeight: 600, marginTop: '2px' }}>
                  Incl. {gstRate}% GST: ₹{b2bTotal.toFixed(2)}
                </div>
              </div>
              <div style={{ padding: '16px', background: 'var(--glass-bg)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '6px', letterSpacing: '0.5px' }}>AVAILABLE STOCK</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: product.stock < 10 ? '#ef4444' : 'var(--text-main)' }}>
                  {product.stock} <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>UNITS</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500, marginTop: '2px' }}>
                  MOQ: {product.moq || 1} {product.unit || 'pcs'}
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.5px' }}>DESCRIPTION</div>
              <div style={{ 
                padding: '20px', 
                background: 'var(--glass-bg)', 
                borderRadius: '20px', 
                border: '1px solid var(--border-color)',
                fontSize: '14px', 
                color: 'var(--text-main)', 
                lineHeight: '1.7',
                maxHeight: '180px',
                overflowY: 'auto'
              }}>
                {product.description || 'No detailed description available for this product.'}
              </div>
            </div>

            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '12px' }}>SPECIFICATIONS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{key}</div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
          <p style={{ color: 'var(--text-dim)' }}>Manage your product inventory and pricing.</p>
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
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>PRODUCT</th>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>CATEGORY</th>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>B2C PRICE (BASE)</th>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>STOCK</th>
              <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center' }}>
                  <div className="animate-spin" style={{ display: 'inline-block' }}><Package size={24} /></div>
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  No products found. Start by adding one!
                </td>
              </tr>
            ) : filteredProducts.map((product) => {
              const displayPrice = product.price || (product.b2c && product.b2c.length > 0 ? product.b2c[0].price : 0);
              const displayGstRate = product.gstRate || product.gstPercent || 0;
              const displayPriceWithGst = displayPrice + (displayPrice * displayGstRate) / 100;
              return (
                <tr key={product._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }} className="table-row-hover">
                  <td style={{ padding: '16px 24px' }}>
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
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>{product.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>SKU: {product.sku || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{product.categoryId?.name || product.category || 'N/A'}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{product.subCategoryId?.name || product.subCategory || ''}</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>₹{displayPrice}</div>
                    <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>
                      ₹{displayPriceWithGst.toFixed(2)} ({displayGstRate}% GST)
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px' }}>
                    <span style={{ color: product.stock < 10 ? '#ef4444' : '#22c55e', fontWeight: 500 }}>
                      {product.stock} {product.unit || 'pcs'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
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
          const displayPrice = product.price || (product.b2c && product.b2c.length > 0 ? product.b2c[0].price : 0);
          const displayGstRate = product.gstRate || product.gstPercent || 0;
          const displayPriceWithGst = displayPrice + (displayPrice * displayGstRate) / 100;
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
                <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>{product.name}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>{product.categoryId?.name}</div>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>₹{displayPrice}</span>
                  <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600, marginLeft: '8px' }}>
                    ₹{displayPriceWithGst.toFixed(2)} ({displayGstRate}%)
                  </span>
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
