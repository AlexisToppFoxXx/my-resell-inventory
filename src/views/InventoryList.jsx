// src/views/QrGenerator.jsx
import React from 'react';

const InventoryList = ({ inventory, setView, setCurrentProduct, setCurrentQrCodeId }) => {
  // Copy the entire InventoryList component function here
  const calculateProfit = (item) => {
    const sellPrice = parseFloat(item.sellPrice) || 0;
    const purchasePrice = parseFloat(item.purchasePrice) || 0;
    const sellingFees = parseFloat(item.sellingFees) || 0;
    if (sellPrice === 0) return null; // Not sold yet
    return (sellPrice - purchasePrice - sellingFees).toFixed(2);
  };

  const getConditionClass = (condition) => {
    switch (condition) {
      case 'New': return 'bg-green-100 text-green-800';
      case 'Used - Open Box': return 'bg-yellow-100 text-yellow-800';
      case 'For Parts': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEdit = (item) => {
    setCurrentProduct(item);
    setCurrentQrCodeId(item.qrCodeId);
    setView('form');
  };

  return (
    <div className="p-4">
      {inventory.length === 0 ? (
        <div className="text-center p-10 border-2 border-dashed border-gray-300 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M4 4h16v16H4V4z" /></svg>
          <h3 className="mt-2 text-xl font-medium text-gray-900">No Inventory Found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by scanning your first item.</p>
          <button
            onClick={() => setView('scanner')}
            className="mt-6 bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-lg shadow hover:bg-indigo-700"
          >
            Scan First Item
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {inventory.map(item => {
            const profit = calculateProfit(item);
            return (
              <div
                key={item.qrCodeId}
                className="bg-white p-4 rounded-lg shadow-md border border-gray-200 cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => handleEdit(item)}
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-lg font-semibold text-indigo-700">{item.productName || "Untitled Item"}</h4>
                  {profit !== null ? (
                    <span className={`font-bold text-lg ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${profit}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">Not Sold</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600 mt-2">
                  <span>SKU: <span className="font-medium text-gray-900">{item.sku || 'N/A'}</span></span>
                  <span>Cost: <span className="font-medium text-gray-900">${parseFloat(item.purchasePrice || 0).toFixed(2)}</span></span>
                  {item.condition && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getConditionClass(item.condition)}`}>
                      {item.condition}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default InventoryList; // Export it
