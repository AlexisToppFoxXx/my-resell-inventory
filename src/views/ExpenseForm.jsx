import { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';

function ExpenseForm({ db, collectionPath, currentProduct, currentQrCodeId, setView }) {
  const [formData, setFormData] = useState({
    itemType: 'expense',
    expenseName: '',
    category: 'Shipping Supplies',
    cost: '',
    purchaseDate: '',
    supplier: '',
    createdBy: '',
    photoLink: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentProduct && currentProduct.itemType === 'expense') {
      // Load existing expense
      setFormData({
        itemType: 'expense',
        expenseName: currentProduct.expenseName || '',
        category: currentProduct.category || 'Shipping Supplies',
        cost: currentProduct.cost || '',
        purchaseDate: currentProduct.purchaseDate || '',
        supplier: currentProduct.supplier || '',
        createdBy: currentProduct.createdBy || '',
        photoLink: currentProduct.photoLink || '',
        notes: currentProduct.notes || ''
      });
    }
  }, [currentProduct]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.expenseName.trim()) {
      alert('Please enter an expense name');
      return;
    }
    
    if (!formData.createdBy) {
      alert('Please select who created this expense');
      return;
    }

    setSaving(true);

    try {
      const expenseData = {
        itemType: 'expense',
        expenseName: formData.expenseName,
        product: formData.expenseName, // For backward compatibility with search
        category: formData.category,
        cost: parseFloat(formData.cost) || 0,
        purchaseDate: formData.purchaseDate || '',
        supplier: formData.supplier || '',
        createdBy: formData.createdBy,
        photoLink: formData.photoLink || '',
        notes: formData.notes || '',
        qrCodeId: currentQrCodeId,
        createdAt: currentProduct?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, collectionPath, currentQrCodeId), expenseData, { merge: true });
      
      alert('✅ Expense saved successfully!');
      setView('expenses');
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Error saving expense: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl">💵</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {currentProduct?.expenseName ? 'Edit' : 'New'} Business Expense
            </h2>
            <p className="text-sm text-gray-500">Track office supplies, equipment, shipping materials, etc.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Expense Name - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expense Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.expenseName}
              onChange={(e) => setFormData({ ...formData, expenseName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Packing Foam Roll, Office Desk"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="Shipping Supplies">Shipping Supplies</option>
                <option value="Office Equipment">Office Equipment</option>
                <option value="Tools">Tools</option>
                <option value="Storage">Storage</option>
                <option value="Software/Subscriptions">Software/Subscriptions</option>
                <option value="Marketing">Marketing</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
              <input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0.00"
              />
            </div>

            {/* Purchase Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Vista Auction, Amazon"
              />
            </div>
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

          {/* Photo Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photo Link (Google Drive, iCloud, etc.)
            </label>
            <input
              type="url"
              value={formData.photoLink}
              onChange={(e) => setFormData({ ...formData, photoLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="https://drive.google.com/..."
            />
            {formData.photoLink && (
              <a
                href={formData.photoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 underline mt-1"
              >
                View Photos
              </a>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows="3"
              placeholder="Additional details about this expense..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Expense'}
            </button>
            <button
              type="button"
              onClick={() => setView('expenses')}
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

export default ExpenseForm;
