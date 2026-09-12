import React from 'react';

function InventoryStats({ inventory, activeStat = '', onStatClick = () => {}, onCategoryClick = () => {} }) {
  // Calculate statistics
  const totalItems = inventory.length;

  const getCost = (item) => {
    let cost = parseFloat(item.purchasePrice) || 0;
    if (item.applyVistaFees) {
      cost = cost * 1.15 + 2;
    }
    return cost;
  };

  const totalInventoryValue = inventory.reduce((sum, item) => {
    return sum + getCost(item);
  }, 0);

  const byCategory = inventory.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const totalListed = inventory.filter(item => item.listDate || (item.platforms && item.platforms.length > 0)).length;
  const totalSold = inventory.filter(item => item.soldDate).length;
  const needsPhotos = inventory.filter(item => {
    const hasAny = item.photosTaken || item.photoLink;
    return !hasAny;
  }).length;
  const hasPhotos = inventory.filter(item => {
    const hasAny = item.photosTaken || item.photoLink;
    return hasAny;
  }).length;

  const notListedItems = inventory.filter(item => !item.listDate && (!item.platforms || item.platforms.length === 0));
  const notListedCount = notListedItems.length;
  const notListedCost = notListedItems.reduce((sum, item) => {
    return sum + getCost(item);
  }, 0);

  const ebayCount = inventory.filter(item => item.platforms && item.platforms.includes('eBay')).length;
  const facebookCount = inventory.filter(item => item.platforms && item.platforms.some(p => p.toLowerCase().includes('facebook'))).length;
  const needsDimensions = inventory.filter(item => {
    return !item.length || !item.width || !item.height || !item.weight;
  }).length;

  // calculate profit for sold items (include shipping, buyer shipping and purchase fee if provided)
  const totalProfit = inventory.reduce((sum, item) => {
    if (!item.soldDate) return sum;
    const sellPrice = parseFloat(item.sellPrice) || 0;
    const sellingFees = parseFloat(item.sellingFees) || 0;
    const sellerShip = parseFloat(item.shippingCost) || 0;
    const buyerShip = parseFloat(item.buyerShipping) || 0;
    const cost = getCost(item);
    const pct = parseFloat(item.purchaseFeePercent) || 0;
    const purchaseFee = item.applyPurchaseFee ? cost * (pct / 100) : 0;
    return sum + (sellPrice + buyerShip - cost - sellingFees - sellerShip - purchaseFee);
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
        {/* Total Items (display-only) */}
        <div
          className={`p-4 rounded-lg text-left ${activeStat === 'total' ? 'bg-blue-200' : 'bg-blue-50'}`}
        >
          <p className="text-sm text-gray-600">Total Items</p>
          <p className="text-2xl font-bold text-blue-600">{totalItems}</p>
          <p className="text-xs text-gray-500 mt-1">
            Cost: ${totalInventoryValue.toFixed(2)}
          </p>
        </div>

        {/* Listed (display-only) */}
        <div
          className={`p-4 rounded-lg text-left ${activeStat === 'listed' ? 'bg-green-200' : 'bg-green-50'}`}
        >
          <p className="text-sm text-gray-600">Listed</p>
          <p className="text-2xl font-bold text-green-600">{totalListed}</p>
        </div>

        {/* Sold */}
        <button
          onClick={() => onStatClick('sold')}
          className={`p-4 rounded-lg text-left transition-colors ${activeStat === 'sold' ? 'bg-purple-200' : 'bg-purple-50 hover:bg-purple-100'}`}
        >
          <p className="text-sm text-gray-600">Sold</p>
          <p className="text-2xl font-bold text-purple-600">{totalSold}</p>
          <p className="text-xs text-gray-500 mt-1">
            Profit: ${totalProfit.toFixed(2)}
          </p>
        </button>

        {/* Needs Photos (display-only) */}
        <div
          className={`p-4 rounded-lg text-left ${activeStat === 'needsPhotos' ? 'bg-yellow-200' : 'bg-yellow-50'}`}
        >
          <p className="text-sm text-gray-600">Needs Photos</p>
          <p className="text-2xl font-bold text-yellow-600">{needsPhotos}</p>
        </div>

        {/* Has Photos (display-only) */}
        <div
          className={`p-4 rounded-lg text-left ${activeStat === 'hasPhotos' ? 'bg-teal-200' : 'bg-teal-50'}`}
        >
          <p className="text-sm text-gray-600">Has Photos</p>
          <p className="text-2xl font-bold text-teal-600">{hasPhotos}</p>
        </div>

        {/* Inventory Value (non-clickable) */}
        <div className="bg-indigo-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Inventory Cost</p>
          <p className="text-xl font-bold text-indigo-600">${totalInventoryValue.toFixed(2)}</p>
        </div>

        {/* New stat: Not Listed (display-only) */}
        <div
          className={`p-4 rounded-lg text-left col-span-2 md:col-span-1 ${activeStat === 'notListed' ? 'bg-red-200' : 'bg-red-50'}`}
        >
          <p className="text-sm text-gray-600">Not Listed</p>
          <p className="text-2xl font-bold text-red-600">{notListedCount}</p>
          <p className="text-xs text-gray-500 mt-1">
            Cost: ${notListedCost.toFixed(2)}
          </p>
        </div>

        {/* New stat: eBay Listed (display-only) */}
        <div
          className={`p-4 rounded-lg text-left ${activeStat === 'ebay' ? 'bg-yellow-200' : 'bg-yellow-50'}`}
        >
          <p className="text-sm text-gray-600">eBay Listed</p>
          <p className="text-2xl font-bold text-yellow-600">{ebayCount}</p>
        </div>

        {/* New stat: Facebook Listed (display-only) */}
        <div
          className={`p-4 rounded-lg text-left ${activeStat === 'facebook' ? 'bg-blue-200' : 'bg-blue-50'}`}
        >
          <p className="text-sm text-gray-600">Facebook Listed</p>
          <p className="text-2xl font-bold text-blue-600">{facebookCount}</p>
        </div>

        {/* New stat: Needs Dimensions/Weight (display-only) */}
        <div
          className={`p-4 rounded-lg text-left ${activeStat === 'needsDimensions' ? 'bg-gray-200' : 'bg-gray-50'}`}
        >
          <p className="text-sm text-gray-600">Needs Dimensions/Weight</p>
          <p className="text-2xl font-bold text-gray-600">{needsDimensions}</p>
        </div>
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
