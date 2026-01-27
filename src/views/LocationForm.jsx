import { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';

function LocationForm({ db, collectionPath, currentProduct, currentQrCodeId, setView }) {
  const [formData, setFormData] = useState({
    itemType: 'location',
    locationName: '',
    locationType: 'Storage Area',
    description: '',
    createdBy: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentProduct && currentProduct.itemType === 'location') {
      // Load existing location
      setFormData({
        itemType: 'location',
        locationName: currentProduct.locationName || '',
        locationType: currentProduct.locationType || 'Storage Area',
        description: currentProduct.description || '',
        createdBy: currentProduct.createdBy || '',
        notes: currentProduct.notes || ''
      });
    }
  }, [currentProduct]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.locationName.trim()) {
      alert('Please enter a location name');
      return;
    }
    
    if (!formData.createdBy) {
      alert('Please select who created this location marker');
      return;
    }

    setSaving(true);

    try {
      const locationData = {
        itemType: 'location',
        locationName: formData.locationName,
        product: formData.locationName, // For backward compatibility with search
        locationType: formData.locationType,
        description: formData.description || '',
        createdBy: formData.createdBy,
        notes: formData.notes || '',
        qrCodeId: currentQrCodeId,
        createdAt: currentProduct?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, collectionPath, currentQrCodeId), locationData, { merge: true });
      
      alert('✅ Location marker saved successfully!');
      setView('locations');
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Error saving location: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl">📍</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {currentProduct?.locationName ? 'Edit' : 'New'} Location Marker
            </h2>
            <p className="text-sm text-gray-500">Mark storage areas to track inventory locations</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location Name - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.locationName}
              onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Storage Shed, Garage, Crate A"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location Type</label>
              <select
                value={formData.locationType}
                onChange={(e) => setFormData({ ...formData, locationType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="Storage Area">Storage Area</option>
                <option value="Warehouse">Warehouse</option>
                <option value="Room">Room</option>
                <option value="Shelf">Shelf</option>
                <option value="Crate/Box">Crate/Box</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Created By - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Created By <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.createdBy}
                onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">-- Select Creator --</option>
                <option value="Boss Doss">Boss Doss</option>
                <option value="DJ Nipsey">DJ Nipsey</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows="2"
              placeholder="Brief description of this location..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows="3"
              placeholder="Additional notes about this location..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Location'}
            </button>
            <button
              type="button"
              onClick={() => setView('locations')}
              className="px-8 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LocationForm;
