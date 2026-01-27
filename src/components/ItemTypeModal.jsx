import React from 'react';

const ItemTypeModal = ({ isOpen, onClose, onSelectType }) => {
  if (!isOpen) return null;

  const itemTypes = [
    {
      type: 'inventory',
      icon: '🏷️',
      title: 'Inventory Item',
      description: 'Track for resale, profit tracking, etc.',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    {
      type: 'expense',
      icon: '💵',
      title: 'Business Expense',
      description: 'Office supplies, equipment, shipping materials, etc.',
      color: 'bg-green-50 hover:bg-green-100 border-green-200'
    },
    {
      type: 'location',
      icon: '📍',
      title: 'Location Marker',
      description: 'Mark storage areas (shed, garage, crate, etc.)',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900 opacity-75" onClick={onClose}></div>
        </div>

        {/* Modal Content */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
            <h3 className="text-xl font-bold text-white">What would you like to track?</h3>
            <p className="text-sm text-purple-100 mt-1">Choose how to use this QR code</p>
          </div>

          <div className="bg-white px-6 py-6 space-y-3">
            {itemTypes.map((item) => (
              <button
                key={item.type}
                onClick={() => onSelectType(item.type)}
                className={`w-full p-4 rounded-lg border-2 ${item.color} transition-all transform hover:scale-105 text-left`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{item.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{item.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          <div className="bg-gray-50 px-6 py-3">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemTypeModal;
