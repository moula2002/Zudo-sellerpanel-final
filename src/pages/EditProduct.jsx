import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { uploadApi, IMAGE_BASE_URL, getImageUrl } from '../utils/api';
import { findCategoryCommission, calculateCustomerPrice, calculateB2bPricing } from '../utils/pricing';
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
    measurementUnit: 'KG',
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

        const rawLoadedUnit = (p.unit || p.packagingType || 'BAG').toString().trim().toUpperCase();
        const loadedUnit = (rawLoadedUnit === 'KG' || rawLoadedUnit === 'LITRE' || rawLoadedUnit === 'LTR') ? 'BAG' : (rawLoadedUnit || 'BAG');
        const loadedCustom = Array.isArray(p.customUnits)
          ? p.customUnits.map(u => String(u || '').trim().toUpperCase()).filter(u => u && !DEFAULT_PACKAGING.includes(u) && u !== 'KG' && u !== 'LITRE' && u !== 'LTR')
          : [];
        const globalCustomPkg = Array.isArray(customRes.data?.packagingUnits || customRes.data?.mainUnits)
          ? (customRes.data.packagingUnits || customRes.data.mainUnits).map(u => String(u || '').trim().toUpperCase()).filter(u => u && !DEFAULT_PACKAGING.includes(u) && u !== 'KG' && u !== 'LITRE' && u !== 'LTR')
          : [];
        const mergedPkgOptions = Array.from(new Set([...DEFAULT_PACKAGING, ...loadedCustom, ...globalCustomPkg, loadedUnit]))
          .filter(u => u && u !== 'KG' && u !== 'LITRE' && u !== 'LTR');
        setPackagingOptions(mergedPkgOptions);

        const loadedMeasCustom = Array.isArray(p.customMeasurementUnits)
          ? p.customMeasurementUnits.map(u => String(u || '').trim().toUpperCase()).filter(u => u && !DEFAULT_MEASUREMENTS.includes(u) && u !== 'BAG' && u !== 'BOX')
          : [];
        const globalCustomMeas = Array.isArray(customRes.data?.measurementUnits || customRes.data?.variantUnits)
          ? (customRes.data.measurementUnits || customRes.data.variantUnits).map(u => String(u || '').trim().toUpperCase()).filter(u => u && !DEFAULT_MEASUREMENTS.includes(u) && u !== 'BAG' && u !== 'BOX')
          : [];
        const rawMeasVal = (p.measurementBasis || p.measurementUnit || 'KG').toString().trim().toUpperCase();
        const loadedMeasVal = (rawMeasVal === 'BAG' || rawMeasVal === 'BOX') ? 'KG' : rawMeasVal;
        const mergedMeasOptions = Array.from(new Set([...DEFAULT_MEASUREMENTS, ...loadedMeasCustom, ...globalCustomMeas, loadedMeasVal]))
          .filter(u => u && u !== 'BAG' && u !== 'BOX');
        setMeasurementOptions(mergedMeasOptions);

        const loadedPackaging = (p.packagingType || loadedUnit || 'BAG').toUpperCase();
        const loadedMeas = loadedMeasVal;
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
          measurementUnit: loadedMeas,
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
          if (!sizeStr) return { val: '', unit: 'KG' };
          const valMatch = sizeStr.match(/^[\d\.]+/);
          const val = valMatch ? valMatch[0] : '';
          const unit = sizeStr.slice(val.length).trim().toUpperCase();
          return {
            val,
            unit: unit || 'KG'
          };
        };

        const parsedB2b = (p.b2b || []).map(v => {
          const parsed = parsePacketSize(v.packetSize);
          const vUnitSize = v.unitSize !== undefined && v.unitSize !== null ? String(v.unitSize) : (v.sizeValue ? String(v.sizeValue) : (parsed.val || '1'));
          const vPriceBasis = v.priceBasis || loadedPriceBasis || 'per_unit';
          const vSeller = vPriceBasis === 'per_unit' && v.sellerPricePerBaseUnit !== undefined && v.sellerPricePerBaseUnit !== null
            ? String(v.sellerPricePerBaseUnit)
            : (v.sellerPrice !== undefined && v.sellerPrice !== null ? String(v.sellerPrice) : (v.price ? String(v.price) : ''));
          let variantMeas = (v.measurementBasis || v.measurementUnit || parsed.unit || 'KG').toUpperCase();
          if (variantMeas === 'BAG' || variantMeas === 'BOX') {
            variantMeas = 'KG';
          }
          let variantPkg = (v.packagingType || loadedPackaging || 'BAG').toUpperCase();
          if (variantPkg === 'KG' || variantPkg === 'LITRE' || variantPkg === 'LTR') {
            variantPkg = 'BAG';
          }
          return {
            packetSizeVal: vUnitSize,
            packetSizeUnit: variantMeas,
            packagingType: variantPkg,
            priceBasis: vPriceBasis,
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

  // Calculations for wholesale B2B pricing
  const sellerB2bVal = parseFloat(formData.sellerB2bPrice) || 0;
  const commType = formData.commissionType || 'flat';
  const commVal = parseFloat(formData.commissionValue) || 0;

  const b2bCalc = calculateCustomerPrice(sellerB2bVal, commType, commVal);

  const selectedCategory = categories.find(c => String(c._id) === String(formData.categoryId));
  const gstPercentNum = Number(formData.gstPercent) || 0;
  const currentUnitSize = parseFloat(formData.unitSize) > 0 ? parseFloat(formData.unitSize) : 1;

  // Shared package pricing calculation:
  // sellerPricePerPackage = basePrice × unitSize
  // gstAmount = sellerPricePerPackage × (gstRate / 100)
  // customerPricePerPackage = sellerPricePerPackage + gstAmount
  const pricingBreakdown = calculateB2bPricing({
    basePrice: sellerB2bVal,
    unitSize: currentUnitSize,
    gstRate: gstPercentNum,
    quantity: calcQuantity
  });

  const b2bSellerBase = pricingBreakdown.totalSellerPrice;
  const b2bGstAmount = pricingBreakdown.totalGstAmount;
  const b2bPriceTotal = pricingBreakdown.totalCustomerPrice;

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
          let rawPrice = parseFloat(v.sellerPrice || v.price) || 0;
          const uSize = parseFloat(v.packetSizeVal || v.unitSize) || 1;
          const mUnit = (v.packetSizeUnit || v.measurementBasis || formData.measurementBasis || formData.measurementUnit || 'KG').toUpperCase();
          const pType = (v.packagingType || formData.packagingType || formData.unit || 'BAG').toUpperCase();
          // Sync with base product seller price if this variant matches base packaging & unit size
          if (uSize === (parseFloat(formData.unitSize) || 1) && pType === (formData.packagingType || formData.unit || 'BAG').toUpperCase()) {
            const baseFormPrice = parseFloat(formData.sellerB2bPrice || formData.price) || 0;
            if (baseFormPrice > 0) {
              rawPrice = baseFormPrice;
            }
          }

          const pkgPrice = rawPrice;
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
            gstPercent: v.gstPercent !== undefined && v.gstPercent !== '' ? parseFloat(v.gstPercent) : gstPercentNum
          };
        });

      const cleanSubCategoryId = formData.subCategoryId && formData.subCategoryId !== '' && formData.subCategoryId !== 'null'
        ? formData.subCategoryId
        : null;

      const customUnitsToSave = Array.from(new Set(
        packagingOptions
          .filter(u => !DEFAULT_PACKAGING.includes(u) && u !== 'KG' && u !== 'LITRE' && u !== 'LTR')
          .concat(formData.unit && !DEFAULT_PACKAGING.includes(formData.unit) && formData.unit !== 'KG' && formData.unit !== 'LITRE' ? [formData.unit] : [])
      ));

      const customMeasToSave = Array.from(new Set(
        measurementOptions
          .filter(u => !DEFAULT_MEASUREMENTS.includes(u.toUpperCase()) && u.toUpperCase() !== 'BAG' && u.toUpperCase() !== 'BOX')
          .map(u => u.toUpperCase())
      ));

      await api.put(`/products/${id}`, {
        ...formData,
        unit: formData.unit ? formData.unit.toUpperCase() : 'BAG',
        packagingType: (formData.packagingType || formData.unit || 'BAG').toUpperCase(),
        measurementBasis: (formData.measurementBasis || formData.measurementUnit || 'KG').toUpperCase(),
        measurementUnit: (formData.measurementBasis || formData.measurementUnit || 'KG').toUpperCase(),
        priceBasis: 'per_unit',
        isPackagePrice: false,
        unitSize: parseFloat(formData.unitSize) || 1,
        customUnits: customUnitsToSave,
        customPackagingUnits: customUnitsToSave,
        customMeasurementUnits: customMeasToSave,
        subCategoryId: cleanSubCategoryId,
        sellerB2bPrice: sellerB2bVal,
        sellerPrice: sellerB2bVal,
        sellerPricePerBaseUnit: sellerB2bVal,
        sellerPricePerProductUnit: sellerB2bVal,
        sellerUnitPrice: sellerB2bVal,
        b2bPrice: sellerB2bVal,
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Base Price (₹) *</label>
                  <div style={{ position: 'relative' }}>
                    <IndianRupee size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input
                      type="number"
                      className="input-field"
                      style={{ paddingLeft: '42px' }}
                      placeholder="e.g. 50 (per base unit)"
                      value={formData.sellerB2bPrice}
                      onChange={e => setFormData({ ...formData, sellerB2bPrice: e.target.value })}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    Price per 1 {(formData.measurementUnit || 'kg').toUpperCase()}
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
                    style={{ height: '50px', cursor: 'pointer' }}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Measurement Basis * <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>(e.g. KG or LITRE)</span>
                  </label>
                  <select
                    className="input-field"
                    value={formData.measurementUnit || 'KG'}
                    onChange={e => {
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
                    style={{ height: '50px', cursor: 'pointer' }}
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
                      ₹{Number(formData.sellerB2bPrice || 0).toFixed(2)} / {(formData.unit || 'BAG').toUpperCase()}
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
                      const vPkgPrice = vSeller * vUnitSize;
                      const vGstRate = variant.gstPercent !== undefined && variant.gstPercent !== '' ? parseFloat(variant.gstPercent) : gstPercentNum;
                      const vTotalWithGst = vPkgPrice > 0 ? (vPkgPrice + (vPkgPrice * vGstRate) / 100) : 0;

                      return (
                        <div key={index} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '15px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1.2, minWidth: '100px' }}>
                              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-main)', marginBottom: '4px', fontWeight: 600 }}>Packaging Type *</label>
                              <select 
                                className="input-field" 
                                value={variant.packagingType || formData.unit || 'BAG'} 
                                onChange={(e) => handleB2bChange(index, 'packagingType', e.target.value)}
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
                                style={{ height: '48px' }}
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
                                style={{ height: '48px' }}
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <label style={{ display: 'block', fontSize: '11px', opacity: 0, marginBottom: '4px', pointerEvents: 'none', userSelect: 'none' }}>Action</label>
                              <button 
                                type="button" 
                                onClick={() => handleRemoveB2b(index)} 
                                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '12px', borderRadius: '12px', cursor: 'pointer', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Remove Variant"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </div>

                          {/* Variant Specification & Pricing Summary */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99, 102, 241, 0.05)', padding: '8px 12px', borderRadius: '8px', fontSize: '11.5px', flexWrap: 'wrap', gap: '8px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                              1 {vPkgType} = {vUnitSize} {vMeas}
                            </span>
                            <span style={{ color: '#22c55e', fontWeight: 700 }}>
                              Payout / {vPkgType}: ₹{vSeller.toFixed(2)}
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

export default EditProduct;
