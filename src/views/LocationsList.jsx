import { useState } from 'react';

function LocationsList({ locations, inventory, setView, setCurrentProduct, setCurrentQrCodeId }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); // NEW: Search state

  const handleEdit = (location) => {
    setCurrentProduct(location);
    setCurrentQrCodeId(location.qrCodeId || location.id);
    setView('locationForm');
  };

  const handleAddNew = () => {
    const newLocationId = crypto.randomUUID();
    setCurrentQrCodeId(newLocationId);
    setCurrentProduct({ itemType: 'location' });
    setView('locationForm');
  };

  const getInventoryAtLocation = (locationName) => {
    return inventory.filter(item => item.location === locationName);
  };

  // NEW: Filter locations by search
  const filteredLocations = locations.filter(loc => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return [loc.locationName, loc.locationType, loc.description]
      .filter(Boolean).map(f => f.toLowerCase()).some(f => f.includes(query));
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">📍</span>
            <div>
              <h2 className="text-2xl font-bold">Storage Locations</h2>
              <p className="text-sm text-gray-600">{locations.length} location markers</p>
            </div>
          </div>
          {/* NEW: Add Location Button */}
          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Location
          </button>
        </div>
      </div>

      {/* NEW: Search Bar */}
      {locations.length > 0 && (
        <div className="mb-4 bg-white rounded-lg shadow p-3">
          <div className="relative">
            <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="🔍 Search locations by name or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {locations.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No locations yet. Scan a QR code to create one!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLocations.map((loc) => {
            const itemsHere = getInventoryAtLocation(loc.locationName);
            return (
              <div key={loc.id} className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition" onClick={() => setSelectedLocation(loc)}>
                <h3 className="text-xl font-bold">📍 {loc.locationName}</h3>
                <p className="text-sm text-gray-600">{loc.locationType}</p>
                <p className="text-lg font-semibold text-purple-600 mt-2">{itemsHere.length} items here</p>
                <button onClick={(e) => { e.stopPropagation(); handleEdit(loc); }} className="mt-2 px-3 py-1 bg-purple-600 text-white rounded text-sm">
                  Edit Location
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Location Detail Modal */}
      {selectedLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedLocation(null)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4">📍 {selectedLocation.locationName}</h2>
            <p className="text-gray-600 mb-4">{getInventoryAtLocation(selectedLocation.locationName).length} items at this location</p>
            <div className="space-y-2">
              {getInventoryAtLocation(selectedLocation.locationName).map(item => (
                <div key={item.id} className="p-3 bg-gray-50 rounded flex justify-between">
                  <span>{item.product}</span>
                  <span className={item.soldDate ? 'text-red-500' : 'text-green-600'}>{item.soldDate ? 'SOLD' : 'Available'}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setSelectedLocation(null)} className="mt-4 px-4 py-2 bg-gray-300 rounded w-full">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationsList;
