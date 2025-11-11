// src/views/ProductForm.js
import React, { useState, useEffect, memo } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const ProductForm = memo(({ db, collectionPath, currentProduct, currentQrCodeId, setView, setGlobalError }) => {
  const [formData, setFormData] = useState({
    productName: '', sku: '', purchasePrice: '', msrp: '',
    compEbayPrice: '', condition: 'New', photosTaken: false,
    purchaseDate: '', listDate: '', platform: '',
    soldDate: '', sellPrice: '', sellingFees: '',
    photoUrls: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const storage = getStorage();
  const auth = getAuth();

  useEffect(() => {
    console.log('[ProductForm] useEffect triggered - currentProduct:', currentProduct, 'currentQrCodeId:', currentQrCodeId);
    
    if (currentProduct) {
      console.log('[ProductForm] Loading existing product data');
      setFormData({
        productName: currentProduct.productName || '', sku: currentProduct.sku || '',
        purchasePrice: currentProduct.purchasePrice || '', msrp: currentProduct.msrp || '',
        compEbayPrice: currentProduct.compEbayPrice || '', condition: currentProduct.condition || 'New',
        photosTaken: currentProduct.photosTaken || false, purchaseDate: currentProduct.purchaseDate || '',
        listDate: currentProduct.listDate || '', platform: currentProduct.platform || '',
        soldDate: currentProduct.soldDate || '', sellPrice: currentProduct.sellPrice || '',
        sellingFees: currentProduct.sellingFees || '',
        photoUrls: currentProduct.photoUrls || [],
      });
    } else {
      // New product - auto-fill SKU with last 4 characters of QR code ID
      const autoSku = currentQrCodeId ? currentQrCodeId.slice(-4).toUpperCase() : '';
      console.log('[ProductForm] New product - Auto-filling SKU:', autoSku, 'from QR ID:', currentQrCodeId);
      setFormData({
        productName: '', sku: autoSku, purchasePrice: '', msrp: '',
        compEbayPrice: '', condition: 'New', photosTaken: false,
        purchaseDate: '', listDate: '', platform: '',
        soldDate: '', sellPrice: '', sellingFees: '',
        photoUrls: [],
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
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
    if (!currentQrCodeId) {
      setGlobalError("No QR Code ID is associated with this item. Cannot save.");
      return;
    }
    setIsSaving(true);

    const productData = {
      ...formData,
      qrCodeId: currentQrCodeId,
      purchasePrice: parseFloat(formData.purchasePrice) || 0,
      msrp: parseFloat(formData.msrp) || 0,
      compEbayPrice: parseFloat(formData.compEbayPrice) || 0,
      sellPrice: parseFloat(formData.sellPrice) || 0,
      sellingFees: parseFloat(formData.sellingFees) || 0,
    };

    try {
      const docRef = doc(db, collectionPath, currentQrCodeId);
      await setDoc(docRef, productData, { merge: true });
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

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900">
          {currentProduct ? "Edit Product" : "New Product"}
        </h3>
        <p className="text-sm text-gray-500 font-mono">QR ID: {currentQrCodeId}</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
        <div>
          <label htmlFor="productName" className="block text-sm font-medium text-gray-700">Product Name</label>
          <input
            type="text"
            name="productName"
            id="productName"
            value={formData.productName}
            onChange={handleChange}
            placeholder="e.g., Vintage Sony Walkman"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-gray-700">Custom SKU</label>
          <input
            type="text"
            name="sku"
            id="sku"
            value={formData.sku}
            onChange={handleChange}
            placeholder="e.g., SW-001"
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
        
        {/* Photo Upload Section */}
        <div className="mt-4 space-y-3">
          <h5 className="text-sm font-semibold text-gray-800">Product Photos</h5>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              disabled={uploadingPhotos}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100
                disabled:opacity-50"
            />
          </div>
          {uploadingPhotos && <p className="text-sm text-indigo-600">Uploading photos...</p>}
          
          {/* Display uploaded photos */}
          {formData.photoUrls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {formData.photoUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Product ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(url, index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
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
            <label htmlFor="msrp" className="block text-sm font-medium text-gray-700">MSRP</label>
            <input
              type="number"
              name="msrp"
              id="msrp"
              value={formData.msrp}
              onChange={handleChange}
              step="0.01"
              placeholder="99.99"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="compEbayPrice" className="block text-sm font-medium text-gray-700">Comp eBay Price</label>
            <input
              type="number"
              name="compEbayPrice"
              id="compEbayPrice"
              value={formData.compEbayPrice}
              onChange={handleChange}
              step="0.01"
              placeholder="45.00"
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
          <label htmlFor="listDate" className="block text-sm font-medium text-gray-700">List Date</label>
          <input
            type="date"
            name="listDate"
            id="listDate"
            value={formData.listDate}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="platform" className="block text-sm font-medium text-gray-700">Platform Listed On</label>
          <input
            type="text"
            name="platform"
            id="platform"
            value={formData.platform}
            onChange={handleChange}
            placeholder="e.g., eBay, Poshmark"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
        <h4 className="text-md font-semibold text-gray-800">Sold Information</h4>
        <div>
          <label htmlFor="soldDate" className="block text-sm font-medium text-gray-700">Sold Date</label>
          <input
            type="date"
            name="soldDate"
            id="soldDate"
            value={formData.soldDate}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="sellPrice" className="block text-sm font-medium text-gray-700">Sell Price</label>
            <input
              type="number"
              name="sellPrice"
              id="sellPrice"
              value={formData.sellPrice}
              onChange={handleChange}
              step="0.01"
              placeholder="40.00"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="sellingFees" className="block text-sm font-medium text-gray-700">Selling Fees</label>
            <input
              type="number"
              name="sellingFees"
              id="sellingFees"
              value={formData.sellingFees}
              onChange={handleChange}
              step="0.01"
              placeholder="5.20"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        <div className="pt-4 border-t border-gray-200">
          <h5 className="text-lg font-semibold">Calculated Profit:
            <span className={`ml-2 ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${profit.toFixed(2)}
            </span>
          </h5>
          <p className="text-xs text-gray-500">(Sell Price - Purchase Price - Selling Fees)</p>
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
  );
});

ProductForm.displayName = 'ProductForm';

export default ProductForm;
