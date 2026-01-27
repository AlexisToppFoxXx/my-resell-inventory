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
    <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center">
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setView('list')}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H7a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            <h1 className="text-2xl font-bold text-white">ResellFlow</h1>
          </div>
          
          {/* Main Navigation - Purple/Indigo theme */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={(e) => {
                e.preventDefault();
                onNavigate('inventory');
              }}
              className={`px-4 py-2 rounded font-medium transition-all ${
                currentView === 'inventory' 
                  ? 'bg-purple-800 shadow-lg' 
                  : 'bg-purple-500 hover:bg-purple-700'
              }`}
            >
              🏷️ Inventory
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                onNavigate('sold');
              }}
              className={`px-4 py-2 rounded font-medium transition-all ${
                currentView === 'sold' 
                  ? 'bg-purple-800 shadow-lg' 
                  : 'bg-purple-500 hover:bg-purple-700'
              }`}
            >
              💰 Sold
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                onNavigate('expenses');
              }}
              className={`px-4 py-2 rounded font-medium transition-all ${
                currentView === 'expenses' 
                  ? 'bg-purple-800 shadow-lg' 
                  : 'bg-purple-500 hover:bg-purple-700'
              }`}
            >
              💵 Expenses
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                onNavigate('locations');
              }}
              className={`px-4 py-2 rounded font-medium transition-all ${
                currentView === 'locations' 
                  ? 'bg-purple-800 shadow-lg' 
                  : 'bg-purple-500 hover:bg-purple-700'
              }`}
            >
              📍 Locations
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                onNavigate('scanner');
              }}
              className={`px-4 py-2 rounded font-medium transition-all ${
                currentView === 'scanner' 
                  ? 'bg-purple-800 shadow-lg' 
                  : 'bg-purple-500 hover:bg-purple-700'
              }`}
            >
              Scan QR
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                onNavigate('quickadd');
              }}
              className={`px-4 py-2 rounded font-medium transition-all ${
                currentView === 'quickadd' 
                  ? 'bg-purple-800 shadow-lg' 
                  : 'bg-purple-500 hover:bg-purple-700'
              }`}
            >
              Quick Add
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                onNavigate('bulkqr');
              }}
              className={`px-4 py-2 rounded font-medium transition-all ${
                currentView === 'bulkqr' 
                  ? 'bg-purple-800 shadow-lg' 
                  : 'bg-purple-500 hover:bg-purple-700'
              }`}
            >
              🖨️ Bulk QR
            </button>
          </div>
          
          {/* Logout */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="text-sm text-white hover:text-red-300 transition-colors"
              title="Logout"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>

        {/* Quick Links to Platforms - Orange/Amber contrast */}
        <div className="mt-3 pt-3 border-t border-purple-400">
          <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
            <span className="text-sm text-purple-200 hidden md:inline">Quick Links:</span>
            <a
              href="https://www.ebay.com/sh/lst/active"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 md:px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded text-xs md:text-sm transition-colors font-medium shadow-md"
              title="Open eBay Active Listings"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7.5 21c-1.9 0-3.5-1.6-3.5-3.5S5.6 14 7.5 14s3.5 1.6 3.5 3.5S9.4 21 7.5 21zm9 0c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zM6 6l2.5 6h7l3.5-6H6zM2 3h3l1 2h14l-4 8H9L7 8H4L2 3z"/>
              </svg>
              eBay
            </a>
            <a
              href="https://poshmark.com/closet"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 md:px-3 py-1.5 bg-amber-500 hover:bg-amber-600 rounded text-xs md:text-sm transition-colors font-medium shadow-md"
              title="Open Poshmark Closet"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
              Poshmark
            </a>
            <a
              href="https://www.facebook.com/marketplace/you/selling"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 md:px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 rounded text-xs md:text-sm transition-colors font-medium shadow-md"
              title="Open Facebook Marketplace"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/>
              </svg>
              FB Marketplace
            </a>
          </div>
        </div>
      </div>
      
      {userId && (
        <div className="bg-purple-700 text-center py-1 px-4">
          <p className="text-xs text-white truncate">Logged in</p>
        </div>
      )}
    </header>
  );
};
export default Header;
