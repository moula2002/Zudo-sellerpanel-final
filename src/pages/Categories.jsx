import React, { useState, useEffect } from 'react';
import api, { uploadApi, getImageUrl } from '../utils/api';
import { Layers, ChevronRight, Loader2, Plus, XCircle, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [formData, setFormData] = useState({ name: '', image: null });
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = () => {
    api.get('/categories').then(res => {
      setCategories(res.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await api.delete(`/categories/${id}`);
        fetchCategories();
      } catch (error) {
        console.error("Error deleting category", error);
        alert("Failed to delete category");
      }
    }
  };

  const handleDeleteSubCategory = async (categoryId, subId) => {
    if (window.confirm('Are you sure you want to delete this subcategory?')) {
      try {
        await api.delete(`/categories/sub/${subId}`); // Assume this is the endpoint
        fetchCategories();
      } catch (error) {
        console.error("Error deleting subcategory", error);
        alert("Failed to delete subcategory");
      }
    }
  };

  const handleImageChange = (e) => {
    setFormData({ ...formData, image: e.target.files[0] });
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let imageUrl = '';
      if (formData.image) {
        const fileData = new FormData();
        fileData.append('file', formData.image);
        const uploadRes = await uploadApi.post('/upload', fileData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        imageUrl = uploadRes.data.url;
      }
      await api.post('/categories', { name: formData.name, imageUrl });
      setShowAddCategory(false);
      setFormData({ name: '', image: null });
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert('Failed to add category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Categories Management</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setShowAddCategory(true)}>
              <Plus size={18} /> <span>Add Category</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {loading ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></div>
          ) : categories.map(cat => (
            <div key={cat._id} className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {cat.imageUrl ? (
                    <img src={getImageUrl(cat.imageUrl)} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/50x50?text=No+Image'; }} alt="" style={{ width: '50px', height: '50px', borderRadius: '12px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Layers size={24} color="var(--text-dim)" />
                    </div>
                  )}
                  <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{cat.name}</h3>
                </div>
                <button
                  onClick={() => handleDeleteCategory(cat._id)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Delete Category"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Subcategories</p>
                {cat.subCategories?.map(sub => (
                  <div key={sub._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {sub.imageUrl && <img src={getImageUrl(sub.imageUrl)} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/24x24?text=No+Image'; }} alt="" style={{ width: '24px', height: '24px', borderRadius: '6px', objectFit: 'cover' }} />}
                      <span style={{ fontSize: '14px' }}>{sub.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => handleDeleteSubCategory(cat._id, sub._id)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex' }}
                        title="Delete Subcategory"
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={14} style={{ color: 'var(--text-dim)' }} />
                    </div>
                  </div>
                ))}
                {(!cat.subCategories || cat.subCategories.length === 0) && (
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic' }}>No subcategories</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {showAddCategory && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '400px', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Add Category</h3>
                <button onClick={() => setShowAddCategory(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                  <XCircle size={20} />
                </button>
              </div>
              <div style={{ padding: '24px' }}>
                <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px' }}>Category Name</label>
                    <input type="text" className="input-field" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="Enter category name" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px' }}>Category Image</label>
                    <input type="file" className="input-field" onChange={handleImageChange} accept="image/*" />
                  </div>
                  <button type="submit" className="btn-primary" disabled={submitting} style={{ marginTop: '12px' }}>
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Save Category'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Categories;
