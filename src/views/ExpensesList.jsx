import { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';

function ExpensesList({ expenses, setView, setCurrentProduct, setCurrentQrCodeId, db, collectionPath }) {
  const [expandedItem, setExpandedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.cost) || 0), 0);

  // ENHANCED: Search with SKU support
  const getShortId = (uuid) => {
    if (!uuid) return 'N/A';
    const parts = uuid.split('-');
    return parts[parts.length - 1].substring(0, 5).toUpperCase();
  };

  const filteredExpenses = expenses.filter(exp => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const shortSku = getShortId(exp.qrCodeId || exp.id).toLowerCase();
    return [exp.expenseName, exp.category, exp.supplier, exp.notes, shortSku]
      .filter(Boolean).map(f => String(f).toLowerCase()).some(f => f.includes(query));
  });

  const handleEdit = (expense) => {
    setCurrentProduct(expense);
    setCurrentQrCodeId(expense.qrCodeId || expense.id);
    setView('expenseForm');
  };

  const handleDelete = async (expenseId) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await deleteDoc(doc(db, collectionPath, expenseId));
      alert('✅ Expense deleted');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // NEW: Handle adding new expense without QR code
  const handleAddNew = () => {
    const newExpenseId = crypto.randomUUID();
    setCurrentQrCodeId(newExpenseId);
    setCurrentProduct({ itemType: 'expense' });
    setView('expenseForm');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header Stats */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-4xl">💵</span>
            <h2 className="text-2xl font-bold">Business Expenses</h2>
          </div>
          {/* NEW: Add Expense Button */}
          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Expense
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-green-50 p-3 rounded">
            <p className="text-sm text-gray-600">Total Expenses</p>
            <p className="text-xl font-bold text-green-600">{expenses.length}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-sm text-gray-600">Total Cost</p>
            <p className="text-xl font-bold text-blue-600">${totalExpenses.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* ENHANCED: Search Bar */}
      <div className="mb-4 bg-white rounded-lg shadow p-3">
        <div className="relative">
          <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="🔍 Search expenses by name, SKU, category, supplier..."
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
        {searchQuery && (
          <p className="text-sm text-gray-600 mt-2">
            Found <strong>{filteredExpenses.length}</strong> expense{filteredExpenses.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </p>
        )}
      </div>

      {/* Expense List */}
      {filteredExpenses.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          {expenses.length === 0 ? 'No expenses yet. Scan a QR code to add one!' : 'No matching expenses.'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExpenses.map((expense) => (
            <div key={expense.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{expense.expenseName || 'Untitled'}</h3>
                  <div className="flex gap-3 text-sm text-gray-600 mt-1">
                    <span>💵 ${parseFloat(expense.cost || 0).toFixed(2)}</span>
                    <span>📦 {expense.category}</span>
                    {expense.supplier && <span>🏪 {expense.supplier}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(expense)} className="px-3 py-1 bg-purple-600 text-white rounded text-sm">
                    Edit
                  </button>
                  <button onClick={() => setExpandedItem(expandedItem === expense.id ? null : expense.id)} className="px-3 py-1 bg-gray-200 rounded text-sm">
                    {expandedItem === expense.id ? 'Less' : 'More'}
                  </button>
                </div>
              </div>

              {expandedItem === expense.id && (
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3 text-sm">
                  {expense.purchaseDate && <><dt className="font-bold">Date:</dt><dd>{expense.purchaseDate}</dd></>}
                  {expense.createdBy && <><dt className="font-bold">Created By:</dt><dd>{expense.createdBy}</dd></>}
                  {expense.notes && <><dt className="font-bold col-span-2">Notes:</dt><dd className="col-span-2">{expense.notes}</dd></>}
                  <button onClick={() => handleDelete(expense.id)} className="col-span-2 mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm">
                    Delete Expense
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ExpensesList;
