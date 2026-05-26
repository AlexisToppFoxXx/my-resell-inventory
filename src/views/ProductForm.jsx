// src/views/ProductForm.js
import React, { useState, useEffect, memo } from 'react';
import { doc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { jsPDF } from 'jspdf';
import { APP_CONFIG } from '../config';
import { drawLabel, PAGE_SIZE, registerCaveatFont } from '../lib/qrTemplate';

const ProductForm = memo(({ db, collectionPath, currentProduct, currentQrCodeId, setView, setGlobalError }) => {
  const [formData, setFormData] = useState({
    itemType: 'inventory', // NEW: Default to inventory
    product: '',
    description: '',
    createdBy: '',
    locationType: 'unknown',
    location: '',
    brand: '',
    type: '',
    size: '',
    color: '',
    condition: '',
    purchasePrice: '',
    listingPrice: '',
    photosTaken: false,
    photoLink: '',
    notes: '',
    purchaseDate: '',
    length: '',
    width: '',
    height: '',
    weight: '',
    shippingCost: '',
    autoFeePercent: '',
    listDate: '',
    listingUrl: '', // NEW
    platform: '',
    soldDate: '',
    sellPrice: '',
    sellingFees: '',
    sellingNotes: '', // NEW: Notes about sale
    category: 'Clothing',
    externalSKU: '', // NEW: Store external SKU
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [locations, setLocations] = useState([]); // NEW: Available locations
  const [generatingQR, setGeneratingQR] = useState(false); // ADD THIS
  const storage = getStorage();
  const auth = getAuth();

  // NEW: Load available locations
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const q = query(collection(db, collectionPath), where('itemType', '==', 'location'));
        const snapshot = await getDocs(q);
        const locs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLocations(locs);
      } catch (err) {
        console.error('Error loading locations:', err);
      }
    };
    loadLocations();
  }, [db, collectionPath]);

  useEffect(() => {
    console.log('[ProductForm] useEffect triggered - currentProduct:', currentProduct, 'currentQrCodeId:', currentQrCodeId);
    
    if (currentProduct) {
      console.log('[ProductForm] Loading existing product data');
      setFormData({
        itemType: currentProduct.itemType || 'inventory', // Load existing or default
        product: currentProduct.product || '',
        description: currentProduct.description || '',
        createdBy: currentProduct.createdBy || '',
        locationType: currentProduct.locationType || 'unknown',
        location: currentProduct.location || '',
        brand: currentProduct.brand || '', 
        type: currentProduct.type || '',
        size: currentProduct.size || '', color: currentProduct.color || '',
        condition: currentProduct.condition || '', notes: currentProduct.notes || '',
        purchasePrice: currentProduct.purchasePrice || '', listingPrice: currentProduct.listingPrice || '',
        photosTaken: currentProduct.photosTaken || false, purchaseDate: currentProduct.purchaseDate || '',
        length: currentProduct.length || '',
        width: currentProduct.width || '',
        height: currentProduct.height || '',
        weight: currentProduct.weight || '',
        shippingCost: currentProduct.shippingCost || '',
        autoFeePercent: currentProduct.autoFeePercent || '',
        listDate: currentProduct.listDate || '',
        listingUrl: currentProduct.listingUrl || '', // NEW: Load URL
        platform: currentProduct.platform || '',
        soldDate: currentProduct.soldDate || '', // FIX: Don't auto-fill, keep exactly what's in DB
        sellPrice: currentProduct.sellPrice || '',
        sellingFees: currentProduct.sellingFees || '',
        sellingNotes: currentProduct.sellingNotes || '', // NEW: Load selling notes
        category: currentProduct.category || 'Clothing',
        externalSKU: currentProduct.externalSKU || '', // NEW: Load external SKU
      });
    } else {
      // New product
      const autoSku = currentQrCodeId ? currentQrCodeId.slice(-4).toUpperCase() : '';
      console.log('[ProductForm] New product - Auto-filling SKU:', autoSku, 'from QR ID:', currentQrCodeId);
      setFormData({
        itemType: 'inventory', // NEW: Default to inventory
        product: '',
        description: '',
        createdBy: '',
        location: '',
        brand: '', 
        type: '', size: '', color: '', condition: '', notes: '',
        purchasePrice: '', listingPrice: '', photosTaken: false,
        purchaseDate: '', listDate: '', platform: '',
        soldDate: '', sellPrice: '', sellingFees: '',
        sellingNotes: '', // NEW
        category: 'Clothing',
      });
    }
  }, [currentProduct, currentQrCodeId]);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhotos(true);
    const userId = auth.currentUser?.uid;
    
    try {
      const uploadPromises = files.map(async (file) => {
        const fileName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `users/${userId}/products/${currentQrCodeId}/${fileName}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        return url;
      });

      const newPhotoUrls = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        photoUrls: [...prev.photoUrls, ...newPhotoUrls],
        photosTaken: true
      }));
    } catch (err) {
      console.error('Photo upload error:', err);
      setGlobalError(`Error uploading photos: ${err.message}`);
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleDeletePhoto = async (photoUrl, index) => {
    try {
      // Extract the file path from the URL
      const userId = auth.currentUser?.uid;
      const fileName = photoUrl.split(`${currentQrCodeId}%2F`)[1]?.split('?')[0];
      if (fileName) {
        const storageRef = ref(storage, `users/${userId}/products/${currentQrCodeId}/${decodeURIComponent(fileName)}`);
        await deleteObject(storageRef);
      }
      
      setFormData(prev => ({
        ...prev,
        photoUrls: prev.photoUrls.filter((_, i) => i !== index)
      }));
    } catch (err) {
      console.error('Error deleting photo:', err);
      setGlobalError(`Error deleting photo: ${err.message}`);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      let updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      // optional auto-fee calculation
      const pct = parseFloat(updated.autoFeePercent);
      if (!isNaN(pct) && pct > 0) {
        const sell = parseFloat(updated.sellPrice) || 0;
        updated.sellingFees = (sell * (pct / 100)).toFixed(2);
      }
      return updated;
    });
  };

  const profit = (() => {
    const sellPrice = parseFloat(formData.sellPrice) || 0;
    const purchasePrice = parseFloat(formData.purchasePrice) || 0;
    const sellingFees = parseFloat(formData.sellingFees) || 0;
    if (sellPrice === 0) return 0;
    return (sellPrice - purchasePrice - sellingFees);
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.product.trim()) {
      alert('Please enter a product name');
      return;
    }
    
    if (!formData.createdBy) {
      alert('Please select who created this item');
      return;
    }

    // NEW: Validate that Platform requires List Date
    if (formData.platform.trim() && !formData.listDate) {
      alert('❌ If you enter a "Platform", you must also set a "List Date".\n\nDon\'t fill in Platform until you\'ve actually listed the item!\n\nIf you haven\'t listed it yet, leave Platform blank and it will show in "Not Yet Listed" priority.');
      return;
    }

    // Existing: List Date requires Platform
    if (formData.listDate && !formData.platform.trim()) {
      alert('❌ If you set a "List Date", you must also enter a "Platform" (e.g., eBay, Poshmark).\n\nList Date without Platform means the item isn\'t actually listed yet!');
      return;
    }

    setIsSaving(true);

    const productData = {
      itemType: formData.itemType, // NEW: Save itemType
      product: formData.product,
      description: formData.description || '',
      createdBy: formData.createdBy || '',
      locationType: formData.locationType || 'unknown',
      location: formData.location || '',
      brand: formData.brand || '', 
      type: formData.type || '',
      size: formData.size || '', color: formData.color || '',
      condition: formData.condition || '', notes: formData.notes || '',
      purchasePrice: parseFloat(formData.purchasePrice) || 0,
      length: parseFloat(formData.length) || 0,
      width: parseFloat(formData.width) || 0,
      height: parseFloat(formData.height) || 0,
      weight: parseFloat(formData.weight) || 0,
      shippingCost: parseFloat(formData.shippingCost) || 0,
      sellingNotes: formData.sellingNotes || '',
    };

    try {
      const docRef = doc(db, collectionPath, currentQrCodeId);
      await setDoc(docRef, productData, { merge: true });

      // NEW: Create reference document for external SKU
      if (formData.externalSKU && formData.externalSKU.trim()) {
        const sanitizedSKU = formData.externalSKU.replace(/[^a-zA-Z0-9-_]/g, '_');
        const externalRef = {
          redirectTo: currentQrCodeId,
          isExternalSKU: true,
          originalSKU: formData.externalSKU,
          itemType: formData.itemType,
          createdAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, collectionPath, sanitizedSKU), externalRef);
        console.log(`[ProductForm] Created external SKU reference: ${sanitizedSKU} -> ${currentQrCodeId}`);
      }

      alert('✅ Product saved successfully!'); // ADD CONFIRMATION
      setView('list');
    } catch (err) {
      console.error("Error saving product:", err);
      setGlobalError(`Error saving product: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isDeleting) {
      setGlobalError("Press delete again to confirm. This action cannot be undone.");
      setIsDeleting(true);
      setTimeout(() => setIsDeleting(false), 3000);
      return;
    }

    try {
      const docRef = doc(db, collectionPath, currentQrCodeId);
      await deleteDoc(docRef);
      setView('list');
    } catch (err) {
      console.error("Error deleting product:", err);
      setGlobalError(`Error deleting product: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Load QR Code library
  useEffect(() => {
    if (!window.QRCode) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const getShortId = (uuid) => {
    if (!uuid) return '';
    const parts = uuid.split('-');
    return parts[parts.length - 1].substring(0, 5).toUpperCase();
  };

  const generateQRLabel = async () => {
    setGeneratingQR(true);

    try {
      if (!window.QRCode) {
        alert('QR Code library is loading, please try again.');
        setGeneratingQR(false);
        return;
      }

      // Use external SKU if available, otherwise use our UUID
      const displaySKU = formData.externalSKU || currentQrCodeId;
      const qrUrl = `https://resell-inventory-flow.web.app/scan/${displaySKU}`;
      
      // FIXED: Get LAST 10 characters instead of first 10
      const shortId = formData.externalSKU 
        ? formData.externalSKU.slice(-10).toUpperCase() // Last 10 chars
        : getShortId(currentQrCodeId);
      
      const productName = (formData.product || '').trim();

      // Generate QR code
      const dataUrl = await window.QRCode.toDataURL(qrUrl, {
        width: 600,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#FFFFFF' }
      });

      // Use shared helper for consistent rotated label size
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PAGE_SIZE.width, PAGE_SIZE.height], compress: true });
      await registerCaveatFont(pdf);
      const productQrDataUrl = await window.QRCode.toDataURL(qrUrl, { width: 600, margin: 1, errorCorrectionLevel: 'M' });
      drawLabel(pdf, {
        design: 'product',
        qrDataUrl: productQrDataUrl,
        shortId: `...${shortId}`,
        productName: productName,
        pageWidth: PAGE_SIZE.width,
        pageHeight: PAGE_SIZE.height,
        branding: '4TL'
      });

      const fileName = `QR_${formData.product || 'Item'}_${shortId}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Error generating QR label:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setGeneratingQR(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header with SKU display */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold">
              {currentProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            
            {/* Show External SKU if it exists (Vista Auction, etc.) */}
            {formData.externalSKU && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm font-medium text-blue-900">
                  External SKU: <span className="font-mono text-lg">{formData.externalSKU}</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  📦 Vista Auction or external QR code
                </p>
              </div>
            )}
            
            {/* Show our internal SKU */}
            {currentQrCodeId && (
              <p className="text-sm text-gray-500 mt-2 font-mono">
                Internal ID: {getShortId(currentQrCodeId)} 
                <span className="text-xs text-gray-400 ml-2">(for our tracking)</span>
              </p>
            )}
          </div>
          
          {/* Print QR Button */}
          <button
            onClick={generateQRLabel}
            disabled={generatingQR}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors flex items-center gap-2 font-semibold shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v4h8z" />
            </svg>
            {generatingQR ? 'Generating...' : 'PRINT QR'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900">
              {currentProduct ? "Edit Product" : "New Product"}
            </h3>
            <p className="text-sm text-gray-500 font-mono">QR ID: {currentQrCodeId}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
            {/* NEW: Item Type Dropdown - FIRST FIELD */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.itemType}
                onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg font-medium"
                required
              >
                <option value="inventory">📦 Inventory (Item to resell)</option>
                <option value="expense">💵 Expense (Business cost)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                💡 Choose "Inventory" for items you plan to sell, "Expense" for business costs
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.product}
                onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Nike Air Jordan 1"
                required
              />
            </div>

            {/* NEW: Location Type Dropdown */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Type
              </label>
              <select
                value={formData.locationType}
                onChange={(e) => setFormData({ ...formData, locationType: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="unknown">Unknown</option>
                <option value="outside">Outside</option>
                <option value="upstairs">Upstairs</option>
                <option value="living-room">Living Room</option>
                <option value="dining-room">Dining Room</option>
                <option value="den">Den</option>
                <option value="sold">Sold</option>
                <option value="decided-to-keep">Decided to Keep</option>
                <option value="trash-broken">Trash/Broken</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                💡 General area where this item is stored
              </p>
            </div>

            {/* Specific Location (from Locations tab) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specific Storage Location
              </label>
              <input
                type="text"
                placeholder="e.g., Shelf A, Box 3, Bin 12, Garage North Wall"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Optional: Free text - describe exactly where this item is stored
              </p>
            </div>

            {/* NEW: Description - Below Product Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Brief description or key details about this item..."
                rows="2"
              />
            </div>

            {/* Dimensions & weight */}
            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Length</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.length}
                  name="length"
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="inches"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.width}
                  name="width"
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="inches"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.height}
                  name="height"
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="inches"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  name="weight"
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="lbs"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Cost</label>
              <input
                type="number"
                step="0.01"
                value={formData.shippingCost}
                name="shippingCost"
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0.00"
              />
            </div>
            {/* Optional automatic fees */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Auto Fee % (optional)</label>
              <input
                type="number"
                step="0.01"
                value={formData.autoFeePercent}
                name="autoFeePercent"
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., 15 for 15%"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a percentage to automatically calculate selling fees from the sell price.
              </p>
            </div>

            {/* Created By Dropdown */}
            <div>
              <label htmlFor="createdBy" className="block text-sm font-medium text-gray-700">Created By</label>
              <select
                id="createdBy"
                name="createdBy"
                value={formData.createdBy}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">-- Select Creator --</option>
                <option value="Boss Doss">Boss Doss</option>
                <option value="DJ Nipsey">DJ Nipsey</option>
              </select>
            </div>
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700">Brand</label>
              <input
                type="text"
                name="brand"
                id="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g., Nike"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type</label>
              <input
                type="text"
                name="type"
                id="type"
                value={formData.type}
                onChange={handleChange}
                placeholder="e.g., Sneakers"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="size" className="block text-sm font-medium text-gray-700">Size</label>
              <input
                type="text"
                name="size"
                id="size"
                value={formData.size}
                onChange={handleChange}
                placeholder="e.g., 10.5"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-700">Color</label>
              <input
                type="text"
                name="color"
                id="color"
                value={formData.color}
                onChange={handleChange}
                placeholder="e.g., Red"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="condition" className="block text-sm font-medium text-gray-700">Condition</label>
              <select 
                id="condition" 
                name="condition" 
                value={formData.condition} 
                onChange={handleChange} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option>New</option>
                <option>Used - Open Box</option>
                <option>For Parts</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="photosTaken"
                id="photosTaken"
                checked={formData.photosTaken}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="photosTaken" className="ml-2 block text-sm font-medium text-gray-900">
                Photos Taken?
              </label>
            </div>
            
            {/* Photos Section - UPDATED */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.photosTaken}
                  onChange={(e) => setFormData({ ...formData, photosTaken: e.target.checked })}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Photos Taken</span>
              </label>
            </div>

            {/* NEW: Photo Link Input */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Photo Link (Google Drive, iCloud, Dropbox, etc.)
              </label>
              <input
                type="url"
                value={formData.photoLink}
                onChange={(e) => setFormData({ ...formData, photoLink: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="https://drive.google.com/... or https://www.icloud.com/..."
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Upload photos to Google Drive or iCloud, make shareable, and paste the link
              </p>
              {formData.photoLink && (
                <a
                  href={formData.photoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 underline mt-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v4h8z" />
                  </svg>
                  View Photos
                </a>
              )}
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                name="notes"
                id="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder="Any additional information about the product"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
            <h4 className="text-md font-semibold text-gray-800">Pricing</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700">Purchase Price</label>
                <input
                  type="number"
                  name="purchasePrice"
                  id="purchasePrice"
                  value={formData.purchasePrice}
                  onChange={handleChange}
                  step="0.01"
                  placeholder="10.00"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="listingPrice" className="block text-sm font-medium text-gray-700">Listing Price</label>
                <input
                  type="number"
                  name="listingPrice"
                  id="listingPrice"
                  value={formData.listingPrice}
                  onChange={handleChange}
                  step="0.01"
                  placeholder="15.00"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
            <h4 className="text-md font-semibold text-gray-800">Timeline & Listing</h4>
            <div>
              <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700">Purchase Date</label>
              <input
                type="date"
                name="purchaseDate"
                id="purchaseDate"
                value={formData.purchaseDate}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="listDate" className="block text-sm font-medium text-gray-700 mb-1">
                List Date
                {formData.listDate && !formData.platform.trim() && (
                  <span className="ml-2 text-red-600 text-xs">⚠️ Platform required!</span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={formData.listDate}
                  onChange={(e) => setFormData({ ...formData, listDate: e.target.value })}
                  className={`flex-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    formData.listDate && !formData.platform.trim()
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-purple-500'
                  }`}
                />
                {/* NEW: Clear / Not Yet Listed button */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, listDate: '' })}
                  className="px-3 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300"
                  title="Clear List Date (mark as Not Yet Listed)"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* NEW: Listing URL - Full Width */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Listing URL
              </label>
              <input
                type="url"
                value={formData.listingUrl}
                onChange={(e) => setFormData({ ...formData, listingUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="https://www.ebay.com/itm/... or https://poshmark.com/..."
              />
              {formData.listingUrl && (
                <a
                  href={formData.listingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 underline mt-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v4h8z" />
                </svg>
                View Listing
              </a>
              )}
            </div>

            <div>
              <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-1">
                Platform Listed On
                {formData.platform.trim() && !formData.listDate && (
                  <span className="ml-2 text-red-600 text-xs">* Requires List Date!</span>
                )}
              </label>
              <input
                type="text"
                name="platform"
                id="platform"
                value={formData.platform}
                onChange={handleChange}
                placeholder="e.g., eBay, Poshmark"
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                  formData.platform.trim() && !formData.listDate
                    ? 'border-red-500 focus:ring-red-500'
                    : ''
                }`}
              />
              <p className="text-xs text-orange-600 mt-1 font-medium">
                ⚠️ Only fill this in AFTER you've actually listed the item!
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
            <h4 className="text-md font-semibold text-gray-800">Sold Information</h4>
            <div className="md:col-span-2 border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Sold Information</h3>
              <div className="grid grid-cols-1 gap-4">
                {/* Sold Date - FULL WIDTH WITH CLEAR BUTTON */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sold Date</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={formData.soldDate}
                      onChange={(e) => setFormData({ ...formData, soldDate: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, soldDate: '' })}
                      className="px-4 py-2 bg-orange-500 text-white rounded-md text-sm hover:bg-orange-600 font-medium whitespace-nowrap"
                      title="Clear Sold Date (move back to Active Inventory)"
                    >
                      Clear Date
                    </button>
                  </div>
                  <p className="text-xs text-orange-600 mt-1 font-medium">
                    💡 Clear this date to move item back to Active Inventory
                  </p>
                </div>

                {/* Sell Price and Selling Fees - SIDE BY SIDE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sell Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.sellPrice}
                      onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Selling Fees</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.sellingFees}
                      onChange={(e) => setFormData({ ...formData, sellingFees: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Selling Notes - Full Width */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Notes</label>
                  <input
                    type="text"
                    value={formData.sellingNotes}
                    onChange={(e) => setFormData({ ...formData, sellingNotes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Buyer: John Doe, Shipped via USPS, Tracking: 123456"
                  />
                </div>
              </div>

              {/* Profit Display */}
              <div className="pt-4 border-t border-gray-200">
                <h5 className="text-lg font-semibold">Calculated Profit:
                  <span className={`ml-2 ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${profit.toFixed(2)}
                  </span>
                </h5>
                <p className="text-xs text-gray-500">(Sell Price - Purchase Price - Selling Fees)</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex-1 justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Product'}
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className="w-full sm:w-auto py-3 px-4 rounded-lg text-base font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>

          {currentProduct && (
            <div className="pt-4 border-t border-dashed border-gray-300">
              <button
                type="button"
                onClick={handleDelete}
                className={`w-full text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50 ${isDeleting ? 'animate-pulse' : ''}`}
              >
                {isDeleting ? 'Click Again to Confirm Delete' : 'Delete This Item'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
});

ProductForm.displayName = 'ProductForm';

export default ProductForm;
