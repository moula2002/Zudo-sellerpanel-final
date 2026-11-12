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
  ClipboardList,
  RefreshCcw,
  Trash2,
  Plus,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import Layout from '../components/Layout';

const EditProduct = () => {
  const { id } = useParams();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sellerB2bPrice: '',
    b2bPrice: '',
    priceBasis: 'per_unit',
    commissionType: 'flat',
    commissionValue: '2',
    moq: '1',
    unit: 'BAG',
    packagingType: 'BAG',
    measurementUnit: 'kg',
    measurementBasis: 'KG',
    unitSize: '1',
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
  const [fetchError, setFetchError] = useState(null);
  const navigate = useNavigate();
  const [calcQuantity, setCalcQuantity] = useState(1);

  // Main B2B Pricing Custom Unit Management
  const [mainUnitOptions, setMainUnitOptions] = useState(['BOX', 'BAG']);
  const [showMainCustomModal, setShowMainCustomModal] = useState(false);
  const [mainCustomInput, setMainCustomInput] = useState('');
  const [mainCustomError, setMainCustomError] = useState('');

  // B2B Size Variants Custom Unit Management
  const [variantCustomModalIndex, setVariantCustomModalIndex] = useState(null);
  const [variantCustomInput, setVariantCustomInput] = useState('');
  const [variantCustomError, setVariantCustomError] = useState('');
  const [globalVariantCustomUnits, setGlobalVariantCustomUnits] = useState([]);

  // Unit Management Modal (Standalone Manager for all custom units)
  const [showManageUnitsModal, setShowManageUnitsModal] = useState(false);
  const [unitDeleteLoading, setUnitDeleteLoading] = useState(false);
  const [unitDeleteFeedback, setUnitDeleteFeedback] = useState({ type: '', text: '' });

  const DEFAULT_VARIANT_UNITS = ['pcs', 'g', 'kg', 'ltr', 'ml', 'bag'];

  useEffect(() => {
    const fetchData = async () => {
      if (!id || id === 'undefined' || id === 'null') {
        setFetchError('Invalid product ID');
        setFetching(false);
        return;
      }

      setFetching(true);
      setFetchError(null);

      try {
        const [catRes, productRes, commRes, customRes] = await Promise.all([
          api.get('/categories'),
          api.get(`/products/${id}`),
          api.get('/commissions').catch(() => ({ data: [] })),
          api.get('/products/custom-units').catch(() => ({ data: { mainUnits: [], variantUnits: [] } }))
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

        const rawLoadedUnit = (p.unit || 'BOX').toString().trim().toUpperCase();
        // If the legacy product had 'KG' or 'PCS' as unit, normalize it to 'BOX' unless it was BOX or BAG or custom
        const loadedUnit = (rawLoadedUnit === 'KG' || rawLoadedUnit === 'PCS') ? 'BOX' : rawLoadedUnit;
        const loadedCustom = Array.isArray(p.customUnits)
          ? p.customUnits.map(u => String(u || '').trim().toUpperCase()).filter(u => u && u !== 'KG' && u !== 'PCS' && u !== 'BOX' && u !== 'BAG')
          : [];
        const globalCustom = Array.isArray(customRes.data?.mainUnits)
          ? customRes.data.mainUnits.map(u => String(u || '').trim().toUpperCase()).filter(u => u && u !== 'KG' && u !== 'PCS' && u !== 'BOX' && u !== 'BAG')
          : [];
        const mergedMainOptions = Array.from(new Set(['BOX', 'BAG', ...loadedCustom, ...globalCustom, loadedUnit]))
          .filter(u => u !== 'KG' && u !== 'PCS');
        setMainUnitOptions(mergedMainOptions);

        const loadedPackaging = (p.packagingType || loadedUnit || 'BAG').toUpperCase();
        const loadedMeas = (p.measurementBasis || p.measurementUnit || 'KG').toUpperCase();
        const loadedPriceBasis = p.priceBasis || (p.isPackagePrice ? 'per_package' : 'per_unit');

        let resolvedUnitSize = Number(p.unitSize);
        if (!resolvedUnitSize || resolvedUnitSize <= 1) {
          const firstB2b = (p.b2b && p.b2b[0]) || (p.variants && p.variants[0]);
          if (firstB2b) {
            const vs = Number(firstB2b.unitSize || firstB2b.sizeValue);
            if (vs && vs > 1) resolvedUnitSize = vs;
            else if (firstB2b.packetSize) {
              const m = String(firstB2b.packetSize).match(/([0-9.]+)/);
              if (m && parseFloat(m[1]) > 1) resolvedUnitSize = parseFloat(m[1]);
            }
          }
          if (!resolvedUnitSize || resolvedUnitSize <= 1) {
            const nameMatch = String(p.name || '').match(/([0-9.]+)\s*(kg|g|ltr|pcs|gm|kgs|ton|ml)/i);
            if (nameMatch && parseFloat(nameMatch[1]) > 1) {
              resolvedUnitSize = parseFloat(nameMatch[1]);
            }
          }
        }
        if (!resolvedUnitSize || resolvedUnitSize <= 0) resolvedUnitSize = 1;

        setFormData({
          name: p.name || '',
          description: p.description || '',
          sellerB2bPrice: loadedPriceBasis === 'per_unit' && p.sellerPricePerBaseUnit !== undefined && p.sellerPricePerBaseUnit !== null
            ? String(p.sellerPricePerBaseUnit)
            : baseSellerB2bPrice,
          b2bPrice: p.b2bPrice ? String(p.b2bPrice) : (p.price ? String(p.price) : ''),
          priceBasis: loadedPriceBasis,
          commissionType: commType,
          commissionValue: commVal,
          moq: (p.moq !== undefined && p.moq !== null) ? String(p.moq) : ((p.maxOrderQuantity !== undefined && p.maxOrderQuantity !== null) ? String(p.maxOrderQuantity) : '1'),
          unit: loadedPackaging,
          packagingType: loadedPackaging,
          measurementUnit: loadedMeas.toLowerCase(),
          measurementBasis: loadedMeas,
          unitSize: String(resolvedUnitSize),
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
          const val = valMatch ? valMatch[0] : '';
          const unit = sizeStr.slice(val.length).trim();
          return {
            val,
            unit: unit || 'kg'
          };
        };

        const globalVariantCustom = Array.isArray(customRes.data?.variantUnits)
          ? customRes.data.variantUnits.map(u => String(u || '').trim().toUpperCase()).filter(Boolean)
          : [];
        setGlobalVariantCustomUnits(globalVariantCustom);

        const parsedB2b = (p.b2b || []).map(v => {
          const parsed = parsePacketSize(v.packetSize);
          const vUnitSize = v.unitSize !== undefined && v.unitSize !== null ? String(v.unitSize) : (v.sizeValue ? String(v.sizeValue) : (parsed.val || '1'));
          const vPriceBasis = v.priceBasis || loadedPriceBasis || 'per_unit';
          const vSeller = vPriceBasis === 'per_unit' && v.sellerPricePerBaseUnit !== undefined && v.sellerPricePerBaseUnit !== null
            ? String(v.sellerPricePerBaseUnit)
            : (v.sellerPrice !== undefined && v.sellerPrice !== null ? String(v.sellerPrice) : (v.price ? String(v.price) : ''));
          const variantMeas = (v.measurementBasis || v.measurementUnit || parsed.unit || 'kg').toLowerCase();
          const variantPkg = (v.packagingType || loadedPackaging || 'BAG').toUpperCase();
          const variantOptions = Array.from(new Set([...DEFAULT_VARIANT_UNITS, ...globalVariantCustom, variantMeas]));
          return {
            packetSizeVal: vUnitSize,
            packetSizeUnit: variantMeas,
            packagingType: variantPkg,
            priceBasis: vPriceBasis,
            customUnitOptions: variantOptions,
            sellerPrice: vSeller,
            price: v.price ? String(v.price) : '',
            gstPercent: v.gstPercent !== undefined && v.gstPercent !== null ? String(v.gstPercent) : (p.gstPercent ? String(p.gstPercent) : '0'),
            stock: v.stock !== undefined ? String(v.stock) : ''
          };
        });

        setB2bVariants(parsedB2b);
        if (p.imageUrl) {
          setPreviews(prev => ({ ...prev, image: getImageUrl(p.imageUrl) }));
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        const errorMsg = err.response?.data?.message || (err.response?.status === 404 ? 'Product not found or has been deleted.' : 'Failed to load product details');
        setFetchError(errorMsg);
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

  const handleAddB2b = () => setB2bVariants([
    ...b2bVariants, 
    { 
      packetSizeVal: '', 
      packetSizeUnit: formData.measurementUnit || 'kg',
      packagingType: formData.unit || 'BAG',
      priceBasis: formData.priceBasis || 'per_unit',
      customUnitOptions: Array.from(new Set([...DEFAULT_VARIANT_UNITS, ...globalVariantCustomUnits])),
      sellerPrice: '', 
      price: '', 
      gstPercent: formData.gstPercent || 0,
      stock: '' 
    }
  ]);
  const handleRemoveB2b = (index) => setB2bVariants(b2bVariants.filter((_, i) => i !== index));
  const handleB2bChange = (index, field, value) => {
    const newArr = [...b2bVariants];
    newArr[index][field] = value;
    setB2bVariants(newArr);
  };

  // Add custom unit for main B2B Pricing dropdown
  const handleAddMainCustomUnit = async () => {
    const clean = (mainCustomInput || '').trim().toUpperCase();
    if (!clean) {
      setMainCustomError('Unit name cannot be empty');
      return;
    }
    if (mainUnitOptions.includes(clean)) {
      setMainCustomError(`Unit "${clean}" already exists`);
      return;
    }
    try {
      await api.post('/products/custom-units', { unit: clean, type: 'main' });
    } catch (e) {
      console.warn('Backend custom unit sync (main):', e.response?.data?.message || e.message);
    }
    setMainUnitOptions(prev => [...prev, clean]);
    setFormData(prev => ({ ...prev, unit: clean }));
    setMainCustomInput('');
    setMainCustomError('');
    setShowMainCustomModal(false);
  };

  // Add custom unit for a specific B2B variant row
  const handleAddVariantCustomUnit = async () => {
    if (variantCustomModalIndex === null) return;
    const clean = (variantCustomInput || '').trim().toUpperCase();
    if (!clean) {
      setVariantCustomError('Unit name cannot be empty');
      return;
    }
    const targetVariant = b2bVariants[variantCustomModalIndex];
    const currentOptions = targetVariant?.customUnitOptions || DEFAULT_VARIANT_UNITS;
    if (currentOptions.includes(clean)) {
      setVariantCustomError(`Unit "${clean}" already exists in this variant`);
      return;
    }

    try {
      await api.post('/products/custom-units', { unit: clean, type: 'variant' });
    } catch (e) {
      console.warn('Backend custom unit sync (variant):', e.response?.data?.message || e.message);
    }

    const newVariants = [...b2bVariants];
    newVariants[variantCustomModalIndex] = {
      ...targetVariant,
      customUnitOptions: [...currentOptions, clean],
      packetSizeUnit: clean
    };
    setB2bVariants(newVariants);
    setGlobalVariantCustomUnits(prev => Array.from(new Set([...prev, clean])));
    setVariantCustomInput('');
    setVariantCustomError('');
    setVariantCustomModalIndex(null);
  };

  // Delete a custom unit (Main B2B unit)
  const handleDeleteMainCustomUnit = async (unitToDelete) => {
    const clean = String(unitToDelete || '').trim().toUpperCase();
    if (clean === 'BOX' || clean === 'BAG') {
      alert('Permanent default units (BOX, BAG) cannot be deleted.');
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to delete custom unit "${clean}"?`);
    if (!confirmed) return;

    setUnitDeleteLoading(true);
    setUnitDeleteFeedback({ type: '', text: '' });

    try {
      const res = await api.delete('/products/custom-units', {
        data: { unit: clean, type: 'main' }
      });

      // Update state: remove from mainUnitOptions
      setMainUnitOptions(prev => prev.filter(u => u !== clean));

      // If currently selected unit was the deleted one, reset to default BOX
      if (formData.unit === clean) {
        setFormData(prev => ({ ...prev, unit: 'BOX' }));
      }

      setUnitDeleteFeedback({
        type: 'success',
        text: res.data?.message || `Unit "${clean}" deleted successfully.`
      });
      setTimeout(() => setUnitDeleteFeedback({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Failed to delete custom unit:', err);
      const msg = err.response?.data?.message || `Failed to delete custom unit "${clean}".`;
      setUnitDeleteFeedback({ type: 'error', text: msg });
      alert(msg);
    } finally {
      setUnitDeleteLoading(false);
    }
  };

  // Delete a custom unit from a B2B variant
  const handleDeleteVariantCustomUnit = async (variantIdx, unitToDelete) => {
    const clean = String(unitToDelete || '').trim();
    const DEFAULT_SET = new Set(['pcs', 'g', 'kg', 'ltr', 'ml', 'bag', 'PCS', 'G', 'KG', 'LTR', 'ML', 'BAG']);
    if (DEFAULT_SET.has(clean) || DEFAULT_SET.has(clean.toLowerCase())) {
      alert(`Standard default variant units (${clean}) cannot be deleted.`);
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to delete custom variant unit "${clean}"?`);
    if (!confirmed) return;

    setUnitDeleteLoading(true);
    setUnitDeleteFeedback({ type: '', text: '' });

    try {
      const res = await api.delete('/products/custom-units', {
        data: { unit: clean, type: 'variant' }
      });

      // Update the specific variant row's options and any other rows carrying it
      setB2bVariants(prev => prev.map(v => {
        const updatedOptions = (v.customUnitOptions || DEFAULT_VARIANT_UNITS).filter(u => u !== clean);
        return {
          ...v,
          customUnitOptions: updatedOptions,
          packetSizeUnit: v.packetSizeUnit === clean ? 'pcs' : v.packetSizeUnit
        };
      }));

      setGlobalVariantCustomUnits(prev => prev.filter(u => u !== clean));

      setUnitDeleteFeedback({
        type: 'success',
        text: res.data?.message || `Variant unit "${clean}" deleted successfully.`
      });
      setTimeout(() => setUnitDeleteFeedback({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Failed to delete variant custom unit:', err);
      const msg = err.response?.data?.message || `Failed to delete custom unit "${clean}".`;
      setUnitDeleteFeedback({ type: 'error', text: msg });
      alert(msg);
    } finally {
      setUnitDeleteLoading(false);
    }
  };

  // Calculations for wholesale B2B pricing
  const sellerB2bVal = parseFloat(formData.sellerB2bPrice) || 0;
  const commType = formData.commissionType || 'flat';
  const commVal = parseFloat(formData.commissionValue) || 0;

  const b2bCalc = calculateCustomerPrice(sellerB2bVal, commType, commVal);

  const selectedCategory = categories.find(c => String(c._id) === String(formData.categoryId));
  const gstPercentNum = Number(formData.gstPercent) || 0;

  const b2bSellerBase = sellerB2bVal * calcQuantity;
  const b2bGstAmount = (b2bSellerBase * gstPercentNum) / 100;
  const b2bPriceTotal = b2bSellerBase + b2bGstAmount;

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
          const rawPrice = parseFloat(v.sellerPrice || v.price) || 0;
          const uSize = parseFloat(v.packetSizeVal || v.unitSize) || 1;
          const mUnit = (v.packetSizeUnit || v.measurementBasis || formData.measurementBasis || formData.measurementUnit || 'KG').toUpperCase();
          const pType = (v.packagingType || formData.packagingType || formData.unit || 'BAG').toUpperCase();
          const vPriceBasis = v.priceBasis || formData.priceBasis || 'per_unit';
          const isPkg = vPriceBasis === 'per_package';
          const pkgPrice = isPkg ? rawPrice : Math.round(rawPrice * uSize * 100) / 100;
          const basePrice = isPkg ? (uSize > 0 ? Math.round((rawPrice / uSize) * 100) / 100 : rawPrice) : rawPrice;
          return {
            packetSize: `${v.packetSizeVal}${v.packetSizeUnit}`,
            sizeValue: uSize,
            unitSize: uSize,
            measurementUnit: mUnit,
            measurementBasis: mUnit,
            packagingType: pType,
            priceBasis: vPriceBasis,
            isPackagePrice: isPkg,
            sellerPrice: pkgPrice,
            sellerPricePerProductUnit: pkgPrice,
            sellerPricePerBaseUnit: basePrice,
            price: pkgPrice,
            stock: parseInt(v.stock) || 0,
            gstPercent: v.gstPercent !== undefined && v.gstPercent !== '' ? parseFloat(v.gstPercent) : gstPercentNum
          };
        });

      const cleanSubCategoryId = formData.subCategoryId && formData.subCategoryId !== '' && formData.subCategoryId !== 'null'
        ? formData.subCategoryId
        : null;

      const customUnitsToSave = Array.from(new Set(
        mainUnitOptions
          .filter(u => u !== 'BOX' && u !== 'BAG')
          .concat(formData.unit && formData.unit !== 'BOX' && formData.unit !== 'BAG' ? [formData.unit] : [])
      ));

      await api.put(`/products/${id}`, {
        ...formData,
        unit: formData.unit ? formData.unit.toUpperCase() : 'BAG',
        packagingType: (formData.packagingType || formData.unit || 'BAG').toUpperCase(),
        measurementBasis: (formData.measurementBasis || formData.measurementUnit || 'KG').toUpperCase(),
        measurementUnit: (formData.measurementBasis || formData.measurementUnit || 'KG').toUpperCase(),
        priceBasis: formData.priceBasis || 'per_unit',
        isPackagePrice: formData.priceBasis === 'per_package',
        unitSize: parseFloat(formData.unitSize) || 1,
        customUnits: customUnitsToSave,
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

  if (fetchError) return (
    <Layout>
      <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', padding: '40px 24px' }}>
        <div className="glass-card" style={{ padding: '40px', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertCircle size={32} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '10px' }}>
            Product Unavailable
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '28px', lineHeight: '1.6' }}>
            {fetchError}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate('/products')}
              style={{
                padding: '12px 28px',
                borderRadius: '12px',
                background: 'var(--primary)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Back to Products
            </button>
          </div>
        </div>
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
                {(mainUnitOptions.filter(u => u !== 'BOX' && u !== 'BAG').length > 0 || globalVariantCustomUnits.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setShowManageUnitsModal(true)}
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
                    <Trash2 size={13} /> Manage Custom Units
                  </button>
                )}
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
                      placeholder={formData.priceBasis === 'per_package' ? "e.g. 1500 (per package)" : "e.g. 50 (per base unit)"}
                      value={formData.sellerB2bPrice}
                      onChange={e => setFormData({ ...formData, sellerB2bPrice: e.target.value })}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    {formData.priceBasis === 'per_package' 
                      ? `Price per complete ${(formData.unit || 'package').toUpperCase()}` 
                      : `Price per 1 ${(formData.measurementUnit || 'kg').toUpperCase()}`}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Price Calculation Basis *</label>
                  <select
                    className="input-field"
                    value={formData.priceBasis || 'per_unit'}
                    onChange={e => setFormData({ ...formData, priceBasis: e.target.value })}
                    required
                    style={{ height: '50px', cursor: 'pointer' }}
                  >
                    <option value="per_unit">Method A – Base Measurement Unit Pricing (e.g. ₹50/KG)</option>
                    <option value="per_package">Method B – Complete Package Pricing (e.g. ₹1,500/Bag)</option>
                  </select>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    {formData.priceBasis === 'per_package' ? 'Direct package price (not multiplied)' : 'Multiplied by unit size to compute package price'}
                  </span>
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
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Packaging / Unit Type *</label>
                  <select
                    className="input-field"
                    value={formData.unit}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_CUSTOM__') {
                        setMainCustomInput('');
                        setMainCustomError('');
                        setShowMainCustomModal(true);
                      } else {
                        const val = e.target.value;
                        const autoMeas = ['kg', 'ton', 'ltr', 'g', 'ml', 'pcs'].includes(val.toLowerCase()) ? val.toLowerCase() : (formData.measurementUnit || 'kg');
                        setFormData(prev => ({ ...prev, unit: val, packagingType: val, measurementUnit: autoMeas, measurementBasis: autoMeas.toUpperCase() }));
                      }
                    }}
                    required
                    style={{ height: '50px', cursor: 'pointer' }}
                  >
                    <option value="BAG">BAG</option>
                    <option value="BOX">BOX</option>
                    <option value="TIN">TIN</option>
                    <option value="BOTTLE">BOTTLE</option>
                    <option value="PACK">PACK</option>
                    <option value="PIECE">PIECE</option>
                    {mainUnitOptions.filter(u => !['BOX', 'BAG', 'TIN', 'BOTTLE', 'PACK', 'PIECE'].includes(u)).map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                    <option value="__ADD_CUSTOM__" style={{ fontWeight: 700, color: 'var(--primary, #6366f1)' }}>
                      + Custom Packaging
                    </option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Measurement Basis * <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>(e.g. KG for Bag of Rice)</span>
                  </label>
                  <select
                    className="input-field"
                    value={formData.measurementUnit || 'kg'}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData(prev => ({ ...prev, measurementUnit: val, measurementBasis: val.toUpperCase() }));
                    }}
                    required
                    style={{ height: '50px', cursor: 'pointer' }}
                  >
                    <option value="kg">KG</option>
                    <option value="g">Gram (g)</option>
                    <option value="ton">Ton</option>
                    <option value="ltr">Litre</option>
                    <option value="ml">Millilitre (ml)</option>
                    <option value="pcs">Piece</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Unit Size * <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>(e.g. 30 for 30 {(formData.measurementUnit || 'KG').toUpperCase()} per {formData.unit})</span>
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 30"
                    value={formData.unitSize}
                    onChange={e => setFormData({ ...formData, unitSize: e.target.value })}
                    required
                    min="0.01"
                    step="any"
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
                      {formData.priceBasis === 'per_package'
                        ? `₹${Number(formData.sellerB2bPrice || 0).toFixed(2)} / ${(formData.unit || 'BAG').toUpperCase()} (Complete Package Price)`
                        : `₹${(Number(formData.sellerB2bPrice || 0) * Number(formData.unitSize || 1)).toFixed(2)} / ${(formData.unit || 'BAG').toUpperCase()} (₹${Number(formData.sellerB2bPrice || 0)} × ${formData.unitSize || 1} ${(formData.measurementUnit || 'KG').toUpperCase()})`
                      }
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Maximum order quantity</label>
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
                      <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Applicable GST ({gstPercentNum}%):</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>+₹{b2bGstAmount.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-color)', fontSize: '15px' }}>
                      <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>Total Price (incl. GST):</span>
                      <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '17px' }}>₹{b2bPriceTotal.toFixed(2)}</span>
                    </div>
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
                      const vUnitSize = parseFloat(variant.packetSizeVal) || 1;
                      const vPkgType = (variant.packagingType || formData.unit || 'BAG').toUpperCase();
                      const vMeas = (variant.packetSizeUnit || formData.measurementUnit || 'kg').toUpperCase();
                      const vPriceBasis = variant.priceBasis || formData.priceBasis || 'per_unit';
                      const vPkgPrice = vPriceBasis === 'per_package' ? vSeller : (vSeller * vUnitSize);
                      const vGstRate = variant.gstPercent !== undefined && variant.gstPercent !== '' ? parseFloat(variant.gstPercent) : gstPercentNum;
                      const vTotalWithGst = vPkgPrice > 0 ? (vPkgPrice + (vPkgPrice * vGstRate) / 100) : 0;

                      return (
                        <div key={index} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '15px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1.2, minWidth: '100px' }}>
                              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-main)', marginBottom: '4px', fontWeight: 600 }}>Packaging Type *</label>
                              <select 
                                className="input-field" 
                                value={variant.packagingType || formData.unit || 'BAG'} 
                                onChange={(e) => handleB2bChange(index, 'packagingType', e.target.value)}
                                required
                                style={{ height: '48px', cursor: 'pointer' }}
                              >
                                <option value="BAG">BAG</option>
                                <option value="BOX">BOX</option>
                                <option value="TIN">TIN</option>
                                <option value="BOTTLE">BOTTLE</option>
                                <option value="PACK">PACK</option>
                                <option value="PIECE">PIECE</option>
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
                                style={{ height: '48px' }}
                              />
                            </div>

                            <div style={{ flex: 1.1, minWidth: '100px' }}>
                              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-main)', marginBottom: '4px', fontWeight: 600 }}>Measurement *</label>
                              <select 
                                className="input-field" 
                                value={variant.packetSizeUnit} 
                                onChange={(e) => handleB2bChange(index, 'packetSizeUnit', e.target.value)} 
                                required
                                style={{ height: '48px', cursor: 'pointer' }}
                              >
                                <option value="kg">KG</option>
                                <option value="g">Gram (g)</option>
                                <option value="ton">Ton</option>
                                <option value="ltr">Litre</option>
                                <option value="ml">Millilitre</option>
                                <option value="pcs">Piece</option>
                              </select>
                            </div>

                            <div style={{ flex: 1.5, minWidth: '140px' }}>
                              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-main)', marginBottom: '4px', fontWeight: 600 }}>Price Basis *</label>
                              <select 
                                className="input-field" 
                                value={variant.priceBasis || formData.priceBasis || 'per_unit'} 
                                onChange={(e) => handleB2bChange(index, 'priceBasis', e.target.value)} 
                                required
                                style={{ height: '48px', cursor: 'pointer' }}
                              >
                                <option value="per_unit">Per Measurement Unit (₹/{vMeas})</option>
                                <option value="per_package">Per Complete {vPkgType}</option>
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
                                style={{ height: '48px' }}
                              />
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
                                style={{ height: '48px' }}
                              />
                            </div>

                            <button 
                              type="button" 
                              onClick={() => handleRemoveB2b(index)} 
                              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '12px', borderRadius: '12px', cursor: 'pointer', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Remove Variant"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>

                          {/* Variant Specification & Pricing Summary */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99, 102, 241, 0.05)', padding: '8px 12px', borderRadius: '8px', fontSize: '11.5px', flexWrap: 'wrap', gap: '8px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                              1 {vPkgType} = {vUnitSize} {vMeas}
                            </span>
                            <span style={{ color: '#22c55e', fontWeight: 700 }}>
                              Payout / {vPkgType}: ₹{vPkgPrice.toFixed(2)} {vGstRate > 0 ? `(₹${vTotalWithGst.toFixed(2)} incl. ${vGstRate}% GST)` : ''}
                            </span>
                          </div>
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

        {/* Modal: Add Custom Unit for Main Unit Type */}
        {showMainCustomModal && (
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
                Add Custom Unit Type
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
                Enter a custom unit name (e.g. CARTON, CRATE, TRAY). It will be saved with this product.
              </p>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. CARTON"
                value={mainCustomInput}
                onChange={(e) => {
                  setMainCustomInput(e.target.value.toUpperCase());
                  setMainCustomError('');
                }}
                autoFocus
                style={{ height: '48px', textTransform: 'uppercase', marginBottom: '8px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMainCustomUnit();
                  }
                }}
              />
              {mainCustomError && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '12px', fontWeight: 500 }}>
                  {mainCustomError}
                </div>
              )}

              {unitDeleteFeedback.text && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: unitDeleteFeedback.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                  color: unitDeleteFeedback.type === 'error' ? '#ef4444' : '#22c55e',
                  border: `1px solid ${unitDeleteFeedback.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                }}>
                  {unitDeleteFeedback.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowMainCustomModal(false)}
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
                  onClick={handleAddMainCustomUnit}
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
                  Add Unit
                </button>
              </div>

              {/* Manage Existing Custom Main Units */}
              {mainUnitOptions.filter(u => u !== 'BOX' && u !== 'BAG').length > 0 && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Custom Units ({mainUnitOptions.filter(u => u !== 'BOX' && u !== 'BAG').length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                    {mainUnitOptions.filter(u => u !== 'BOX' && u !== 'BAG').map(u => (
                      <div key={u} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{u}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteMainCustomUnit(u)}
                          disabled={unitDeleteLoading}
                          title={`Delete custom unit "${u}"`}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: 'none',
                            color: '#ef4444',
                            padding: '6px',
                            borderRadius: '6px',
                            cursor: unitDeleteLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Add Custom Unit for B2B Variant */}
        {variantCustomModalIndex !== null && (
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
                Add Custom Variant Unit
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
                Enter custom unit for Variant #{variantCustomModalIndex + 1} (e.g. PACKET, CAN, STRIP).
              </p>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. PACKET"
                value={variantCustomInput}
                onChange={(e) => {
                  setVariantCustomInput(e.target.value.toUpperCase());
                  setVariantCustomError('');
                }}
                autoFocus
                style={{ height: '48px', textTransform: 'uppercase', marginBottom: '8px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddVariantCustomUnit();
                  }
                }}
              />
              {variantCustomError && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '12px', fontWeight: 500 }}>
                  {variantCustomError}
                </div>
              )}

              {unitDeleteFeedback.text && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: unitDeleteFeedback.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                  color: unitDeleteFeedback.type === 'error' ? '#ef4444' : '#22c55e',
                  border: `1px solid ${unitDeleteFeedback.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                }}>
                  {unitDeleteFeedback.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setVariantCustomModalIndex(null)}
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
                  onClick={handleAddVariantCustomUnit}
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
                  Add Unit
                </button>
              </div>

              {/* Manage Existing Custom Variant Units for this variant row */}
              {variantCustomModalIndex !== null && (() => {
                const currentVariantOpts = b2bVariants[variantCustomModalIndex]?.customUnitOptions || DEFAULT_VARIANT_UNITS;
                const customOnly = currentVariantOpts.filter(u => !DEFAULT_VARIANT_UNITS.includes(u) && !DEFAULT_VARIANT_UNITS.includes(u.toLowerCase()));
                if (customOnly.length === 0) return null;
                return (
                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Custom Variant Units ({customOnly.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                      {customOnly.map(u => (
                        <div key={u} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)'
                        }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{u}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteVariantCustomUnit(variantCustomModalIndex, u)}
                            disabled={unitDeleteLoading}
                            title={`Delete custom variant unit "${u}"`}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: 'none',
                              color: '#ef4444',
                              padding: '6px',
                              borderRadius: '6px',
                              cursor: unitDeleteLoading ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Modal: Standalone Custom Unit Management Interface */}
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
              maxWidth: '480px',
              width: '100%',
              borderRadius: '20px',
              padding: '28px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-dark, #0f172a)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Trash2 size={18} color="#ef4444" /> Custom Unit Management
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

              <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
                Manage custom units created for your store. Standard defaults (BOX, BAG, pcs, etc.) cannot be deleted.
              </p>

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

              {/* Main Custom Units */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Main B2B Custom Units ({mainUnitOptions.filter(u => u !== 'BOX' && u !== 'BAG').length})
                </div>
                {mainUnitOptions.filter(u => u !== 'BOX' && u !== 'BAG').length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', padding: '8px 0' }}>
                    No custom main units added yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
                    {mainUnitOptions.filter(u => u !== 'BOX' && u !== 'BAG').map(u => (
                      <div key={u} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{u}</span>
                          {formData.unit === u && (
                            <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--primary, #6366f1)', fontWeight: 600 }}>
                              (Currently Selected)
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMainCustomUnit(u)}
                          disabled={unitDeleteLoading}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            cursor: unitDeleteLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
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

              {/* Variant Custom Units */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Variant Custom Units ({globalVariantCustomUnits.length})
                </div>
                {globalVariantCustomUnits.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', padding: '8px 0' }}>
                    No custom variant units added yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
                    {globalVariantCustomUnits.map(u => (
                      <div key={u} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{u}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteVariantCustomUnit(null, u)}
                          disabled={unitDeleteLoading}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            cursor: unitDeleteLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
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

export default EditProduct;
