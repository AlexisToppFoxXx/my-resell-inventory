import React from 'react';

function InventoryStats({ inventory, onShowNotListed }) {
  // Calculate statistics
  const totalItems = inventory.length;
  
  const byCategory = inventory.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  
  const totalListed = inventory.filter(item => item.listDate || item.platform).length;
  const totalSold = inventory.filter(item => item.soldDate).length;
  const needsPhotos = inventory.filter(item => !item.photosTaken).length;
  const hasPhotos = inventory.filter(item => item.photosTaken).length;
  
  const totalInventoryValue = inventory.reduce((sum, item) => {
    return sum + (parseFloat(item.purchasePrice) || 0);
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

  // NEW: Not Yet Listed items
  const notListedItems = inventory.filter(item => !item.listDate && !item.platform);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      {/* Existing header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl">📊</span>
        <div>
          <h2 className="text-2xl font-bold">Inventory Overview</h2>
          <p className="text-sm text-gray-600">Real-time statistics</p>
        </div>
      </div>

      {/* NEW: Prominent Not Yet Listed Section */}
      {notListedItems.length > 0 && (
        <div 
          className="mb-6 p-4 bg-orange-50 border-2 border-orange-300 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
          onClick={onShowNotListed}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-2xl font-bold text-orange-900">
                  {notListedItems.length} Item{notListedItems.length !== 1 ? 's' : ''} Not Yet Listed
                </h3>
                <p className="text-sm text-orange-700">Click to view items ready to list</p>
              </div>
            </div>
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Items */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Total Items</p>
          <p className="text-2xl font-bold text-blue-600">{totalItems}</p>
        </div>
        
        {/* Listed */}
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Listed</p>
          <p className="text-2xl font-bold text-green-600">{totalListed}</p>
        </div>
        
        {/* Sold */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Sold</p>
          <p className="text-2xl font-bold text-purple-600">{totalSold}</p>
        </div>
        
        {/* Needs Photos */}
        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Needs Photos</p>
          <p className="text-2xl font-bold text-orange-600">{needsPhotos}</p>
        </div>
        
        {/* Has Photos */}
        <div className="bg-teal-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Has Photos</p>
          <p className="text-2xl font-bold text-teal-600">{hasPhotos}</p>
        </div>
        
        {/* Inventory Value */}
        <div className="bg-indigo-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Inventory Cost</p>
          <p className="text-xl font-bold text-indigo-600">${totalInventoryValue.toFixed(2)}</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">By Category</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(byCategory).map(([category, count]) => (
            <div key={category} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 truncate" title={category}>{category}</p>
              <p className="text-lg font-bold text-gray-800">{count}</p>
            </div>
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
