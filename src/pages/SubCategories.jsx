import React, { useState, useEffect } from 'react';
import api, { uploadApi, getImageUrl } from '../utils/api';
import { Layers, Loader2, Plus, XCircle, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';

const SubCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSubCategory, setShowAddSubCategory] = useState(false);
  const [formData, setFormData] = useState({ name: '', image: null, categoryId: '' });
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

  const handleDeleteSubCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this subcategory?')) {
      try {
        await api.delete(`/categories/sub/${id}`);
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

  const handleAddSubCategory = async (e) => {
    e.preventDefault();
    if (!formData.categoryId) {
      alert('Please select a parent category');
      return;
    }
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
      await api.post('/categories/sub', { name: formData.name, imageUrl, categoryId: formData.categoryId });
      setShowAddSubCategory(false);
      setFormData({ name: '', image: null, categoryId: '' });
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert('Failed to add subcategory');
    } finally {
      setSubmitting(false);
    }
  };

  // Flatten subcategories
  const subCategories = [];
  categories.forEach(cat => {
    if (cat.subCategories) {
      cat.subCategories.forEach(sub => {
        subCategories.push({ ...sub, parentCategoryName: cat.name });
      });
    }
  });

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>SubCategories Management</h2>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setShowAddSubCategory(true)}>
            <Plus size={18} /> <span>Add SubCategory</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {loading ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></div>
          ) : subCategories.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px', color: 'var(--text-dim)' }}>No subcategories found.</div>
          ) : subCategories.map(sub => (
            <div key={sub._id} className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                  {sub.imageUrl ? (
                    <img src={getImageUrl(sub.imageUrl)} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/50x50?text=No+Image'; }} alt="" style={{ width: '50px', height: '50px', borderRadius: '12px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Layers size={24} color="var(--text-dim)" />
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{sub.name}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>Parent: <span style={{ color: 'var(--text-main)' }}>{sub.parentCategoryName}</span></p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteSubCategory(sub._id)}
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
                  title="Delete Subcategory"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {showAddSubCategory && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '400px', borderRadius: '32px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
              <div style={{ padding: '32px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Add SubCategory</h3>
                <button onClick={() => setShowAddSubCategory(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                  <XCircle size={24} />
                </button>
              </div>
              <div style={{ padding: '32px' }}>
                <form onSubmit={handleAddSubCategory} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px' }}>Parent Category</label>
                    <select className="input-field" value={formData.categoryId} onChange={(e) => setFormData({...formData, categoryId: e.target.value})} required>
                      <option value="">Select a category</option>
                      {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px' }}>SubCategory Name</label>
                    <input type="text" className="input-field" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="Enter subcategory name" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px' }}>SubCategory Image (Optional)</label>
                    <input type="file" className="input-field" onChange={handleImageChange} accept="image/*" />
                  </div>
                  <button type="submit" className="btn-primary" disabled={submitting} style={{ marginTop: '12px' }}>
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Save SubCategory'}
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

export default SubCategories;
