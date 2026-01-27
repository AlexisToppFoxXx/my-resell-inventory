import React, { useState } from 'react';

const SoldInventory = ({ inventory, setView, setCurrentProduct, setCurrentQrCodeId }) => {
  const [expandedItem, setExpandedItem] = useState(null);
  const [sortBy, setSortBy] = useState('newest-sold');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter to ONLY sold items
  const soldItems = inventory.filter(product => product.soldDate);

  // Calculate stats
  const totalProfit = soldItems.reduce((sum, item) => {
    const sellPrice = parseFloat(item.sellPrice) || 0;
    const purchasePrice = parseFloat(item.purchasePrice) || 0;
    const sellingFees = parseFloat(item.sellingFees) || 0;
    return sum + (sellPrice - purchasePrice - sellingFees);
  }, 0);

  const totalRevenue = soldItems.reduce((sum, item) => sum + (parseFloat(item.sellPrice) || 0), 0);

  // Search filter
  const filteredProducts = soldItems.filter(product => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const searchableFields = [
        product.product,
        product.description,
        product.brand,
        product.platform,
        product.sellingNotes
      ].filter(Boolean).map(field => String(field).toLowerCase());
      
      return searchableFields.some(field => field.includes(query));
    }
    return true;
  });

  // Sort
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'newest-sold':
        return new Date(b.soldDate || 0) - new Date(a.soldDate || 0);
      case 'oldest-sold':
        return new Date(a.soldDate || 0) - new Date(b.soldDate || 0);
      case 'profit-high':
        const profitA = (parseFloat(a.sellPrice) || 0) - (parseFloat(a.purchasePrice) || 0) - (parseFloat(a.sellingFees) || 0);
        const profitB = (parseFloat(b.sellPrice) || 0) - (parseFloat(b.purchasePrice) || 0) - (parseFloat(b.sellingFees) || 0);
        return profitB - profitA;
      case 'profit-low':
        const profitA2 = (parseFloat(a.sellPrice) || 0) - (parseFloat(a.purchasePrice) || 0) - (parseFloat(a.sellingFees) || 0);
        const profitB2 = (parseFloat(b.sellPrice) || 0) - (parseFloat(b.purchasePrice) || 0) - (parseFloat(b.sellingFees) || 0);
        return profitA2 - profitB2;
      default:
        return 0;
    }
  });

  const calculateProfit = (item) => {
    const sellPrice = parseFloat(item.sellPrice) || 0;
    const purchasePrice = parseFloat(item.purchasePrice) || 0;
    const sellingFees = parseFloat(item.sellingFees) || 0;
    return (sellPrice - purchasePrice - sellingFees).toFixed(2);
  };

  const handleEdit = (product) => {
    setCurrentProduct(product);
    setCurrentQrCodeId(product.qrCodeId || product.id);
    setView('form');
  };

  const toggleExpand = (productId) => {
    setExpandedItem(expandedItem === productId ? null : productId);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-green-700 mb-1">Total Profit</h3>
          <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${totalProfit.toFixed(2)}
          </p>
        </div>
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-700 mb-1">Total Revenue</h3>
          <p className="text-2xl font-bold text-blue-600">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-purple-700 mb-1">Items Sold</h3>
          <p className="text-2xl font-bold text-purple-600">{soldItems.length}</p>
        </div>
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-orange-700 mb-1">Avg Profit</h3>
          <p className="text-2xl font-bold text-orange-600">
            ${soldItems.length > 0 ? (totalProfit / soldItems.length).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-4">
        <div className="relative">
          <svg className="absolute left-4 top-4 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="🔍 Search sold items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Sold Items ({filteredProducts.length})</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="newest-sold">Recently Sold</option>
            <option value="oldest-sold">Oldest Sold</option>
            <option value="profit-high">Profit (High-Low)</option>
            <option value="profit-low">Profit (Low-High)</option>
          </select>
        </div>
      </div>
      
      {/* Product List */}
      {soldItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 text-lg mb-2">No sold items yet</p>
          <p className="text-gray-400 text-sm">Items will appear here once you mark them as sold</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedProducts.map((product) => {
            const profit = parseFloat(calculateProfit(product));
            return (
              <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-green-200">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{product.product || 'Untitled Product'}</h3>
                      {product.description && <p className="text-sm text-gray-600 mb-2 italic">{product.description}</p>}
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                        <span><strong>Sold:</strong> {product.soldDate}</span>
                        <span><strong>Platform:</strong> {product.platform || 'N/A'}</span>
                        {product.brand && <span><strong>Brand:</strong> {product.brand}</span>}
                      </div>
                      <div className="flex gap-4 text-sm font-medium">
                        <span className="text-blue-600">Sold: ${parseFloat(product.sellPrice || 0).toFixed(2)}</span>
                        <span className="text-gray-600">Cost: ${parseFloat(product.purchasePrice || 0).toFixed(2)}</span>
                        <span className="text-orange-600">Fees: ${parseFloat(product.sellingFees || 0).toFixed(2)}</span>
                        <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Profit: ${profit}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(product)} className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">Edit</button>
                      <button onClick={() => toggleExpand(product.id)} className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors">
                        {expandedItem === product.id ? 'Less' : 'More'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedItem === product.id && (
                  <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm pt-4">
                      {product.sellingNotes && (
                        <>
                          <dt className="font-semibold text-gray-600">Selling Notes:</dt>
                          <dd className="text-gray-900">{product.sellingNotes}</dd>
                        </>
                      )}
                      {product.listingUrl && (
                        <>
                          <dt className="font-semibold text-gray-600">Listing:</dt>
                          <dd className="text-gray-900">
                            <a href={product.listingUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">View Original Listing</a>
                          </dd>
                        </>
                      )}
                    </dl>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SoldInventory;
