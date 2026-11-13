import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { uploadApi } from '../utils/api';
import { calculateCustomerPrice, calculateB2bPricing } from '../utils/pricing';
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

  // Shared Custom Packaging & Measurement Unit Management
  const [packagingOptions, setPackagingOptions] = useState(['BAG', 'BOX']);
  const [measurementOptions, setMeasurementOptions] = useState(['KG', 'LITRE']);

  // Modals for adding custom units
  const [showAddPackagingModal, setShowAddPackagingModal] = useState(false);
  const [addPackagingInput, setAddPackagingInput] = useState('');
  const [addPackagingError, setAddPackagingError] = useState('');

  const [showAddMeasurementModal, setShowAddMeasurementModal] = useState(false);
  const [addMeasurementInput, setAddMeasurementInput] = useState('');
  const [addMeasurementError, setAddMeasurementError] = useState('');

  // Target variant index when adding custom option from variant dropdown
  const [activeVariantAddIndex, setActiveVariantAddIndex] = useState(null);

  // Manage Custom Units Modal
  const [showManageUnitsModal, setShowManageUnitsModal] = useState(false);
  const [manageModalTab, setManageModalTab] = useState('packaging'); // 'packaging' | 'measurement'
  const [unitDeleteLoading, setUnitDeleteLoading] = useState(false);
  const [unitDeleteFeedback, setUnitDeleteFeedback] = useState({ type: '', text: '' });

  const DEFAULT_PACKAGING = ['BAG', 'BOX'];
  const DEFAULT_MEASUREMENTS = ['KG', 'LITRE'];

  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    subCategoryId: '',
    sellerB2bPrice: '',
    b2bPrice: '',
    priceBasis: 'per_unit',
    commissionType: 'flat',
    commissionValue: 0,
    gstPercent: 0,
    moq: 1,
    unit: 'BAG',
    packagingType: 'BAG',
    measurementUnit: 'KG',
    measurementBasis: 'KG',
    unitSize: 1,
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
        const [cats, sells, customRes] = await Promise.all([
          api.get('/categories').catch(() => ({ data: [] })),
          api.get('/sellers').catch(() => ({ data: [] })),
          api.get('/products/custom-units').catch(() => ({ data: { mainUnits: [], variantUnits: [] } }))
        ]);
        setCategories(cats.data || []);
        setSellers(sells.data || []);

        const pkgList = customRes.data?.packagingUnits || customRes.data?.mainUnits || [];
        if (Array.isArray(pkgList)) {
          const filteredUnits = pkgList
            .map(u => String(u || '').trim().toUpperCase())
            .filter(u => u && !DEFAULT_PACKAGING.includes(u) && u !== 'KG' && u !== 'LITRE' && u !== 'LTR');
          setPackagingOptions(Array.from(new Set([...DEFAULT_PACKAGING, ...filteredUnits])).filter(u => u !== 'KG' && u !== 'LITRE' && u !== 'LTR'));
        }

        const measList = customRes.data?.measurementUnits || customRes.data?.variantUnits || [];
        if (Array.isArray(measList)) {
          const filteredMeas = measList
            .map(u => String(u || '').trim().toUpperCase())
            .filter(u => u && !DEFAULT_MEASUREMENTS.includes(u) && u !== 'BAG' && u !== 'BOX');
          setMeasurementOptions(Array.from(new Set([...DEFAULT_MEASUREMENTS, ...filteredMeas])).filter(u => u !== 'BAG' && u !== 'BOX'));
        }
        
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
    { 
      packetSizeVal: '', 
      packetSizeUnit: formData.measurementUnit || 'KG',
      packagingType: formData.unit || 'BAG',
      priceBasis: 'per_unit',
      sellerPrice: '', 
      price: '', 
      gstPercent: formData.gstPercent || 0,
      stock: '' 
    }
  ]);
  const handleRemoveB2b = (index) => setB2bVariants(b2bVariants.filter((_, i) => i !== index));
  const handleB2bChange = (index, field, value) => {
    if (field === 'packagingType' && value === '__ADD_CUSTOM__') {
      setActiveVariantAddIndex(index);
      setAddPackagingInput('');
      setAddPackagingError('');
      setShowAddPackagingModal(true);
      return;
    }
    if (field === 'packagingType' && value === '__MANAGE_CUSTOM__') {
      setManageModalTab('packaging');
      setShowManageUnitsModal(true);
      return;
    }
    if (field === 'packetSizeUnit' && value === '__ADD_CUSTOM__') {
      setActiveVariantAddIndex(index);
      setAddMeasurementInput('');
      setAddMeasurementError('');
      setShowAddMeasurementModal(true);
      return;
    }
    if (field === 'packetSizeUnit' && value === '__MANAGE_CUSTOM__') {
      setManageModalTab('measurement');
      setShowManageUnitsModal(true);
      return;
    }
    const newArr = [...b2bVariants];
    newArr[index][field] = value;
    setB2bVariants(newArr);
  };

  // Add Custom Packaging Type (Shared across Main B2B & Variants)
  const handleAddCustomPackaging = async () => {
    const clean = (addPackagingInput || '').trim().toUpperCase();
    if (!clean) {
      setAddPackagingError('Packaging name cannot be empty');
      return;
    }
    if (packagingOptions.includes(clean)) {
      setAddPackagingError(`Packaging type "${clean}" already exists`);
      return;
    }

    try {
      await api.post('/products/custom-units', { unit: clean, type: 'packaging' });
    } catch (e) {
      console.warn('Backend custom unit sync (packaging):', e.response?.data?.message || e.message);
    }

    setPackagingOptions(prev => Array.from(new Set([...prev, clean])));
    
    // If triggered from variant row, set it for that variant; otherwise for main form
    if (activeVariantAddIndex !== null && b2bVariants[activeVariantAddIndex]) {
      const newVariants = [...b2bVariants];
      newVariants[activeVariantAddIndex].packagingType = clean;
      setB2bVariants(newVariants);
      setActiveVariantAddIndex(null);
    } else {
      setFormData(prev => ({ ...prev, unit: clean, packagingType: clean }));
    }

    setAddPackagingInput('');
    setAddPackagingError('');
    setShowAddPackagingModal(false);
  };

  // Add Custom Measurement Unit (Shared across Main B2B & Variants)
  const handleAddCustomMeasurement = async () => {
    const clean = (addMeasurementInput || '').trim().toUpperCase();
    if (!clean) {
      setAddMeasurementError('Measurement unit cannot be empty');
      return;
    }
    if (measurementOptions.some(m => m.toUpperCase() === clean)) {
      setAddMeasurementError(`Measurement unit "${clean}" already exists`);
      return;
    }

    try {
      await api.post('/products/custom-units', { unit: clean, type: 'measurement' });
    } catch (e) {
      console.warn('Backend custom unit sync (measurement):', e.response?.data?.message || e.message);
    }

    setMeasurementOptions(prev => Array.from(new Set([...prev, clean])));

    // If triggered from variant row, set it for that variant; otherwise for main form
    if (activeVariantAddIndex !== null && b2bVariants[activeVariantAddIndex]) {
      const newVariants = [...b2bVariants];
      newVariants[activeVariantAddIndex].packetSizeUnit = clean;
      setB2bVariants(newVariants);
      setActiveVariantAddIndex(null);
    } else {
      setFormData(prev => ({ ...prev, measurementUnit: clean, measurementBasis: clean }));
    }

    setAddMeasurementInput('');
    setAddMeasurementError('');
    setShowAddMeasurementModal(false);
  };

  // Delete Custom Packaging Type
  const handleDeletePackaging = async (unitToDelete) => {
    const clean = String(unitToDelete || '').trim().toUpperCase();
    if (DEFAULT_PACKAGING.includes(clean)) {
      alert(`Permanent default packaging (${clean}) cannot be deleted.`);
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to delete custom packaging type "${clean}"?`);
    if (!confirmed) return;

    setUnitDeleteLoading(true);
    setUnitDeleteFeedback({ type: '', text: '' });

    try {
      const res = await api.delete('/products/custom-units', {
        data: { unit: clean, type: 'packaging' }
      });

      setPackagingOptions(prev => prev.filter(u => u !== clean));

      // Reset main form selection if deleted
      if (formData.unit === clean || formData.packagingType === clean) {
        setFormData(prev => ({ ...prev, unit: 'BAG', packagingType: 'BAG' }));
      }

      // Reset any variant rows using this packaging
      setB2bVariants(prev => prev.map(v => ({
        ...v,
        packagingType: v.packagingType === clean ? 'BAG' : v.packagingType
      })));

      setUnitDeleteFeedback({
        type: 'success',
        text: res.data?.message || `Packaging "${clean}" deleted successfully.`
      });
      setTimeout(() => setUnitDeleteFeedback({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Failed to delete packaging unit:', err);
      const msg = err.response?.data?.message || `Failed to delete packaging "${clean}".`;
      setUnitDeleteFeedback({ type: 'error', text: msg });
      alert(msg);
    } finally {
      setUnitDeleteLoading(false);
    }
  };

  // Delete Custom Measurement Unit
  const handleDeleteMeasurement = async (unitToDelete) => {
    const clean = String(unitToDelete || '').trim().toUpperCase();
    if (DEFAULT_MEASUREMENTS.includes(clean)) {
      alert(`Permanent default measurement (${clean}) cannot be deleted.`);
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to delete custom measurement unit "${clean}"?`);
    if (!confirmed) return;

    setUnitDeleteLoading(true);
    setUnitDeleteFeedback({ type: '', text: '' });

    try {
      const res = await api.delete('/products/custom-units', {
        data: { unit: clean, type: 'measurement' }
      });

      setMeasurementOptions(prev => prev.filter(u => u.toUpperCase() !== clean));

      // Reset main form selection if deleted
      if ((formData.measurementUnit || '').toUpperCase() === clean) {
        setFormData(prev => ({ ...prev, measurementUnit: 'KG', measurementBasis: 'KG' }));
      }

      // Reset any variant rows using this measurement
      setB2bVariants(prev => prev.map(v => ({
        ...v,
        packetSizeUnit: (v.packetSizeUnit || '').toUpperCase() === clean ? 'KG' : v.packetSizeUnit
      })));

      setUnitDeleteFeedback({
        type: 'success',
        text: res.data?.message || `Measurement "${clean}" deleted successfully.`
      });
      setTimeout(() => setUnitDeleteFeedback({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Failed to delete measurement unit:', err);
      const msg = err.response?.data?.message || `Failed to delete measurement unit "${clean}".`;
      setUnitDeleteFeedback({ type: 'error', text: msg });
      alert(msg);
    } finally {
      setUnitDeleteLoading(false);
    }
  };

  // Live calculation of Customer Wholesale Prices using standard B2B pricing utility
  const sellerB2bVal = parseFloat(formData.sellerB2bPrice) || 0;
  const unitSizeNum = parseFloat(formData.unitSize) || 1;
  const gstNum = parseFloat(formData.gstPercent) || 0;
  const b2bPricing = calculateB2bPricing({
    basePrice: sellerB2bVal,
    unitSize: unitSizeNum,
    gstRate: gstNum,
    quantity: 1
  });
  const b2bCalculation = calculateCustomerPrice(sellerB2bVal, 'flat', 0);

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
      data.append('unit', (formData.unit || 'BAG').trim().toUpperCase());
      data.append('packagingType', (formData.packagingType || formData.unit || 'BAG').trim().toUpperCase());
      data.append('measurementBasis', (formData.measurementBasis || formData.measurementUnit || 'KG').trim().toUpperCase());
      data.append('measurementUnit', (formData.measurementBasis || formData.measurementUnit || 'KG').trim().toUpperCase());
      data.append('priceBasis', 'per_unit');
      data.append('isPackagePrice', false);
      const customUnitsToSave = Array.from(new Set(
        packagingOptions
          .filter(u => !DEFAULT_PACKAGING.includes(u) && u !== 'KG' && u !== 'LITRE' && u !== 'LTR')
          .concat(formData.unit && !DEFAULT_PACKAGING.includes(formData.unit) && formData.unit !== 'KG' && formData.unit !== 'LITRE' ? [formData.unit] : [])
      ));
      data.append('customUnits', JSON.stringify(customUnitsToSave));
      data.append('customPackagingUnits', JSON.stringify(customUnitsToSave));

      const customMeasToSave = Array.from(new Set(
        measurementOptions
          .filter(u => !DEFAULT_MEASUREMENTS.includes(u.toUpperCase()) && u.toUpperCase() !== 'BAG' && u.toUpperCase() !== 'BOX')
          .map(u => u.toUpperCase())
      ));
      data.append('customMeasurementUnits', JSON.stringify(customMeasToSave));
      data.append('unitSize', parseFloat(formData.unitSize) || 1);
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
          const rawPrice = parseFloat(v.sellerPrice || v.price) || 0;
          const uSize = parseFloat(v.packetSizeVal || v.unitSize) || 1;
          const mUnit = (v.packetSizeUnit || v.measurementBasis || formData.measurementBasis || formData.measurementUnit || 'KG').toUpperCase();
          const pType = (v.packagingType || formData.packagingType || formData.unit || 'BAG').toUpperCase();
          const pkgPrice = rawPrice; // Seller Base Price is NOT multiplied by uSize
          const basePrice = rawPrice;
          return {
            packetSize: `${v.packetSizeVal}${v.packetSizeUnit}`,
            sizeValue: uSize,
            unitSize: uSize,
            measurementUnit: mUnit,
            measurementBasis: mUnit,
            packagingType: pType,
            priceBasis: 'per_unit',
            isPackagePrice: false,
            sellerPrice: pkgPrice,
            sellerPricePerProductUnit: pkgPrice,
            sellerPricePerBaseUnit: basePrice,
            price: pkgPrice,
            stock: parseInt(v.stock) || 0,
            gstPercent: v.gstPercent !== undefined && v.gstPercent !== '' ? parseFloat(v.gstPercent) : gstNum
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
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setManageModalTab('packaging');
                    setShowManageUnitsModal(true);
                  }}
                  style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    color: 'var(--primary, #6366f1)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={13} /> Manage Custom Packaging
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManageModalTab('measurement');
                    setShowManageUnitsModal(true);
                  }}
                  style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    color: '#22c55e',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={13} /> Manage Custom Measurements
                </button>
              </div>
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
                  placeholder="e.g. 50 (per base unit)" 
                />
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                  Price per 1 {(formData.measurementUnit || 'kg').toUpperCase()}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 600 }}>
                  Packaging / Unit Type *
                </label>
                <select 
                  name="unit" 
                  className="input-field" 
                  value={formData.unit} 
                  onChange={(e) => {
                    if (e.target.value === '__ADD_CUSTOM__') {
                      setActiveVariantAddIndex(null);
                      setAddPackagingInput('');
                      setAddPackagingError('');
                      setShowAddPackagingModal(true);
                    } else if (e.target.value === '__MANAGE_CUSTOM__') {
                      setManageModalTab('packaging');
                      setShowManageUnitsModal(true);
                    } else {
                      const val = e.target.value;
                      setFormData(prev => ({ ...prev, unit: val, packagingType: val }));
                    }
                  }} 
                  required
                  style={{ height: '48px', cursor: 'pointer' }}
                >
                  {packagingOptions.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                  <option value="__ADD_CUSTOM__" style={{ fontWeight: 700, color: 'var(--primary, #6366f1)' }}>
                    + Custom Packaging
                  </option>
                  <option value="__MANAGE_CUSTOM__" style={{ fontWeight: 600, color: '#ef4444' }}>
                    ⚙ Manage / Delete Packaging...
                  </option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 600 }}>
                  Measurement Basis * <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>(e.g. KG or LITRE)</span>
                </label>
                <select 
                  name="measurementUnit" 
                  className="input-field" 
                  value={formData.measurementUnit || 'KG'} 
                  onChange={(e) => {
                    if (e.target.value === '__ADD_CUSTOM__') {
                      setActiveVariantAddIndex(null);
                      setAddMeasurementInput('');
                      setAddMeasurementError('');
                      setShowAddMeasurementModal(true);
                    } else if (e.target.value === '__MANAGE_CUSTOM__') {
                      setManageModalTab('measurement');
                      setShowManageUnitsModal(true);
                    } else {
                      const val = e.target.value;
                      setFormData(prev => ({ ...prev, measurementUnit: val, measurementBasis: val.toUpperCase() }));
                    }
                  }} 
                  required
                  style={{ height: '48px', cursor: 'pointer' }}
                >
                  {measurementOptions.map(m => (
                    <option key={m} value={m}>{m.toUpperCase()}</option>
                  ))}
                  <option value="__ADD_CUSTOM__" style={{ fontWeight: 700, color: '#22c55e' }}>
                    + Custom Measurement
                  </option>
                  <option value="__MANAGE_CUSTOM__" style={{ fontWeight: 600, color: '#ef4444' }}>
                    ⚙ Manage / Delete Measurements...
                  </option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 600 }}>
                  Unit Size * <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>(e.g. 30 for 30 {(formData.measurementUnit || 'KG').toUpperCase()} per {formData.unit})</span>
                </label>
                <input 
                  type="number" 
                  name="unitSize" 
                  className="input-field" 
                  value={formData.unitSize} 
                  onChange={handleInputChange} 
                  required 
                  min="0.01" 
                  step="any" 
                  placeholder="e.g. 30"
                />
              </div>

              {/* Package Measurement & Seller Price Calculation Banner */}
              <div style={{
                gridColumn: '1 / -1',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                padding: '12px 16px',
                borderRadius: '10px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Package Specification</span>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                    1 {(formData.unit || 'BAG').toUpperCase()} = {formData.unitSize || 1} {(formData.measurementUnit || 'KG').toUpperCase()}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Seller Payout / Package</span>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#22c55e' }}>
                    ₹{Number(formData.sellerB2bPrice || 0).toFixed(2)} / {(formData.unit || 'BAG').toUpperCase()}
                  </div>
                </div>
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
                  Maximum order quantity *
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
                    const vUnitSize = parseFloat(variant.packetSizeVal) || 1;
                    const vPkgType = (variant.packagingType || formData.unit || 'BAG').toUpperCase();
                    const vMeas = (variant.packetSizeUnit || formData.measurementUnit || 'kg').toUpperCase();
                    const vPkgPrice = vSellerPrice * vUnitSize;
                    const vGstRate = variant.gstPercent !== undefined && variant.gstPercent !== '' ? parseFloat(variant.gstPercent) : gstNum;
                    const vTotalWithGst = vPkgPrice > 0 ? (vPkgPrice + (vPkgPrice * vGstRate) / 100) : 0;

                    return (
                      <div key={index} style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1.2, minWidth: '100px' }}>
                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-main)', marginBottom: '4px', fontWeight: 600 }}>Packaging Type *</label>
                            <select 
                              className="input-field" 
                              value={variant.packagingType || formData.unit || 'BAG'} 
                              onChange={(e) => handleB2bChange(index, 'packagingType', e.target.value)}
                              required
                              style={{ height: '45px', cursor: 'pointer' }}
                            >
                              {packagingOptions.map(u => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                              <option value="__ADD_CUSTOM__" style={{ fontWeight: 700, color: 'var(--primary, #6366f1)' }}>
                                + Custom Packaging
                              </option>
                              <option value="__MANAGE_CUSTOM__" style={{ fontWeight: 600, color: '#ef4444' }}>
                                ⚙ Manage / Delete Packaging...
                              </option>
                            </select>
                          </div>

                          <div style={{ flex: 1, minWidth: '90px' }}>
                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-main)', marginBottom: '4px', fontWeight: 600 }}>Unit Size *</label>
                            <input 
                              type="number" 
                              className="input-field" 
                              value={variant.packetSizeVal} 
                              onChange={(e) => handleB2bChange(index, 'packetSizeVal', e.target.value)} 
                              placeholder="e.g. 10" 
                              required 
                              min="0.01" 
                              step="any" 
                            />
                          </div>

                          <div style={{ flex: 1.1, minWidth: '100px' }}>
                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-main)', marginBottom: '4px', fontWeight: 600 }}>Measurement *</label>
                            <select 
                              className="input-field" 
                              value={variant.packetSizeUnit} 
                              onChange={(e) => handleB2bChange(index, 'packetSizeUnit', e.target.value)} 
                              required
                              style={{ height: '45px', cursor: 'pointer' }}
                            >
                              {measurementOptions.map(m => (
                                <option key={m} value={m}>{m.toUpperCase()}</option>
                              ))}
                              <option value="__ADD_CUSTOM__" style={{ fontWeight: 700, color: '#22c55e' }}>
                                + Custom Measurement
                              </option>
                              <option value="__MANAGE_CUSTOM__" style={{ fontWeight: 600, color: '#ef4444' }}>
                                ⚙ Manage / Delete Measurements...
                              </option>
                            </select>
                          </div>

                          <div style={{ flex: 1.2, minWidth: '110px' }}>
                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-main)', marginBottom: '4px', fontWeight: 600 }}>Price (₹) *</label>
                            <input 
                              type="number" 
                              className="input-field" 
                              value={variant.sellerPrice} 
                              onChange={(e) => handleB2bChange(index, 'sellerPrice', e.target.value)} 
                              placeholder="Price" 
                              min="0" 
                              step="0.01" 
                              required 
                            />
                            <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
                              per {vMeas}
                            </span>
                          </div>

                          <div style={{ flex: 0.8, minWidth: '80px' }}>
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

                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ display: 'block', fontSize: '11px', opacity: 0, marginBottom: '4px', pointerEvents: 'none', userSelect: 'none' }}>Action</label>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveB2b(index)} 
                              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Remove Variant"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Variant Specification & Pricing Summary */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99, 102, 241, 0.05)', padding: '8px 12px', borderRadius: '8px', fontSize: '11.5px', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            1 {vPkgType} = {vUnitSize} {vMeas}
                          </span>
                          <span style={{ color: '#22c55e', fontWeight: 700 }}>
                            Payout / {vPkgType}: ₹{vSellerPrice.toFixed(2)}
                          </span>
                        </div>
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

        {/* Modal: Add Custom Packaging Type */}
        {showAddPackagingModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px'
          }}>
            <div className="glass-card" style={{
              maxWidth: '400px',
              width: '100%',
              borderRadius: '20px',
              padding: '28px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-dark, #0f172a)'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                Add Custom Packaging Type
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
                Enter custom packaging type (e.g. CARTON, DRUM, TRAY, CANISTER). Available across all packaging fields.
              </p>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. CARTON"
                value={addPackagingInput}
                onChange={(e) => {
                  setAddPackagingInput(e.target.value.toUpperCase());
                  setAddPackagingError('');
                }}
                autoFocus
                style={{ height: '48px', textTransform: 'uppercase', marginBottom: '8px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomPackaging();
                  }
                }}
              />
              {addPackagingError && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '12px', fontWeight: 500 }}>
                  {addPackagingError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPackagingModal(false);
                    setActiveVariantAddIndex(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomPackaging}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    background: 'var(--primary, #6366f1)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Add Packaging
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Custom Measurement Unit */}
        {showAddMeasurementModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px'
          }}>
            <div className="glass-card" style={{
              maxWidth: '400px',
              width: '100%',
              borderRadius: '20px',
              padding: '28px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-dark, #0f172a)'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                Add Custom Measurement Unit
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
                Enter custom measurement unit (e.g. MTR, SQFT, DOZEN, ROLL, BUNDLE). Available across all measurement fields.
              </p>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. MTR"
                value={addMeasurementInput}
                onChange={(e) => {
                  setAddMeasurementInput(e.target.value.toUpperCase());
                  setAddMeasurementError('');
                }}
                autoFocus
                style={{ height: '48px', textTransform: 'uppercase', marginBottom: '8px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomMeasurement();
                  }
                }}
              />
              {addMeasurementError && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '12px', fontWeight: 500 }}>
                  {addMeasurementError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMeasurementModal(false);
                    setActiveVariantAddIndex(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomMeasurement}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    background: '#22c55e',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Add Measurement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Unified Custom Units Manager (Packaging & Measurement) */}
        {showManageUnitsModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px'
          }}>
            <div className="glass-card" style={{
              maxWidth: '520px',
              width: '100%',
              borderRadius: '20px',
              padding: '28px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-dark, #0f172a)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Trash2 size={18} color="#ef4444" /> Manage Custom Units
                </h3>
                <button
                  type="button"
                  onClick={() => setShowManageUnitsModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    fontSize: '18px'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Tabs: Packaging vs Measurement */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => setManageModalTab('packaging')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: manageModalTab === 'packaging' ? 'var(--primary, #6366f1)' : 'rgba(255,255,255,0.05)',
                    color: manageModalTab === 'packaging' ? '#fff' : 'var(--text-dim)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Packaging Types ({packagingOptions.filter(u => !DEFAULT_PACKAGING.includes(u)).length})
                </button>
                <button
                  type="button"
                  onClick={() => setManageModalTab('measurement')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: manageModalTab === 'measurement' ? '#22c55e' : 'rgba(255,255,255,0.05)',
                    color: manageModalTab === 'measurement' ? '#fff' : 'var(--text-dim)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Measurement Units ({measurementOptions.filter(m => !DEFAULT_MEASUREMENTS.includes(m.toUpperCase())).length})
                </button>
              </div>

              {unitDeleteFeedback.text && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: unitDeleteFeedback.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                  color: unitDeleteFeedback.type === 'error' ? '#ef4444' : '#22c55e',
                  border: `1px solid ${unitDeleteFeedback.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                }}>
                  {unitDeleteFeedback.text}
                </div>
              )}

              {/* Packaging Tab Content */}
              {manageModalTab === 'packaging' && (
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Add new packaging (e.g. CARTON)"
                      value={addPackagingInput}
                      onChange={(e) => setAddPackagingInput(e.target.value.toUpperCase())}
                      style={{ height: '42px', textTransform: 'uppercase' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomPackaging();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomPackaging}
                      style={{
                        padding: '0 16px',
                        background: 'var(--primary, #6366f1)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Add
                    </button>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 700 }}>
                    Custom Packaging Types
                  </div>

                  {packagingOptions.filter(u => !DEFAULT_PACKAGING.includes(u)).length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', padding: '12px 0' }}>
                      No custom packaging types added yet. Default packaging (BAG, BOX) are always available.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                      {packagingOptions.filter(u => !DEFAULT_PACKAGING.includes(u)).map(u => (
                        <div key={u} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)'
                        }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{u}</span>
                          <button
                            type="button"
                            onClick={() => handleDeletePackaging(u)}
                            disabled={unitDeleteLoading}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: 'none',
                              color: '#ef4444',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              cursor: unitDeleteLoading ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 600
                            }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Measurement Tab Content */}
              {manageModalTab === 'measurement' && (
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Add new measurement (e.g. MTR)"
                      value={addMeasurementInput}
                      onChange={(e) => setAddMeasurementInput(e.target.value.toUpperCase())}
                      style={{ height: '42px', textTransform: 'uppercase' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomMeasurement();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomMeasurement}
                      style={{
                        padding: '0 16px',
                        background: '#22c55e',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Add
                    </button>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 700 }}>
                    Custom Measurement Units
                  </div>

                  {measurementOptions.filter(m => !DEFAULT_MEASUREMENTS.includes(m.toUpperCase())).length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', padding: '12px 0' }}>
                      No custom measurement units added yet. Default measurement units (KG, LITRE) are always available.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                      {measurementOptions.filter(m => !DEFAULT_MEASUREMENTS.includes(m.toUpperCase())).map(m => (
                        <div key={m} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)'
                        }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{m.toUpperCase()}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteMeasurement(m)}
                            disabled={unitDeleteLoading}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: 'none',
                              color: '#ef4444',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              cursor: unitDeleteLoading ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 600
                            }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowManageUnitsModal(false)}
                  className="btn-primary"
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AddProduct;
