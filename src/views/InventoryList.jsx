// src/views/QrGenerator.jsx
import React, { useState, useEffect } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import InventoryStats from '../components/InventoryStats';
import { APP_CONFIG } from '../config';

const InventoryList = ({ inventory, setView, setCurrentProduct, setCurrentQrCodeId, db, collectionPath, setGlobalError }) => {
  const [expandedItem, setExpandedItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false); // NEW: Track printing state
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  
  // NEW: Filter states
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterCreator, setFilterCreator] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // all, available, sold
  const [filterListing, setFilterListing] = useState(''); // '', 'listed', 'notListed'
  const [filterPhotoStatus, setFilterPhotoStatus] = useState(''); // '', 'needs', 'has'
  const [filterNeedsDimensions, setFilterNeedsDimensions] = useState(false);
  const [generatingQR, setGeneratingQR] = useState({}); // ADD THIS LINE - was missing!
  const [showNotYetListed, setShowNotYetListed] = useState(true); // keep top-priority not-listed section
  const [showNeedsAttention, setShowNeedsAttention] = useState(true); // keep needs-attention toggle
  const [downloadFormat, setDownloadFormat] = useState('csv'); // NEW: Track download format
  const [searchError, setSearchError] = useState(null); // NEW: Track search errors
  const [downloadingPhoto, setDownloadingPhoto] = useState(null); // NEW: Track photo downloads

  const handleStatClick = (stat) => {
    // reset all existing filters first
    clearFilters();
    switch (stat) {
      case 'total':
        // already cleared
        break;
      case 'listed':
        setFilterListing('listed');
        setFilterStatus('available');
        break;
      case 'sold':
        setFilterStatus('sold');
        break;
      case 'needsPhotos':
        setFilterPhotoStatus('needs');
        break;
      case 'hasPhotos':
        setFilterPhotoStatus('has');
        break;
      case 'notListed':
        setFilterListing('notListed');
        setFilterStatus('available');
        break;
      case 'ebay':
        setFilterPlatform('eBay');
        setFilterStatus('available');
        break;
      case 'facebook':
        setFilterPlatform('Facebook');
        setFilterStatus('available');
        break;
      case 'needsDimensions':
        setFilterNeedsDimensions(true);
        setFilterStatus('available');
        break;
      default:
        break;
    }
  };

  // NEW: Items that are NOT LISTED (most important - top section)
  const notYetListedItems = inventory.filter(item => {
    return !item.listDate && !item.platform;
  });

  // Items that need attention (but ARE listed)
  const needsAttentionItems = inventory.filter(item => {
    // Don't include items that aren't listed (they're in the section above)
    if (!item.listDate && !item.platform) return false;
    
    // Only flag for missing photos or price
    const noPhotos = !item.photosTaken && !item.photoLink;
    const noPrice = !item.listingPrice || item.listingPrice === 0;
    return noPhotos || noPrice;
  });

  const getAttentionReasons = (item) => {
    const reasons = [];
    if (!item.photosTaken && !item.photoLink) reasons.push('No Photos');
    if (!item.listingPrice || item.listingPrice === 0) reasons.push('No Price');
    return reasons.join(' • ');
  };

  const calculateProfit = (item) => {
    const sellPrice = parseFloat(item.sellPrice) || 0;
    const purchasePrice = parseFloat(item.purchasePrice) || 0;
    const sellingFees = parseFloat(item.sellingFees) || 0;
    const shipping = parseFloat(item.shippingCost) || 0;
    if (sellPrice === 0) return null; // Not sold yet
    return (sellPrice - purchasePrice - sellingFees - shipping).toFixed(2);
  };

  const getConditionClass = (condition) => {
    switch (condition) {
      case 'New': return 'bg-green-100 text-green-800';
      case 'Used - Open Box': return 'bg-yellow-100 text-yellow-800';
      case 'For Parts': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEdit = (product) => {
    console.log('[InventoryList] Edit clicked for product:', product);
    setCurrentProduct(product);
    // FIX: Use product.qrCodeId OR product.id as fallback
    setCurrentQrCodeId(product.qrCodeId || product.id);
    setView('form');
  };

  const toggleExpand = (productId) => {
    setExpandedItem(expandedItem === productId ? null : productId);
  };

  const toggleSelectItem = (productId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === inventory.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(inventory.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedItems.size} item(s)? This cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedItems).map(productId => 
        deleteDoc(doc(db, collectionPath, productId))
      );
      
      await Promise.all(deletePromises);
      setSelectedItems(new Set());
      setGlobalError(`Successfully deleted ${deletePromises.length} item(s)`);
    } catch (error) {
      console.error('[InventoryList] Bulk delete error:', error);
      setGlobalError(`Error deleting items: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadPhoto = async (photoUrl, productName, photoIndex) => {
    setDownloadingPhoto(`${productName}-${photoIndex}`);
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${productName || 'product'}_photo_${photoIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading photo:', error);
      alert('Failed to download photo. Please try again.');
    } finally {
      setDownloadingPhoto(null);
    }
  };

  const handleDownloadAllPhotos = async (product) => {
    if (!product.photoUrls || product.photoUrls.length === 0) {
      alert('No photos to download');
      return;
    }

    alert(`Downloading ${product.photoUrls.length} photo(s)...`);
    
    for (let i = 0; i < product.photoUrls.length; i++) {
      await handleDownloadPhoto(product.photoUrls[i], product.product, i);
      // Add delay between downloads to avoid browser blocking
      if (i < product.photoUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  // Helper function to get short SKU from UUID - MOVED BEFORE filteredProducts to avoid hoisting issues
  const getShortId = (uuid) => {
    if (!uuid) return 'N/A';
    try {
      const parts = uuid.split('-');
      return parts[parts.length - 1].substring(0, 5).toUpperCase();
    } catch (error) {
      console.error('Error in getShortId:', error);
      return 'N/A';
    }
  };

  // Filter products based on search query AND exclude sold items
  const filteredProducts = inventory.filter(product => {
    try {
      // NEW: Exclude sold items from main inventory view
      if (product.soldDate) return false;
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const shortSku = getShortId(product.qrCodeId || product.id).toLowerCase();
        const fullUuid = (product.qrCodeId || product.id || '').toLowerCase();
      
      const searchableFields = [
        product.product,
        product.description,
        product.brand,
        product.type,
        product.notes,
        product.color,
        product.size,
        product.category,
        product.platform,
        product.createdBy,
        product.location,
        shortSku,
        fullUuid
      ].filter(Boolean).map(field => String(field).toLowerCase());
      
      const matchesSearch = searchableFields.some(field => field.includes(query));
      if (!matchesSearch) return false;
    }

    // Category filter
    if (filterCategory && product.category !== filterCategory) return false;
    
    // Platform filter
    if (filterPlatform && product.platform !== filterPlatform) return false;
    
    // Location filter
    if (filterLocation && product.location !== filterLocation) return false;
    
    // Creator filter
    if (filterCreator && product.createdBy !== filterCreator) return false;
    
    // Listing filter
    if (filterListing === 'listed' && !(product.listDate || product.platform)) return false;
    if (filterListing === 'notListed' && (product.listDate || product.platform)) return false;

    // Photo status filter
    if (filterPhotoStatus === 'needs') {
      const hasAnyPhoto = product.photosTaken || product.photoLink;
      if (hasAnyPhoto) return false;
    }
    if (filterPhotoStatus === 'has') {
      const hasAnyPhoto = product.photosTaken || product.photoLink;
      if (!hasAnyPhoto) return false;
    }

    // Needs dimensions/weight filter
    if (filterNeedsDimensions) {
      if (product.length && product.width && product.height && product.weight) return false;
    }

    // Status filter
    if (filterStatus === 'available' && product.soldDate) return false;
    if (filterStatus === 'sold' && !product.soldDate) return false;

    return true;
    } catch (error) {
      console.error('Error filtering products:', error);
      setSearchError('Search encountered an error. Please try again.');
      // Reset error after 3 seconds
      setTimeout(() => setSearchError(null), 3000);
      return true; // Return all products on error
    }
  });

  // Sort filtered products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0);
      
      case 'oldest':
        return new Date(a.createdAt || a.updatedAt || 0) - new Date(b.createdAt || b.updatedAt || 0);
      
      case 'name-asc':
        return (a.product || '').localeCompare(b.product || '');
      
      case 'name-desc':
        return (b.product || '').localeCompare(a.product || '');
      
      case 'price-high':
        return (parseFloat(b.listingPrice) || 0) - (parseFloat(a.listingPrice) || 0);
      
      case 'price-low':
        return (parseFloat(a.listingPrice) || 0) - (parseFloat(b.listingPrice) || 0);
      
      case 'category':
        return (a.category || '').localeCompare(b.category || '');
      
      case 'platform':
        return (a.platform || '').localeCompare(b.platform || '');
      
      default:
        return 0;
    }
  });

  // NEW: Load QR Code library
  useEffect(() => {
    if (!window.QRCode) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Generate and download QR label PDF
  const generateQRLabel = async (product) => {
    setGeneratingQR(prev => ({ ...prev, [product.id]: true }));

    try {
      if (!window.QRCode) {
        alert('QR Code library is loading, please try again in a moment.');
        setGeneratingQR(prev => ({ ...prev, [product.id]: false }));
        return;
      }

      const qrCodeId = product.qrCodeId || product.id;
      const qrUrl = `https://resell-inventory-flow.web.app/scan/${qrCodeId}`;
      const shortId = getShortId(qrCodeId);
      const productName = (product.product || '').toUpperCase();

      // Generate product QR code
      const productQrDataUrl = await window.QRCode.toDataURL(qrUrl, {
        width: 400,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#FFFFFF' }
      });



      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [47.752, 73.152], // 1.88" x 2.88"
        compress: true
      });

      const pageWidth = 47.752;
      const pageHeight = 73.152;
      const margin = 2.032; // 0.08in (2.032mm) safe margin
      // make QR much larger so phones can scan reliably
      const qrSize = pageWidth * 0.5;

      // White background
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // BLACK BORDER
      pdf.setLineWidth(0.5);
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(margin, margin, pageWidth - (2*margin), pageHeight - (2*margin));

      // Top center "4TL"
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      const topCenterY = margin + (pageHeight * 0.06);
      try { pdf.text('4TL', pageWidth / 2, topCenterY, { align: 'center', stroke: true }); } catch (e) { pdf.text('4TL', pageWidth / 2, topCenterY, { align: 'center' }); }

      // Centered product QR (below 4TL)
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = topCenterY + 2;
      pdf.addImage(productQrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      // Product name large and bold underneath QR
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      const maxWidth = pageWidth - (2 * margin) - 4;
      let nameLines = pdf.splitTextToSize(productName || 'NAME SHOULD SHOW HERE', maxWidth);
      if (!nameLines || nameLines.length === 0 || nameLines.every(l => !String(l || '').trim())) {
        nameLines = pdf.splitTextToSize('NAME SHOULD SHOW HERE', maxWidth);
      }
      nameLines = nameLines.slice(0, 2);
      const lineHeight = 10;
      const startY = qrY + qrSize + 6;
      nameLines.forEach((line, idx) => {
        pdf.text(line, pageWidth / 2, startY + (idx * lineHeight), { align: 'center' });
      });

      const fileName = `QR_${product.product || 'Item'}_${shortId}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Error generating QR label:', error);
      alert(`Error generating QR label: ${error.message}`);
    } finally {
      setGeneratingQR(prev => ({ ...prev, [product.id]: false }));
    }
  };

  const handleBulkPrint = async () => {
    if (selectedItems.size === 0) {
      alert('Please select items to print');
      return;
    }

    setIsPrinting(true);

    try {
      if (!window.QRCode) {
        alert('QR Code library is loading, please try again in a moment.');
        setIsPrinting(false);
        return;
      }

      const selectedProducts = inventory.filter(p => selectedItems.has(p.id));
      
      if (selectedProducts.length === 0) {
        alert('No products found to print');
        setIsPrinting(false);
        return;
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [47.752, 73.152], // 1.88" x 2.88"
        compress: true
      });

      const pageWidth = 47.752;
      const pageHeight = 73.152;
      const margin = 2.032;
      const qrSize = pageWidth * 0.5; // larger QR for scanning

      for (let i = 0; i < selectedProducts.length; i++) {
        const product = selectedProducts[i];
        const qrId = product.qrCodeId || product.id;
        const qrUrl = `https://resell-inventory-flow.web.app/scan/${qrId}`;
        const shortId = getShortId(qrId);
        const productName = (product.product || '').toUpperCase();

        // Generate product QR code
        const productQrDataUrl = await window.QRCode.toDataURL(qrUrl, {
          width: 400,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#FFFFFF' }
        });

        if (i > 0) {
          pdf.addPage([47.752, 73.152]);
        }

        // White background
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // BLACK BORDER
        pdf.setLineWidth(0.5);
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(margin, margin, pageWidth - (2*margin), pageHeight - (2*margin));

        // Top center "4TL"
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        const topCenterY = margin + (pageHeight * 0.06);
        try { pdf.text('4TL', pageWidth / 2, topCenterY, { align: 'center', stroke: true }); } catch (e) { pdf.text('4TL', pageWidth / 2, topCenterY, { align: 'center' }); }

        // Centered product QR (below 4TL)
        const qrX = (pageWidth - qrSize) / 2;
        const qrY = topCenterY + 2;
        pdf.addImage(productQrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

        // Product name large and bold under QR
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        const maxWidth = pageWidth - (2 * margin) - 4;
        let nameLines = pdf.splitTextToSize((productName || '').toUpperCase(), maxWidth);
        if (!nameLines || nameLines.length === 0 || nameLines.every(l => !String(l || '').trim())) {
          nameLines = pdf.splitTextToSize('NAME SHOULD SHOW HERE', maxWidth);
        }
        nameLines = nameLines.slice(0, 2);
          nameLines.forEach((line, idx) => {
            const lineHeight = 10;
            const startY = qrY + qrSize + 6;
        });


      }

      const fileName = `QR_Bulk_${selectedProducts.length}_labels_${Date.now()}.pdf`;
      pdf.save(fileName);

      alert(`✅ Successfully generated ${selectedProducts.length} QR label(s)!`);

    } catch (error) {
      console.error('Error generating QR labels:', error);
      alert(`Error generating QR labels: ${error.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  // NEW: Print 5 labels for a single item
  const handlePrintSingleItem = async (product) => {
    try {
      setIsPrinting(true);

      if (!window.QRCode) {
        alert('QR Code library is loading. Please try again.');
        setIsPrinting(false);
        return;
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [47.752, 73.152],
        compress: true
      });

      const pageWidth = 47.752;
      const pageHeight = 73.152;
      const qrId = product.qrCodeId || product.id;
      const productName = product.product || 'Unknown';
      const shortId = qrId.split('-').pop().substring(0, 5).toUpperCase();
      const margin = 2.032;
      const qrSize = pageWidth * 0.5; // make product QR much larger

      // Generate product QR code once
      const qrUrl = `https://resell-inventory-flow.web.app/scan/${qrId}`;
      const productQrDataUrl = await window.QRCode.toDataURL(qrUrl, {
        width: 400,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#FFFFFF' }
      });



      // Generate 3 labels with same QR codes
      for (let labelNum = 0; labelNum < 3; labelNum++) {
        if (labelNum > 0) pdf.addPage();

        // White background
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // BLACK BORDER
        pdf.setLineWidth(0.5);
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(margin, margin, pageWidth - (2*margin), pageHeight - (2*margin));

        // Top center "4TL"
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        const topCenterY = margin + (pageHeight * 0.06);
        try { pdf.text('4TL', pageWidth / 2, topCenterY, { align: 'center', stroke: true }); } catch (e) { pdf.text('4TL', pageWidth / 2, topCenterY, { align: 'center' }); }

        // Centered product QR (below 4TL)
        const qrX = (pageWidth - qrSize) / 2;
        const qrY = topCenterY + 2;
        pdf.addImage(productQrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

        // Product name large and bold under QR
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        const maxWidth = pageWidth - (2 * margin) - 4;
        let nameLines = pdf.splitTextToSize((productName || '').toUpperCase(), maxWidth);
        if (!nameLines || nameLines.length === 0 || nameLines.every(l => !String(l || '').trim())) {
          nameLines = pdf.splitTextToSize('NAME SHOULD SHOW HERE', maxWidth);
        }
        nameLines = nameLines.slice(0, 2);
        const lineHeight = 10;
        const startY = qrY + qrSize + 6;
        nameLines.forEach((line, idx) => {
          pdf.text(line, pageWidth / 2, startY + (idx * lineHeight), { align: 'center' });
        });
      }

      const filename = `${productName}-Labels-${new Date().toISOString().slice(0,10)}.pdf`;
      pdf.save(filename);
      alert(`✅ Generated 3 labels for "${productName}"!`);
    } catch (error) {
      console.error('Error printing labels:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  // NEW: Get unique values for filter dropdowns
  const uniqueCategories = [...new Set(inventory.map(p => p.category).filter(Boolean))];
  const uniquePlatforms = [...new Set(inventory.map(p => p.platform).filter(Boolean))];
  const uniqueLocations = [...new Set(inventory.map(p => p.location).filter(Boolean))];
  const uniqueCreators = [...new Set(inventory.map(p => p.createdBy).filter(Boolean))];

  // NEW: Clear all filters
  const clearFilters = () => {
    setFilterCategory('');
    setFilterPlatform('');
    setFilterLocation('');
    setFilterCreator('');
    setFilterStatus('');
    setSearchQuery('');
  };

  // NEW: Count active filters
  const activeFiltersCount = [filterCategory, filterPlatform, filterLocation, filterCreator, filterStatus, filterListing, filterPhotoStatus, filterNeedsDimensions ? 'dims' : ''].filter(Boolean).length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* NEW: NOT YET LISTED SECTION - MOST IMPORTANT, AT THE VERY TOP */}
      {notYetListedItems.length > 0 && (
        <div className="not-yet-listed-section mb-6 bg-red-50 border-2 border-red-400 rounded-lg shadow-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-red-100 transition-colors" onClick={() => setShowNotYetListed(!showNotYetListed)}>
            <div className="flex items-center gap-3">
              <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-xl font-bold text-red-900">🚨 Not Yet Listed ({notYetListedItems.length})</h3>
                <p className="text-sm text-red-700 font-medium">Items purchased but not listed on any platform</p>
              </div>
            </div>
            <svg className={`w-6 h-6 text-red-600 transition-transform ${showNotYetListed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          {showNotYetListed && (
            <div className="p-4 pt-0 space-y-2 max-h-96 overflow-y-auto">
              {notYetListedItems.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-lg border-2 border-red-300 hover:border-red-500 transition-colors cursor-pointer shadow-sm" onClick={() => handleEdit(item)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-purple-600 font-semibold bg-purple-100 px-2 py-1 rounded">
                          {getShortId(item.qrCodeId || item.id)}
                        </span>
                        <h4 className="font-bold text-gray-900 text-lg">{item.product || 'Untitled'}</h4>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1 mb-2">{item.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-sm mt-2">
                        {item.purchasePrice && (
                          <span className="text-gray-600">
                            <strong>Cost:</strong> ${parseFloat(item.purchasePrice).toFixed(2)}
                          </span>
                        )}
                        {item.brand && (
                          <span className="text-gray-600">
                            <strong>Brand:</strong> {item.brand}
                          </span>
                        )}
                        {item.category && (
                          <span className="text-gray-600">
                            <strong>Category:</strong> {item.category}
                          </span>
                        )}
                        {item.purchaseDate && (
                          <span className="text-gray-600">
                            <strong>Purchased:</strong> {item.purchaseDate}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(item);
                      }}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-md"
                    >
                      📝 List It Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Needs Attention Section - BELOW "Not Yet Listed" */}
      {needsAttentionItems.length > 0 && (
        <div className="needs-attention-section mb-6 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-md overflow-hidden">
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-orange-100 transition-colors" onClick={() => setShowNeedsAttention(!showNeedsAttention)}>
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-lg font-bold text-orange-900">Needs Attention ({needsAttentionItems.length})</h3>
                <p className="text-sm text-orange-700">Items not yet listed or missing information</p>
              </div>
            </div>
            <svg className={`w-5 h-5 text-orange-600 transition-transform ${showNeedsAttention ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          {showNeedsAttention && (
            <div className="p-4 pt-0 space-y-2 max-h-96 overflow-y-auto">
              {needsAttentionItems.map(item => (
                <div key={item.id} className="bg-white p-3 rounded-lg border border-orange-200 hover:border-orange-400 transition-colors cursor-pointer" onClick={() => handleEdit(item)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-purple-600 font-semibold">
                          {getShortId(item.qrCodeId || item.id)}
                        </span>
                        <h4 className="font-semibold text-gray-900">{item.product || 'Untitled'}</h4>
                      </div>
                      <p className="text-sm text-orange-600 font-medium">
                        ⚠️ {getAttentionReasons(item)}
                      </p>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.description}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(item);
                      }}
                      className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
                    >
                      Fix
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inventory Stats */}
      <InventoryStats 
        inventory={inventory}
        onStatClick={handleStatClick}
        onCategoryClick={(cat) => {
          clearFilters();
          setFilterCategory(cat);
        }}
      />

      {/* Search Bar */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-4">
        <div className="relative">
          <svg className="absolute left-4 top-4 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="🔍 Search by product name, SKU, description, brand, location, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear search"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-gray-600">
              Found <span className="font-bold text-purple-600">{filteredProducts.length}</span> item{filteredProducts.length !== 1 ? 's' : ''} matching "{searchQuery}"
            </span>
            {filteredProducts.length > 0 && (
              <span className="text-gray-400">
                • Click any item to view or edit
              </span>
            )}
          </div>
        )}
      </div>

      {/* NEW: Filter Bar */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {activeFiltersCount > 0 && (
              <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </h3>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Category Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Platform Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Platform</label>
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Platforms</option>
              {uniquePlatforms.map(plat => (
                <option key={plat} value={plat}>{plat}</option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Locations</option>
              {uniqueLocations.map(loc => (
                <option key={loc} value={loc}>📍 {loc}</option>
              ))}
            </select>
          </div>

          {/* Creator Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Creator</label>
            <select
              value={filterCreator}
              onChange={(e) => setFilterCreator(e.target.value)}
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Creators</option>
              {uniqueCreators.map(creator => (
                <option key={creator} value={creator}>{creator}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Items</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
            </select>
          </div>
          {/* Listing Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Listing</label>
            <select
              value={filterListing}
              onChange={(e) => setFilterListing(e.target.value)}
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="listed">Listed</option>
              <option value="notListed">Not Listed</option>
            </select>
          </div>
          {/* Needs Dimensions/Weight */}
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <input
              id="needs-dims"
              type="checkbox"
              checked={filterNeedsDimensions}
              onChange={(e) => setFilterNeedsDimensions(e.target.checked)}
              className="h-4 w-4 text-purple-600 border-gray-300 rounded"
            />
            <label htmlFor="needs-dims" className="text-xs text-gray-600">Needs dims/weight</label>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {filterCategory && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                Category: {filterCategory}
                <button onClick={() => setFilterCategory('')} className="hover:text-purple-900">×</button>
              </span>
            )}
            {filterPlatform && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                Platform: {filterPlatform}
                <button onClick={() => setFilterPlatform('')} className="hover:text-purple-900">×</button>
              </span>
            )}
            {filterLocation && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                Location: {filterLocation}
                <button onClick={() => setFilterLocation('')} className="hover:text-purple-900">×</button>
              </span>
            )}
            {filterCreator && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                Creator: {filterCreator}
                <button onClick={() => setFilterCreator('')} className="hover:text-purple-900">×</button>
              </span>
            )}
            {filterStatus && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                Status: {filterStatus === 'available' ? 'Available' : 'Sold'}
                <button onClick={() => setFilterStatus('')} className="hover:text-purple-900">×</button>
              </span>
            )}
            {filterListing && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                {filterListing === 'listed' ? 'Listed' : 'Not Listed'}
                <button onClick={() => setFilterListing('')} className="hover:text-red-900">×</button>
              </span>
            )}
            {filterPhotoStatus && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                {filterPhotoStatus === 'needs' ? 'No Photos' : 'Has Photos'}
                <button onClick={() => setFilterPhotoStatus('')} className="hover:text-orange-900">×</button>
              </span>
            )}
            {filterNeedsDimensions && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                Needs dims/weight
                <button onClick={() => setFilterNeedsDimensions(false)} className="hover:text-gray-900">×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Header with Sort and Bulk Actions */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {searchQuery || activeFiltersCount > 0 ? `Filtered Results (${filteredProducts.length})` : 'Active Inventory'}
        </h2>
        
        <div className="flex items-center gap-3">
          {/* NEW: Sort dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="price-high">Price (High-Low)</option>
              <option value="price-low">Price (Low-High)</option>
              <option value="category">Category</option>
              <option value="platform">Platform</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {inventory.length > 0 && (
            <>
              <button
                onClick={toggleSelectAll}
                className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {selectedItems.size === inventory.length ? 'Deselect All' : 'Select All'}
              </button>
              
              {selectedItems.size > 0 && (
                <>
                  {/* NEW: Print QR Codes Button */}
                  <button
                    onClick={handleBulkPrint}
                    disabled={isPrinting}
                    className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors flex items-center gap-2 font-semibold"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v-4a2 2 0 002-2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v4h8z" />
                    </svg>
                    {isPrinting ? 'Generating...' : `Print QR (${selectedItems.size})`}
                  </button>

                  {/* Existing Delete Button */}
                  <button
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {isDeleting ? 'Deleting...' : `Delete (${selectedItems.size})`}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Product List */}
      {inventory.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No products yet. Scan a QR code or use Quick Add to get started!
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 text-lg mb-2">No items match your search</p>
          <p className="text-gray-400 text-sm">Try searching for: product name, SKU (e.g., "A3F2D"), location, or category</p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedProducts.map((product) => {
            const profit = calculateProfit(product);
            return (
              <div 
                key={product.id} 
                className={`bg-white rounded-lg shadow-md overflow-hidden border-2 transition-colors ${
                  selectedItems.has(product.id) ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                }`}
              >
                {/* Product header - with checkbox, info, and edit button */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedItems.has(product.id)}
                        onChange={() => toggleSelectItem(product.id)}
                        className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      
                      <div className="flex-1">
                        {/* SKU - Short 5-digit code from QR label */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-500">SKU:</span>
                          <span className="text-lg font-bold text-purple-700 font-mono">
                            {getShortId(product.qrCodeId || product.id)}
                          </span>
                        </div>
                        
                        {/* Product Name - Bold header */}
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {product.product || 'Untitled Product'}
                        </h3>
                        
                        {/* NEW: Description below product name */}
                        {product.description && (
                          <p className="text-sm text-gray-600 mb-1 italic">
                            {product.description}
                          </p>
                        )}
                        {/* Purchase Date (collapsed) */}
                        {product.purchaseDate && (
                          <p className="text-xs text-gray-500 mb-1">
                            Purchased: {product.purchaseDate}
                          </p>
                        )}
                        {/* Photo indicators (collapsed) */}
                        {product.photosTaken && (
                          <p className="text-xs text-green-600 mb-1">📸 Photos taken</p>
                        )}
                        {product.photoLink && (
                          <p className="text-xs text-indigo-600 mb-1">
                            <a href={product.photoLink} target="_blank" rel="noopener noreferrer" className="underline">Photo link</a>
                          </p>
                        )}
                        {/* Quick Info Row */}
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          {product.brand && (
                            <span className="flex items-center gap-1">
                              <strong>Brand:</strong> {product.brand}
                            </span>
                          )}
                          {product.category && (
                            <span className="flex items-center gap-1">
                              <strong>Category:</strong> {product.category}
                            </span>
                          )}
                          {product.listingPrice && (
                            <span className="flex items-center gap-1 text-green-600 font-semibold">
                              ${parseFloat(product.listingPrice).toFixed(2)}
                            </span>
                          )}
                          {product.shippingCost && (
                            <span className="flex items-center gap-1 text-orange-600">
                              <strong>Ship:</strong> ${parseFloat(product.shippingCost).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleExpand(product.id)}
                          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                        >
                          {expandedItem === product.id ? 'Less' : 'More'}
                        </button>
                      </div>
                      
                      {/* NEW: Print 5 Labels Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintSingleItem(product);
                        }}
                        disabled={isPrinting}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2 font-semibold shadow-md"
                        title="Print 3 labels for this item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v4h8z" />
                        </svg>
                        {isPrinting ? '⏳' : '🏷️ Print 3 Labels'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedItem === product.id && (
                  <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm pt-4">
                    {/* Core info and inventory timeline */}
                    {product.purchaseDate && (
                      <>
                        <dt className="font-semibold text-gray-600">Purchased:</dt>
                        <dd className="text-gray-900">{product.purchaseDate}</dd>
                      </>
                    )}
                    {product.locationType && (
                      <>
                        <dt className="font-semibold text-gray-600">Location Type:</dt>
                        <dd className="text-gray-900">{product.locationType}</dd>
                      </>
                    )}
                    {product.location && (
                      <>
                        <dt className="font-semibold text-gray-600">Location:</dt>
                        <dd className="text-gray-900">{product.location}</dd>
                      </>
                    )}
                    {product.platform && (
                      <>
                        <dt className="font-semibold text-gray-600">Platform:</dt>
                        <dd className="text-gray-900">{product.platform}</dd>
                      </>
                    )}
                    {product.listingUrl && (
                      <>
                        <dt className="font-semibold text-gray-600">Listing URL:</dt>
                        <dd className="text-gray-900">
                          <a href={product.listingUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                            View</a>
                        </dd>
                      </>
                    )}
                    {/* days in inventory counter */}
                    {product.purchaseDate && (
                      <>
                        <dt className="font-semibold text-gray-600">Days in Inventory:</dt>
                        <dd className="text-gray-900">
                          {(() => {
                            try {
                              const start = new Date(product.purchaseDate);
                              const end = product.soldDate ? new Date(product.soldDate) : new Date();
                              const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
                              return diff;
                            } catch (e) {
                              return 'N/A';
                            }
                          })()}
                        </dd>
                      </>
                    )}

                    {/* Dimensions & weight */}
                    {(product.length || product.width || product.height) && (
                      <>
                        <dt className="font-semibold text-gray-600">Dimensions (L×W×H):</dt>
                        <dd className="text-gray-900">
                          {product.length || '-'} × {product.width || '-'} × {product.height || '-'}
                        </dd>
                      </>
                    )}
                    {product.weight && (
                      <>
                        <dt className="font-semibold text-gray-600">Weight:</dt>
                        <dd className="text-gray-900">{product.weight}</dd>
                      </>
                    )}
                    {product.shippingCost && (
                      <>
                        <dt className="font-semibold text-gray-600">Shipping Cost:</dt>
                        <dd className="text-gray-900">${parseFloat(product.shippingCost).toFixed(2)}</dd>
                      </>
                    )}

                    {/* Other meta fields */}
                    {product.qrCodeId && (
                      <>
                        <dt className="font-semibold text-gray-600">Full QR ID:</dt>
                        <dd className="text-gray-900 font-mono text-xs break-all">{product.qrCodeId || product.id}</dd>
                      </>
                    )}
                    {product.product && (
                      <>
                        <dt className="font-semibold text-gray-600">Product:</dt>
                        <dd className="text-gray-900">{product.product}</dd>
                      </>
                    )}
                    {product.createdBy && (
                      <>
                        <dt className="font-semibold text-gray-600">Created By:</dt>
                        <dd className="text-gray-900">{product.createdBy}</dd>
                      </>
                    )}
                    {product.brand && (
                      <>
                        <dt className="font-semibold text-gray-600">Brand:</dt>
                        <dd className="text-gray-900">{product.brand}</dd>
                      </>
                    )}
                    {product.type && (
                      <>
                        <dt className="font-semibold text-gray-600">Type:</dt>
                        <dd className="text-gray-900">{product.type}</dd>
                      </>
                    )}
                    {product.size && (
                      <>
                        <dt className="font-semibold text-gray-600">Size:</dt>
                        <dd className="text-gray-900">{product.size}</dd>
                      </>
                    )}
                    {product.color && (
                      <>
                        <dt className="font-semibold text-gray-600">Color:</dt>
                        <dd className="text-gray-900">{product.color}</dd>
                      </>
                    )}
                    {product.condition && (
                      <>
                        <dt className="font-semibold text-gray-600">Condition:</dt>
                        <dd className="text-gray-900">{product.condition}</dd>
                      </>
                    )}
                    {product.purchasePrice && (
                      <>
                        <dt className="font-semibold text-gray-600">Purchase Price:</dt>
                        <dd className="text-gray-900">${parseFloat(product.purchasePrice).toFixed(2)}</dd>
                      </>
                    )}
                    {product.listingPrice && (
                      <>
                        <dt className="font-semibold text-gray-600">Listing Price:</dt>
                        <dd className="text-gray-900">${parseFloat(product.listingPrice).toFixed(2)}</dd>
                      </>
                    )}

                    {/* Price notes and photos moved earlier */}
                    {product.notes && (
                      <>
                        <dt className="font-semibold text-gray-600 col-span-2">Notes:</dt>
                        <dd className="text-gray-900 col-span-2">{product.notes}</dd>
                      </>
                    )}

                    {product.photosTaken && (
                      <>
                        <dt className="font-semibold text-gray-600">Photos Taken:</dt>
                        <dd className="text-gray-900">✓</dd>
                      </>
                    )}

                    {product.photoLink && (
                      <>
                        <dt className="font-semibold text-gray-600">Photo Link:</dt>
                        <dd className="text-gray-900 col-span-2">
                          <a href={product.photoLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                            View</a>
                        </dd>
                      </>
                    )}

                    {/* Sold section always last */}
                    {product.soldDate && (
                      <>
                        <dt className="font-semibold text-gray-600">Sold Date:</dt>
                        <dd className="text-gray-900">{product.soldDate}</dd>
                      </>
                    )}
                    {product.sellPrice && (
                      <>
                        <dt className="font-semibold text-gray-600">Sell Price:</dt>
                        <dd className="text-gray-900">${parseFloat(product.sellPrice).toFixed(2)}</dd>
                      </>
                    )}
                    {product.sellingFees && (
                      <>
                        <dt className="font-semibold text-gray-600">Selling Fees:</dt>
                        <dd className="text-gray-900">${parseFloat(product.sellingFees).toFixed(2)}</dd>
                      </>
                    )}
                    {product.shippingCost && (
                      <>
                        <dt className="font-semibold text-gray-600">Shipping Cost:</dt>
                        <dd className="text-gray-900">${parseFloat(product.shippingCost).toFixed(2)}</dd>
                      </>
                    )}
                    {product.sellingNotes && (
                      <>
                        <dt className="font-semibold text-gray-600">Selling Notes:</dt>
                        <dd className="text-gray-900">{product.sellingNotes}</dd>
                      </>
                    )}
                    {product.sellPrice && (
                      <>
                        <dt className="font-semibold text-gray-600">Profit:</dt>
                        <dd className="text-gray-900 font-bold">
                          ${calculateProfit(product)}
                        </dd>
                      </>
                    )}
                  </dl>

                  {/* Photos Section */}
                  {product.photoUrls && product.photoUrls.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-md font-semibold text-gray-800">
                          Product Photos ({product.photoUrls.length})
                        </h4>
                        <button
                          onClick={() => handleDownloadAllPhotos(product)}
                          className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Download All
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {product.photoUrls.map((url, photoIndex) => (
                          <div key={photoIndex} className="relative group">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={url}
                                alt={`${product.product} - Photo ${photoIndex + 1}`}
                                className="w-full h-32 object-cover rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-colors cursor-pointer"
                              />
                            </a>

                            {/* Download button overlay */}
                            <button
                              onClick={() => handleDownloadPhoto(url, product.product, photoIndex)}
                              disabled={downloadingPhoto === `${product.product}-${photoIndex}`}
                              className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-700 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg disabled:opacity-50"
                              title="Download this photo"
                            >
                              {downloadingPhoto === `${product.product}-${photoIndex}` ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>

                            <div className="mt-1 text-xs text-center text-gray-600">
                              Photo {photoIndex + 1}
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="text-xs text-gray-500 mt-3 text-center">
                        Click any photo to view full size • Hover to download individual photos
                      </p>
                    </div>
                  )}
                </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default InventoryList;
