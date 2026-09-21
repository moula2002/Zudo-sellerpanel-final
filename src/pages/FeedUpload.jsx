import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { getImageUrl } from '../utils/api';
import Layout from '../components/Layout';
import {
  ImagePlus, Video, X, CheckCircle, AlertCircle,
  Trash2, Eye, Play, Loader2, Rss, Image as ImageIcon,
  FileText, Type, AlignLeft
} from 'lucide-react';

const FeedUpload = () => {
  const [activeTab, setActiveTab] = useState('images');
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  // Form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef(null);

  const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];

  useEffect(() => { fetchFeeds(); }, []);

  const fetchFeeds = async () => {
    setLoading(true);
    try {
      const res = await api.get('/feeds');
      setFeeds(res.data || []);
    } catch {
      setError('Could not load feed items.');
    } finally {
      setLoading(false);
    }
  };

  const acceptAttr = activeTab === 'images'
    ? 'image/jpeg,image/png,image/webp,image/gif'
    : 'video/mp4,video/webm,video/quicktime';

  const handleFileSelect = (file) => {
    const valid = activeTab === 'images' ? imageTypes.includes(file.type) : videoTypes.includes(file.type);
    if (!valid) {
      setError(`Only ${activeTab === 'images' ? 'image' : 'video'} files are allowed.`);
      return;
    }
    setSelectedFile(file);
    setError(null);
    setMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreviewSrc(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) { setError('Please select a file first.'); return; }

    setUploading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('type', activeTab === 'images' ? 'image' : 'video');
    formData.append('title', title.trim());
    formData.append('description', description.trim());

    try {
      await api.post('/feeds/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage('Feed item uploaded successfully!');
      setSelectedFile(null);
      setPreviewSrc(null);
      setTitle('');
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchFeeds();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this item from the feed?')) return;
    try {
      await api.delete(`/feeds/${id}`);
      setFeeds(prev => prev.filter(f => f._id !== id));
    } catch {
      setError('Failed to delete item.');
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewSrc(null);
    setTitle('');
    setDescription('');
    setError(null);
    setMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredFeeds = feeds.filter(f =>
    activeTab === 'images' ? (f.type === 'image' || !f.type) : f.type === 'video'
  );

  const tabStyle = (tab) => ({
    padding: '10px 24px',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.25s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: activeTab === tab ? 'var(--primary)' : 'var(--glass-bg)',
    color: activeTab === tab ? '#fff' : 'var(--text-dim)',
    boxShadow: activeTab === tab ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
  });

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    background: 'var(--glass-bg)',
    color: 'var(--text-main)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  };

  return (
    <Layout>
      <style>{`
        .feed-input:focus { border-color: var(--primary) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
        .feed-card {
          border-radius: 16px;
          overflow: hidden;
          background: var(--card-bg, var(--glass-bg));
          border: 1px solid var(--border-color);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .feed-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.18); }
        .feed-media-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: var(--glass-bg);
          cursor: pointer;
        }
        .feed-media-wrap img,
        .feed-media-wrap video { width: 100%; height: 100%; object-fit: cover; display: block; }
        .feed-media-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0);
          display: flex; align-items: center; justify-content: center; gap: 12px;
          transition: background 0.25s ease;
        }
        .feed-card:hover .feed-media-overlay { background: rgba(0,0,0,0.45); }
        .feed-media-overlay button {
          opacity: 0; transform: scale(0.8);
          transition: all 0.22s ease;
          width: 40px; height: 40px; border-radius: 50%;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .feed-card:hover .feed-media-overlay button { opacity: 1; transform: scale(1); }
        .video-badge {
          position: absolute; bottom: 8px; left: 8px;
          background: rgba(0,0,0,0.6); color: #fff;
          border-radius: 8px; padding: 3px 8px;
          font-size: 11px; display: flex; align-items: center; gap: 4px;
        }
        .drop-zone {
          border: 2px dashed var(--border-color); border-radius: 20px;
          padding: 40px 24px; text-align: center;
          background: var(--glass-bg); transition: all 0.25s ease; cursor: pointer;
        }
        .drop-zone.drag-active { border-color: var(--primary); background: rgba(99,102,241,0.06); }
        .modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.82); backdrop-filter: blur(8px);
          z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px;
        }
        .modal-content img, .modal-content video {
          max-width: 90vw; max-height: 85vh; border-radius: 16px; object-fit: contain; display: block;
        }
        .modal-close {
          position: fixed; top: 20px; right: 20px;
          width: 44px; height: 44px; border-radius: 50%;
          background: rgba(255,255,255,0.15); border: none; color: #fff;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .modal-close:hover { background: rgba(255,255,255,0.28); }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .animate-in { animation: fadeInUp 0.35s ease forwards; }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>

      {/* Preview Modal */}
      {previewItem && (
        <div className="modal-backdrop" onClick={() => setPreviewItem(null)}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw' }}>
            {previewItem.type === 'video'
              ? <video src={getImageUrl(previewItem.url)} controls autoPlay style={{ borderRadius: '16px', maxWidth: '90vw', maxHeight: '80vh' }} />
              : <img src={getImageUrl(previewItem.url)} alt={previewItem.title || 'Feed'} style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: '16px', objectFit: 'contain' }} />
            }
            {(previewItem.title || previewItem.description) && (
              <div style={{
                marginTop: '16px', padding: '16px 20px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)',
                color: '#fff', maxWidth: '600px', margin: '16px auto 0'
              }}>
                {previewItem.title && <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>{previewItem.title}</p>}
                {previewItem.description && <p style={{ fontSize: '14px', opacity: 0.8, lineHeight: 1.6 }}>{previewItem.description}</p>}
              </div>
            )}
          </div>
          <button className="modal-close" onClick={() => setPreviewItem(null)}><X size={20} /></button>
        </div>
      )}

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '14px' }} className="animate-in">
          <div style={{
            width: '52px', height: '52px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(99,102,241,0.3)'
          }}>
            <Rss size={26} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>Feed Upload</h1>
            <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginTop: '4px' }}>Upload promotional images & videos with title and description</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
          <button style={tabStyle('images')} onClick={() => { setActiveTab('images'); clearSelection(); }}>
            <ImageIcon size={16} /> Images
          </button>
          <button style={tabStyle('videos')} onClick={() => { setActiveTab('videos'); clearSelection(); }}>
            <Video size={16} /> Videos
          </button>
        </div>

        {/* Upload Card */}
        <div style={{
          background: 'var(--card-bg, var(--glass-bg))', border: '1px solid var(--border-color)',
          borderRadius: '24px', padding: '28px', marginBottom: '32px'
        }}>
          {/* Drop Zone */}
          {!selectedFile ? (
            <div
              className={`drop-zone${dragOver ? ' drag-active' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ marginBottom: '0' }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptAttr}
                style={{ display: 'none' }}
                onChange={e => e.target.files[0] && handleFileSelect(e.target.files[0])}
              />
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(99,102,241,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
              }}>
                {activeTab === 'images' ? <ImagePlus size={28} color="var(--primary)" /> : <Video size={28} color="var(--primary)" />}
              </div>
              <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-main)', marginBottom: '6px' }}>
                {dragOver ? 'Drop to select' : `Click or drag & drop a ${activeTab === 'images' ? 'image' : 'video'}`}
              </p>
              <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
                {activeTab === 'images' ? 'JPG, PNG, WEBP, GIF' : 'MP4, WEBM, MOV'}
              </p>
            </div>
          ) : (
            <div>
              {/* Selected file preview */}
              <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px', maxHeight: '280px', background: '#000' }}>
                {activeTab === 'videos'
                  ? <video src={previewSrc} style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', display: 'block' }} controls />
                  : <img src={previewSrc} alt="preview" style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', display: 'block', background: '#111' }} />
                }
                <button
                  onClick={clearSelection}
                  style={{
                    position: 'absolute', top: '10px', right: '10px',
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', border: 'none',
                    color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <X size={16} />
                </button>
                <div style={{
                  position: 'absolute', bottom: '10px', left: '10px',
                  background: 'rgba(0,0,0,0.6)', color: '#fff',
                  borderRadius: '8px', padding: '4px 10px', fontSize: '12px'
                }}>
                  {selectedFile.name}
                </div>
              </div>

              {/* Title */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-dim)', marginBottom: '8px' }}>
                  <Type size={14} /> Title
                </label>
                <input
                  type="text"
                  className="feed-input"
                  placeholder="e.g. Summer Sale 2026"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  style={inputStyle}
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-dim)', marginBottom: '8px' }}>
                  <AlignLeft size={14} /> Description
                </label>
                <textarea
                  className="feed-input"
                  placeholder="Describe this feed item…"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }}
                  maxLength={500}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', textAlign: 'right' }}>
                  {description.length}/500
                </p>
              </div>

              {/* Upload button */}
              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  width: '100%', padding: '14px',
                  borderRadius: '14px', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer',
                  background: uploading ? 'rgba(99,102,241,0.5)' : 'var(--primary)',
                  color: '#fff', fontWeight: '700', fontSize: '15px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(99,102,241,0.35)'
                }}
              >
                {uploading
                  ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…</>
                  : <><FileText size={18} /> Publish to Feed</>
                }
              </button>
            </div>
          )}

          {/* Feedback */}
          {message && (
            <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
              <CheckCircle size={16} /> {message}
            </div>
          )}
          {error && (
            <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>

        {/* Gallery */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
            {activeTab === 'images' ? 'Uploaded Images' : 'Uploaded Videos'}
            {!loading && <span style={{ marginLeft: '10px', fontSize: '13px', fontWeight: 500, color: 'var(--text-dim)' }}>({filteredFeeds.length})</span>}
          </h2>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
            <p>Loading feed…</p>
          </div>
        ) : filteredFeeds.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            border: '1px solid var(--border-color)', borderRadius: '20px',
            background: 'var(--glass-bg)', color: 'var(--text-dim)'
          }}>
            {activeTab === 'images'
              ? <ImageIcon size={40} style={{ marginBottom: '14px', opacity: 0.4 }} />
              : <Video size={40} style={{ marginBottom: '14px', opacity: 0.4 }} />}
            <p style={{ fontWeight: '600' }}>No {activeTab} yet</p>
            <p style={{ fontSize: '13px', marginTop: '6px' }}>Upload your first {activeTab === 'images' ? 'image' : 'video'} above</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {filteredFeeds.map((item, i) => (
              <div key={item._id || i} className="feed-card animate-in" style={{ animationDelay: `${i * 40}ms` }}>
                {/* Media */}
                <div className="feed-media-wrap" onClick={() => setPreviewItem(item)}>
                  {item.type === 'video'
                    ? <video src={getImageUrl(item.url)} muted playsInline preload="metadata" />
                    : <img src={getImageUrl(item.url)} alt={item.title || `Feed ${i + 1}`} loading="lazy" />
                  }
                  {item.type === 'video' && (
                    <div className="video-badge"><Play size={10} /> Video</div>
                  )}
                  <div className="feed-media-overlay">
                    <button style={{ background: 'rgba(255,255,255,0.95)', color: '#1e293b' }} title="Preview">
                      <Eye size={16} />
                    </button>
                    <button
                      style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}
                      onClick={e => { e.stopPropagation(); handleDelete(item._id); }}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Title & Description */}
                <div style={{ padding: '14px 16px 16px' }}>
                  {item.title ? (
                    <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </p>
                  ) : (
                    <p style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: '4px' }}>No title</p>
                  )}
                  {item.description ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description}
                    </p>
                  ) : null}
                  <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px', opacity: 0.6 }}>
                    {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FeedUpload;
