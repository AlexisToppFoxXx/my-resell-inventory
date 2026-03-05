import React from 'react';

function InventoryStats({ inventory, onStatClick = () => {}, onCategoryClick = () => {} }) {
  // Calculate statistics
  const totalItems = inventory.length;
  const totalInventoryValue = inventory.reduce((sum, item) => {
    return sum + (parseFloat(item.purchasePrice) || 0);
  }, 0);

  const byCategory = inventory.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const totalListed = inventory.filter(item => item.listDate || item.platform).length;
  const totalSold = inventory.filter(item => item.soldDate).length;
  const needsPhotos = inventory.filter(item => !item.photosTaken).length;
  const hasPhotos = inventory.filter(item => item.photosTaken).length;

  const notListedItems = inventory.filter(item => !item.listDate && !item.platform);
  const notListedCount = notListedItems.length;
  const notListedCost = notListedItems.reduce((sum, item) => {
    return sum + (parseFloat(item.purchasePrice) || 0);
  }, 0);

  const ebayCount = inventory.filter(item => (item.platform || '').toLowerCase() === 'ebay').length;
  const facebookCount = inventory.filter(item => (item.platform || '').toLowerCase() === 'facebook').length;
  const needsDimensions = inventory.filter(item => {
    return !item.length || !item.width || !item.height || !item.weight;
  }).length;

  // calculate profit for sold items (include shipping cost if provided)
  const totalProfit = inventory.reduce((sum, item) => {
    if (!item.soldDate) return sum;
    const sellPrice = parseFloat(item.sellPrice) || 0;
    const purchasePrice = parseFloat(item.purchasePrice) || 0;
    const sellingFees = parseFloat(item.sellingFees) || 0;
    const ship = parseFloat(item.shippingCost) || 0;
    return sum + (sellPrice - purchasePrice - sellingFees - ship);
  }, 0);

  const totalListingValue = inventory.reduce((sum, item) => {
    return sum + (parseFloat(item.listingPrice) || 0);
  }, 0);
  
  const totalRevenue = inventory.reduce((sum, item) => {
    return sum + (parseFloat(item.sellPrice) || 0);
  }, 0);
  
  const byCreator = inventory.reduce((acc, item) => {
    const creator = item.createdBy || 'Unknown';
    acc[creator] = (acc[creator] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Inventory Statistics</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Total Items (click clears filters) */}
        <button
          onClick={() => onStatClick('total')}
          className="bg-blue-50 p-4 rounded-lg text-left hover:bg-blue-100 transition-colors"
        >
          <p className="text-sm text-gray-600">Total Items</p>
          <p className="text-2xl font-bold text-blue-600">{totalItems}</p>
          <p className="text-xs text-gray-500 mt-1">
            Cost: ${totalInventoryValue.toFixed(2)}
          </p>
        </button>

        {/* Listed */}
        <button
          onClick={() => onStatClick('listed')}
          className="bg-green-50 p-4 rounded-lg text-left hover:bg-green-100 transition-colors"
        >
          <p className="text-sm text-gray-600">Listed</p>
          <p className="text-2xl font-bold text-green-600">{totalListed}</p>
        </button>

        {/* Sold */}
        <button
          onClick={() => onStatClick('sold')}
          className="bg-purple-50 p-4 rounded-lg text-left hover:bg-purple-100 transition-colors"
        >
          <p className="text-sm text-gray-600">Sold</p>
          <p className="text-2xl font-bold text-purple-600">{totalSold}</p>
          <p className="text-xs text-gray-500 mt-1">
            Profit: ${totalProfit.toFixed(2)}
          </p>
        </button>

        {/* Needs Photos */}
        <button
          onClick={() => onStatClick('needsPhotos')}
          className="bg-orange-50 p-4 rounded-lg text-left hover:bg-orange-100 transition-colors"
        >
          <p className="text-sm text-gray-600">Needs Photos</p>
          <p className="text-2xl font-bold text-orange-600">{needsPhotos}</p>
        </button>

        {/* Has Photos */}
        <button
          onClick={() => onStatClick('hasPhotos')}
          className="bg-teal-50 p-4 rounded-lg text-left hover:bg-teal-100 transition-colors"
        >
          <p className="text-sm text-gray-600">Has Photos</p>
          <p className="text-2xl font-bold text-teal-600">{hasPhotos}</p>
        </button>

        {/* Inventory Value (non-clickable) */}
        <div className="bg-indigo-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Inventory Cost</p>
          <p className="text-xl font-bold text-indigo-600">${totalInventoryValue.toFixed(2)}</p>
        </div>

        {/* New stat: Not Listed */}
        <button
          onClick={() => onStatClick('notListed')}
          className="bg-red-50 p-4 rounded-lg text-left hover:bg-red-100 transition-colors col-span-2 md:col-span-1"
        >
          <p className="text-sm text-gray-600">Not Listed</p>
          <p className="text-2xl font-bold text-red-600">{notListedCount}</p>
          <p className="text-xs text-gray-500 mt-1">
            Cost: ${notListedCost.toFixed(2)}
          </p>
        </button>

        {/* New stat: eBay Listed */}
        <button
          onClick={() => onStatClick('ebay')}
          className="bg-yellow-50 p-4 rounded-lg text-left hover:bg-yellow-100 transition-colors"
        >
          <p className="text-sm text-gray-600">eBay Listed</p>
          <p className="text-2xl font-bold text-yellow-600">{ebayCount}</p>
        </button>

        {/* New stat: Facebook Listed */}
        <button
          onClick={() => onStatClick('facebook')}
          className="bg-blue-50 p-4 rounded-lg text-left hover:bg-blue-100 transition-colors"
        >
          <p className="text-sm text-gray-600">Facebook Listed</p>
          <p className="text-2xl font-bold text-blue-600">{facebookCount}</p>
        </button>

        {/* New stat: Needs Dimensions/Weight */}
        <button
          onClick={() => onStatClick('needsDimensions')}
          className="bg-gray-50 p-4 rounded-lg text-left hover:bg-gray-100 transition-colors"
        >
          <p className="text-sm text-gray-600">Needs Dimensions/Weight</p>
          <p className="text-2xl font-bold text-gray-600">{needsDimensions}</p>
        </button>
      </div>

      {/* Category Breakdown */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">By Category</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(byCategory).map(([category, count]) => (
            <button
              key={category}
              onClick={() => onCategoryClick(category)}
              className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-left hover:bg-gray-100 transition-colors"
            >
              <p className="text-xs text-gray-600 truncate" title={category}>{category}</p>
              <p className="text-lg font-bold text-gray-800">{count}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Creator Breakdown */}
      {Object.keys(byCreator).length > 1 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">By Creator</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(byCreator).map(([creator, count]) => (
              <div key={creator} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 truncate" title={creator}>{creator}</p>
                <p className="text-lg font-bold text-gray-800">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial Overview */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600">Total Listing Value</p>
          <p className="text-2xl font-bold text-blue-700">${totalListingValue.toFixed(2)}</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-gray-600">Total Revenue (Sold)</p>
          <p className="text-2xl font-bold text-green-700">${totalRevenue.toFixed(2)}</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-gray-600">Potential Profit</p>
          <p className="text-2xl font-bold text-purple-700">
            ${(totalListingValue - totalInventoryValue).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            (Listing Value - Inventory Cost)
          </p>
        </div>
      </div>
    </div>
  );
}

export default InventoryStats;
