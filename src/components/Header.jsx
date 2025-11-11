// src/components/Header.js
import React from 'react';
import { getAuth, signOut } from 'firebase/auth';

const Header = ({ setView, userId, currentView, onNavigate }) => {
  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="bg-blue-600 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setView('list')}
        >
          <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H7a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          <h1 className="text-2xl font-bold text-gray-900">ResellFlow</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('inventory')}
            className={`px-4 py-2 rounded ${userId === 'inventory' ? 'bg-blue-800' : 'bg-blue-500 hover:bg-blue-700'}`}
          >
            Inventory
          </button>
          <button
            onClick={() => setView('scanner')}
            className={`px-4 py-2 rounded ${userId === 'scanner' ? 'bg-blue-800' : 'bg-blue-500 hover:bg-blue-700'}`}
          >
            Scan QR
          </button>
          <button
            onClick={() => setView('quickadd')}
            className={`px-4 py-2 rounded ${userId === 'quickadd' ? 'bg-blue-800' : 'bg-blue-500 hover:bg-blue-700'}`}
          >
            Quick Add
          </button>
          <button 
            onClick={() => onNavigate('bulkqr')}
            className={`px-4 py-2 rounded ${currentView === 'bulkqr' ? 'bg-blue-800' : 'bg-blue-500 hover:bg-blue-700'}`}
          >
            🖨️ Bulk QR
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setView('generator')}
            className="text-sm text-gray-600 hover:text-indigo-600"
            title="Print QR Codes"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm-4-8V5a2 2 0 012-2h6a2 2 0 012 2v4" /></svg>
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-red-600"
            title="Logout"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </div>
      {userId && (
        <div className="bg-gray-100 text-center py-1 px-4">
          <p className="text-xs text-gray-500 truncate">Logged in</p>
        </div>
      )}
    </header>
  );
};
export default Header; // Export it
