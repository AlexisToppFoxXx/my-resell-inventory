import { useState, useEffect } from 'react';
import { collection, doc, setDoc, query, where, getDocs } from 'firebase/firestore';
// import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// import { getAuth } from 'firebase/auth';
import { jsPDF } from 'jspdf';
import { drawLabel, PAGE_SIZE, registerCaveatFont } from '../lib/qrTemplate';

function QuickAdd({ db, collectionPath, onComplete, setView }) {
  const [items, setItems] = useState(() => {
    // Try to restore from localStorage on mount
    const saved = localStorage.getItem('quickAddDraft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only restore if it has actual content (not just the initial blank item)
        const hasContent = parsed.some(item => 
          item.product.trim() || 
          item.description.trim() || 
          item.brand.trim() ||
          item.purchasePrice ||
          item.listingPrice
        );
        if (hasContent) {
          console.log('Restoring draft from localStorage');
          return parsed;
        } else {
          // Clear empty draft
          localStorage.removeItem('quickAddDraft');
        }
      } catch (e) {
        console.error('Failed to restore draft:', e);
        localStorage.removeItem('quickAddDraft');
      }
    }
    // Default initial state
    return [{
      id: crypto.randomUUID(),
      product: '',
      description: '',
      createdBy: '',
      locationType: 'unknown', // NEW
      location: '',
      brand: '',
      type: '',
      size: '',
      color: '',
      condition: 'New',
      purchasePrice: '',
      listingPrice: '',
      msrp: '',
      compEbayPrice: '',
      photosTaken: false,
      photoLink: '',
      notes: '',
      purchaseDate: '',
      length: '',
      width: '',
      height: '',
      weight: '',
      shippingCost: '',
      listDate: '',
      listingUrl: '',
      platform: '',
      soldDate: '',
      sellPrice: '',
      sellingFees: '',
      sellingNotes: '',
      category: 'Clothing',
      photoUrls: []
    }];
  });
  const [locations, setLocations] = useState([]); // NEW: Available locations
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState({});
  const [generatingQR, setGeneratingQR] = useState({}); // FIXED: This line was missing!

  // const storage = getStorage();
  // const auth = getAuth();

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

  // Auto-save to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('quickAddDraft', JSON.stringify(items));
  }, [items]);

  // Clear draft after successful save
  const clearDraft = () => {
    console.log('Clearing draft from localStorage');
    localStorage.removeItem('quickAddDraft');
  };

  const addBlankItem = () => {
    setItems([...items, {
      id: crypto.randomUUID(),
      product: '',
      description: '',
      createdBy: '',
      locationType: 'unknown', // NEW
      location: '',
      brand: '',
      type: '',
      size: '',
      color: '',
      condition: 'New',
      purchasePrice: '',
      listingPrice: '',
      msrp: '',
      compEbayPrice: '',
      photosTaken: false,
      photoLink: '',
      notes: '',
      purchaseDate: '',
      length: '',
      width: '',
      height: '',
      weight: '',
      shippingCost: '',
      listDate: '',
      listingUrl: '',
      platform: '',
      soldDate: '',
      sellPrice: '',
      sellingFees: '',
      sellingNotes: '', // NEW
      category: 'Clothing',
      photoUrls: []
    }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    // auto-calc selling fees if percentage provided and either sellPrice or autoFeePercent changed
    const item = newItems[index];
    const pct = parseFloat(item.autoFeePercent);
    if (!isNaN(pct) && pct > 0) {
      const sell = parseFloat(item.sellPrice) || 0;
      item.sellingFees = (sell * (pct / 100)).toFixed(2);
    }
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // REMOVE old photo upload handlers - not needed anymore
  // const handlePhotoUpload = async (index, e) => { ... }
  // const handleDownloadPhoto = async (photoUrl, productName, photoIndex) => { ... }
  // const handleDownloadAllPhotos = async (item) => { ... }

  const calculateProfit = (item) => {
    const sellPrice = parseFloat(item.sellPrice) || 0;
    const purchasePrice = parseFloat(item.purchasePrice) || 0;
    const sellingFees = parseFloat(item.sellingFees) || 0;
    const shipping = parseFloat(item.shippingCost) || 0;
    if (sellPrice === 0) return 0;
    return (sellPrice - purchasePrice - sellingFees - shipping);
  };

  const handleSaveAll = async () => {
    const itemsToSave = items.filter(item => item.product.trim());
    
    // Validate createdBy
    const missingCreator = itemsToSave.find(item => !item.createdBy);
    if (missingCreator) {
      alert('❌ Please select "Created By" for all items before saving.');
      return;
    }
    
    // NEW: Validate that Platform requires List Date
    const invalidPlatform = itemsToSave.find(item => item.platform.trim() && !item.listDate);
    if (invalidPlatform) {
      alert('❌ If you enter a "Platform", you must also set a "List Date".\n\nDon\'t fill in Platform until you\'ve actually listed the item!\n\nIf you haven\'t listed it yet, leave Platform blank and it will show in "Not Yet Listed" priority.');
      return;
    }
    
    // Validate that List Date requires Platform
    const invalidListing = itemsToSave.find(item => item.listDate && !item.platform.trim());
    if (invalidListing) {
      alert('❌ If you set a "List Date", you must also enter a "Platform" (e.g., eBay, Poshmark).\n\nList Date without Platform means the item isn\'t actually listed yet!');
      return;
    }
    
    setSaving(true);
    try {
      const savePromises = itemsToSave.map(item => {
        const productData = {
          itemType: 'inventory',
          product: item.product,
          description: item.description || '',
          createdBy: item.createdBy,
          locationType: item.locationType || 'unknown', // NEW
          location: item.location || '',
          brand: item.brand || '',
          type: item.type || '',
          size: item.size || '',
          color: item.color || '',
          condition: item.condition || '',
          purchasePrice: parseFloat(item.purchasePrice) || 0,
          length: parseFloat(item.length) || 0,
          width: parseFloat(item.width) || 0,
          height: parseFloat(item.height) || 0,
          weight: parseFloat(item.weight) || 0,
          shippingCost: parseFloat(item.shippingCost) || 0,
          listingPrice: parseFloat(item.listingPrice) || 0,
          msrp: parseFloat(item.msrp) || 0,
          compEbayPrice: parseFloat(item.compEbayPrice) || 0,
          photosTaken: item.photosTaken,
          photoLink: item.photoLink || '',
          notes: item.notes || '',
          purchaseDate: item.purchaseDate || '',
          listDate: item.listDate || '',
          listingUrl: item.listingUrl || '',
          platform: item.platform || '',
          soldDate: item.soldDate || '',
          sellPrice: parseFloat(item.sellPrice) || 0,
          sellingFees: parseFloat(item.sellingFees) || 0,
          sellingNotes: item.sellingNotes || '',
          category: item.category,
          qrCodeId: item.id,
          createdAt: new Date().toISOString(),
          quickImport: true,
          photoUrls: []
        };
        return setDoc(doc(db, collectionPath, item.id), productData);
      });
      
      await Promise.all(savePromises);
      
      // Clear draft
      clearDraft();
      
      // Reset items
      setItems([{
        id: crypto.randomUUID(),
        product: '',
        description: '',
        createdBy: '',
        locationType: 'unknown', // NEW
        location: '',
        brand: '',
        type: '',
        size: '',
        color: '',
        condition: 'New',
        purchasePrice: '',
        listingPrice: '',
        msrp: '',
        compEbayPrice: '',
        photosTaken: false,
        photoLink: '',
        notes: '',
        purchaseDate: '',
        listDate: '',
        listingUrl: '',
        platform: '',
        soldDate: '',
        sellPrice: '',
        sellingFees: '',
        sellingNotes: '',
        category: 'Clothing',
        photoUrls: []
      }]);
      
      console.log('[QuickAdd] Items saved successfully, navigating to list');
      
      // Show success
      alert(`✅ Saved ${savePromises.length} items!`);
      
      // Navigate to inventory list
      console.log('[QuickAdd] Calling setView(list)');
      setView('list');
      console.log('[QuickAdd] setView called');
      
    } catch (error) {
      console.error('Error saving items:', error);
      alert('Error saving items: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // NEW: Handle Cancel - also clear draft
  const handleCancel = () => {
    const hasContent = items.some(item => 
      item.product.trim() || 
      item.description.trim() || 
      item.brand.trim() ||
      item.purchasePrice ||
      item.listingPrice
    );
    
    if (hasContent) {
      const confirmCancel = confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmCancel) return;
    }
    
    clearDraft();
    onComplete();
  };

  const getShortId = (uuid) => {
    if (!uuid) return '';
    const parts = uuid.split('-');
    return parts[parts.length - 1].substring(0, 5).toUpperCase();
  };

  const generateQRLabel = async (item) => {
    const itemIndex = items.findIndex(i => i.id === item.id);
    setGeneratingQR(prev => ({ ...prev, [itemIndex]: true }));

    try {
      if (!window.QRCode) {
        alert('QR Code library is loading, please try again in a moment.');
        setGeneratingQR(prev => ({ ...prev, [itemIndex]: false }));
        return;
      }

      const qrUrl = `https://resell-inventory-flow.web.app/scan/${item.id}`;
      const shortId = getShortId(item.id);
      const productName = (item.product || '').trim();

      const dataUrl = await window.QRCode.toDataURL(qrUrl, {
        width: 600,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#FFFFFF' }
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PAGE_SIZE.width, PAGE_SIZE.height], compress: true });
      await registerCaveatFont(pdf);
      drawLabel(pdf, {
        design: 'product',
        qrDataUrl: dataUrl,
        shortId: `...${shortId}`,
        productName,
        pageWidth: PAGE_SIZE.width,
        pageHeight: PAGE_SIZE.height,
        branding: '4TL'
      });

      const fileName = `QR_${item.product || 'Item'}_${shortId}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Error generating QR label:', error);
      alert(`Error generating QR label: ${error.message}`);
    } finally {
      setGeneratingQR(prev => ({ ...prev, [itemIndex]: false }));
    }
  };

  // Load QR Code library on mount - FIX: Use useEffect instead of useState
  useEffect(() => {
    if (!window.QRCode) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="text-2xl font-bold mb-2">Quick Add - Batch Import</h2>
        <p className="text-gray-600 mb-4">
          Quickly add multiple items to inventory. Fill in what you know, leave the rest blank.
        </p>
        {/* NEW: Draft indicator */}
        {localStorage.getItem('quickAddDraft') && (
          <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm text-blue-800">
            💾 Draft auto-saved (safe to switch apps)
          </div>
        )}
      </div>

      <div className="space-y-4">
        {items.map((item, index) => {
          const profit = calculateProfit(item);
          const shortId = getShortId(item.id);
          
          return (
            <div key={item.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-lg font-semibold text-gray-700">Item #{index + 1}</span>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    SKU: {shortId} (Full ID: {item.id})
                  </p>
                </div>
                <div className="flex gap-2">
                  {/* Print QR Label Button */}
                  <button
                    onClick={() => generateQRLabel(item)}
                    disabled={generatingQR[index]}
                    className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
                    title="Print QR Label"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v4h8z" />
                    </svg>
                    {generatingQR[index] ? 'Generating...' : 'Print Label'}
                  </button>
                  
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Product Name - Required */}
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Nike Air Jordan 1"
                    value={item.product}
                    onChange={(e) => updateItem(index, 'product', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* NEW: Description - Below Product Name */}
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    placeholder="Brief description or key details about this item..."
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows="2"
                  />
                </div>

                {/* Created By Dropdown */}
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created By <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={item.createdBy}
                    onChange={(e) => updateItem(index, 'createdBy', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">-- Select Creator --</option>
                    <option value="Boss Doss">Boss Doss</option>
                    <option value="DJ Nipsey">DJ Nipsey</option>
                  </select>
                </div>

                {/* NEW: Location Type Dropdown */}
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Type
                  </label>
                  <select
                    value={item.locationType}
                    onChange={(e) => updateItem(index, 'locationType', e.target.value)}
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
                </div>

                {/* FIXED: Specific Storage Location - TEXT INPUT, not dropdown */}
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specific Storage Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Shelf A, Box 3, Bin 12, Garage North Wall"
                    value={item.location}
                    onChange={(e) => updateItem(index, 'location', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Optional: Free text - describe exactly where this item is stored
                  </p>
                </div>

                {/* Category Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={item.category}
                    onChange={(e) => updateItem(index, 'category', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Clothing">Clothing</option>
                    <option value="Shoes">Shoes</option>
                    <option value="Bags and Accessories">Bags and Accessories</option>
                    <option value="Tools/Home & Garden">Tools/Home & Garden</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Car Parts">Car Parts</option>
                  </select>
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g., Nike"
                    value={item.brand}
                    onChange={(e) => updateItem(index, 'brand', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <input
                    type="text"
                    placeholder="e.g., Sneakers"
                    value={item.type}
                    onChange={(e) => updateItem(index, 'type', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                  <input
                    type="text"
                    placeholder="e.g., M, L, 10.5"
                    value={item.size}
                    onChange={(e) => updateItem(index, 'size', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="text"
                    placeholder="e.g., Black, Red"
                    value={item.color}
                    onChange={(e) => updateItem(index, 'color', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                  <select
                    value={item.condition}
                    onChange={(e) => updateItem(index, 'condition', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="New">New</option>
                    <option value="Like New">Like New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                    <option value="Used - Open Box">Used - Open Box</option>
                    <option value="For Parts">For Parts</option>
                  </select>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-md font-semibold text-gray-800 mb-4">Pricing Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Purchase Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={item.purchasePrice}
                      onChange={(e) => updateItem(index, 'purchasePrice', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* MSRP */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">MSRP</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={item.msrp}
                      onChange={(e) => updateItem(index, 'msrp', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Comp eBay Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comp eBay Price</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={item.compEbayPrice}
                      onChange={(e) => updateItem(index, 'compEbayPrice', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Listing Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Listing Price</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={item.listingPrice}
                      onChange={(e) => updateItem(index, 'listingPrice', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Timeline & Listing Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-md font-semibold text-gray-800 mb-4">Timeline & Listing</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Purchase Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={item.purchaseDate}
                      onChange={(e) => updateItem(index, 'purchaseDate', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* List Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      List Date
                      {item.listDate && !item.platform.trim() && (
                        <span className="ml-2 text-red-600 text-xs">⚠️ Platform required!</span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={item.listDate}
                        onChange={(e) => updateItem(index, 'listDate', e.target.value)}
                        className={`flex-1 w-full border rounded-lg p-2 focus:outline-none focus:ring-2 ${
                          item.listDate && !item.platform.trim()
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-purple-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => updateItem(index, 'listDate', '')}
                        className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                        title="Clear List Date (mark as Not Yet Listed)"
                      >
                        Clear
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Leave blank for "Not Yet Listed"
                    </p>
                  </div>

                  {/* NEW: Listing URL */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Listing URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.ebay.com/itm/... or https://poshmark.com/..."
                      value={item.listingUrl}
                      onChange={(e) => updateItem(index, 'listingUrl', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Paste the direct link to your listing
                    </p>
                    {item.listingUrl && (
                      <a
                        href={item.listingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 underline mt-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4a2 2 0 00-2-2H10V8h4a2 2 0 002-2V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v4z" />
                        </svg>
                        View Listing
                      </a>
                    )}
                  </div>

                  {/* Platform - WITH NEW VALIDATION */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Platform
                      {item.listDate && !item.platform.trim() && (
                        <span className="ml-2 text-red-600 text-xs">* Required with List Date</span>
                      )}
                      {item.platform.trim() && !item.listDate && (
                        <span className="ml-2 text-red-600 text-xs">* Requires List Date!</span>
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., eBay, Poshmark, Facebook Marketplace"
                      value={item.platform}
                      onChange={(e) => updateItem(index, 'platform', e.target.value)}
                      className={`w-full border rounded-lg p-2 focus:outline-none focus:ring-2 ${
                        (item.listDate && !item.platform.trim()) || (item.platform.trim() && !item.listDate)
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-purple-500'
                      }`}
                    />
                    <p className="text-xs text-orange-600 mt-1 font-medium">
                      ⚠️ Only fill this in AFTER you've actually listed the item!
                    </p>
                  </div>
                </div>

                {/* NEW: Validation Warning Box - Updated */}
                {(item.listDate && !item.platform.trim()) || (item.platform.trim() && !item.listDate) ? (
                  <div className="mt-3 p-3 bg-red-50 border border-red-300 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>⚠️ Warning:</strong> List Date and Platform must be filled in together!
                      <br />
                      <strong>Please either:</strong>
                    </p>
                    <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
                      {item.platform.trim() && !item.listDate && (
                        <li><strong>Set the List Date</strong> to when you actually listed it</li>
                      )}
                      {item.listDate && !item.platform.trim() && (
                        <li><strong>Enter the platform</strong> where it's listed (e.g., "eBay", "Poshmark")</li>
                      )}
                      <li><strong>Or clear both fields</strong> if it's not listed yet (will show in "Not Yet Listed")</li>
                    </ul>
                  </div>
                ) : null}
              </div>

              {/* Dimensions & Shipping Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-md font-semibold text-gray-800 mb-4">Dimensions & Shipping</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Length</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="in"
                      value={item.length}
                      onChange={(e) => updateItem(index, 'length', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="in"
                      value={item.width}
                      onChange={(e) => updateItem(index, 'width', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="in"
                      value={item.height}
                      onChange={(e) => updateItem(index, 'height', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="lbs"
                      value={item.weight}
                      onChange={(e) => updateItem(index, 'weight', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={item.shippingCost}
                      onChange={(e) => updateItem(index, 'shippingCost', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sold Information Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-md font-semibold text-gray-800 mb-4">Sold Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Sold Date - WITH CLEAR BUTTON */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sold Date</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={item.soldDate}
                        onChange={(e) => updateItem(index, 'soldDate', e.target.value)}
                        className="flex-1 w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      {/* NEW: Clear button */}
                      <button
                        type="button"
                        onClick={() => updateItem(index, 'soldDate', '')}
                        className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                        title="Clear Sold Date"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Sell Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sell Price</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={item.sellPrice}
                      onChange={(e) => updateItem(index, 'sellPrice', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Selling Fees */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Selling Fees</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={item.sellingFees}
                      onChange={(e) => updateItem(index, 'sellingFees', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  {/* Auto fee % optional */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Auto Fee %</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 15"
                      value={item.autoFeePercent}
                      onChange={(e) => updateItem(index, 'autoFeePercent', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* NEW: Selling Notes - Full Width */}
                  <div className="col-span-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Selling Notes</label>
                    <input
                      type="text"
                      placeholder="e.g., Buyer name, shipping details, platform notes..."
                      value={item.sellingNotes}
                      onChange={(e) => updateItem(index, 'sellingNotes', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Calculated Profit */}
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <h5 className="text-lg font-semibold">
                    Calculated Profit:
                    <span className={`ml-2 ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${profit.toFixed(2)}
                    </span>
                  </h5>
                  <p className="text-xs text-gray-500 mt-1">(Sell Price - Purchase Price - Selling Fees - Shipping Cost)</p>
                </div>
              </div>

              {/* Photos Section - UPDATED */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-md font-semibold text-gray-800 mb-4">Product Photos</h4>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={item.photosTaken}
                      onChange={(e) => updateItem(index, 'photosTaken', e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <label className="text-sm text-gray-700">Photos Taken</label>
                  </div>
                  
                  {/* NEW: Photo Link Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Photo Link (Google Drive, iCloud, Dropbox, etc.)
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/... or https://www.icloud.com/..."
                      value={item.photoLink}
                      onChange={(e) => updateItem(index, 'photoLink', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Tip: Upload photos to Google Drive or iCloud, make the folder shareable, and paste the link here
                    </p>
                  </div>
                  
                  {/* Show clickable link if provided */}
                  {item.photoLink && (
                    <a
                      href={item.photoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 underline"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4a2 2 0 00-2-2H10V8h4a2 2 0 002-2V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v4z" />
                      </svg>
                      View Photos
                    </a>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  placeholder="Additional notes..."
                  value={item.notes}
                  onChange={(e) => updateItem(index, 'notes', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows="3"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={addBlankItem}
          className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium transition-colors"
        >
          + Add Another Item
        </button>
        <button
          onClick={handleSaveAll}
          disabled={saving || !items.some(item => item.product.trim())}
          className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium transition-colors"
        >
          {saving ? 'Saving...' : `Save All (${items.filter(i => i.product.trim()).length})`}
        </button>
        <button
          onClick={handleCancel}
          className="px-8 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default QuickAdd;