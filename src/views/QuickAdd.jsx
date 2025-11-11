import { useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';

function QuickAdd({ db, collectionPath, onComplete }) {
  const [items, setItems] = useState([{
    id: crypto.randomUUID(),
    title: '',
    vistaVLPN: '',
    oldNumber: '',
    category: 'clothes',
    listedOnEbay: false,
    hasVistaQR: false,
    notes: ''
  }]);
  const [saving, setSaving] = useState(false);

  const addBlankItem = () => {
    setItems([...items, {
      id: crypto.randomUUID(),
      title: '',
      vistaVLPN: '',
      oldNumber: '',
      category: 'clothes',
      listedOnEbay: false,
      hasVistaQR: false,
      notes: ''
    }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const savePromises = items
        .filter(item => item.title.trim()) // only save items with titles
        .map(item => {
          const productData = {
            title: item.title,
            category: item.category,
            vistaVLPN: item.vistaVLPN || '',
            oldNumber: item.oldNumber || '',
            listedOnEbay: item.listedOnEbay,
            hasVistaQR: item.hasVistaQR,
            notes: item.notes || '',
            createdAt: new Date().toISOString(),
            quickImport: true
          };
          return setDoc(doc(db, collectionPath, item.id), productData);
        });
      
      await Promise.all(savePromises);
      alert(`✅ Saved ${savePromises.length} items!`);
      onComplete();
    } catch (error) {
      console.error('Error saving items:', error);
      alert('Error saving items: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="text-2xl font-bold mb-2">Quick Add - Batch Import</h2>
        <p className="text-gray-600 mb-4">
          Quickly add existing inventory. Fill in what you know, leave the rest blank.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start mb-3">
              <span className="text-sm font-semibold text-gray-500">Item #{index + 1}</span>
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Title *"
                value={item.title}
                onChange={(e) => updateItem(index, 'title', e.target.value)}
                className="border rounded p-2 col-span-full"
              />
              
              <select
                value={item.category}
                onChange={(e) => updateItem(index, 'category', e.target.value)}
                className="border rounded p-2"
              >
                <option value="clothes">Clothes</option>
                <option value="vista">Vista Auction</option>
                <option value="electronics">Electronics</option>
                <option value="other">Other</option>
              </select>

              <input
                type="text"
                placeholder="Vista VLPN (optional)"
                value={item.vistaVLPN}
                onChange={(e) => updateItem(index, 'vistaVLPN', e.target.value)}
                className="border rounded p-2"
              />

              <input
                type="text"
                placeholder="Old # (optional)"
                value={item.oldNumber}
                onChange={(e) => updateItem(index, 'oldNumber', e.target.value)}
                className="border rounded p-2"
              />

              <label className="flex items-center space-x-2 border rounded p-2 bg-gray-50">
                <input
                  type="checkbox"
                  checked={item.listedOnEbay}
                  onChange={(e) => updateItem(index, 'listedOnEbay', e.target.checked)}
                />
                <span className="text-sm">Listed on eBay</span>
              </label>

              <label className="flex items-center space-x-2 border rounded p-2 bg-gray-50">
                <input
                  type="checkbox"
                  checked={item.hasVistaQR}
                  onChange={(e) => updateItem(index, 'hasVistaQR', e.target.checked)}
                />
                <span className="text-sm">Has Vista QR</span>
              </label>

              <input
                type="text"
                placeholder="Notes (optional)"
                value={item.notes}
                onChange={(e) => updateItem(index, 'notes', e.target.value)}
                className="border rounded p-2 col-span-full"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={addBlankItem}
          className="flex-1 bg-green-500 text-white py-3 rounded hover:bg-green-600"
        >
          + Add Another Item
        </button>
        <button
          onClick={handleSaveAll}
          disabled={saving || !items.some(item => item.title.trim())}
          className="flex-1 bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:bg-gray-300"
        >
          {saving ? 'Saving...' : `Save All (${items.filter(i => i.title.trim()).length})`}
        </button>
        <button
          onClick={onComplete}
          className="px-6 bg-gray-300 text-gray-700 py-3 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default QuickAdd;
