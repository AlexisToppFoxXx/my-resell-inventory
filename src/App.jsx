// src/App.jsx
import React, { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  signInAnonymously,
  setPersistence,
  browserLocalPersistence // NEW: Import persistence
} from 'firebase/auth';
import {
  getFirestore, collection, query, onSnapshot, setLogLevel, doc, getDoc
} from 'firebase/firestore';

import { firebaseConfig, myAppIdentifier } from './firebaseConfig';

import Modal from './components/Modal.jsx';
import Spinner from './components/Spinner.jsx';
import Header from './components/Header.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import InventoryStats from './components/InventoryStats';
import ItemTypeModal from './components/ItemTypeModal';

import InventoryList from './views/InventoryList';
import Scanner from './views/Scanner';
import ProductForm from './views/ProductForm';
import QrGenerator from './views/QrGenerator';
import QuickAdd from './views/QuickAdd';
import ExpenseForm from './views/ExpenseForm';
import LocationForm from './views/LocationForm';
import ExpensesList from './views/ExpensesList';
import LocationsList from './views/LocationsList';
import SoldInventory from './views/SoldInventory'; // NEW

// Initialize Firebase with debug logging in development
setLogLevel(import.meta.env.MODE === 'development' ? 'debug' : 'error');

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// TEMPORARILY DISABLE AppCheck to test
/*
try {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (siteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
} catch (e) {
  console.warn('App Check initialization failed:', e?.message || e);
}
*/

const auth = getAuth(app);
const db = getFirestore(app);

// NEW: Set auth persistence to LOCAL (survives navigation/tab switches)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to set auth persistence:', error);
});

function App() {
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState('list');
  const [currentView, setCurrentView] = useState('inventory');
  const [globalError, setGlobalError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [currentQrCodeId, setCurrentQrCodeId] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const collectionPath = `artifacts/${myAppIdentifier}/users/${userId}/products`;

  // Handle authentication - WITH PERSISTENCE
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('[App] User authenticated:', user.uid);
        setUserId(user.uid);
      } else {
        console.log('[App] No user, attempting anonymous sign-in...');
        // Auto sign-in anonymously if no user
        signInAnonymously(auth).catch((error) => {
          console.error('Anonymous sign-in failed:', error);
        });
      }
      setIsAuthReady(true);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to inventory updates
  useEffect(() => {
    if (!userId) return;

    const productsQuery = query(collection(db, collectionPath));
    const unsubscribe = onSnapshot(productsQuery, 
      (snapshot) => {
        const products = [];
        snapshot.forEach(doc => {
          products.push({ ...doc.data(), id: doc.id });
        });
        setInventory(products);
      },
      (error) => {
        console.error('Firestore error:', error);
        setGlobalError('Failed to load inventory');
      }
    );
    return () => unsubscribe();
  }, [userId, collectionPath]);

  // Reset error after 5 seconds
  useEffect(() => {
    if (!globalError) return;
    const timer = setTimeout(() => setGlobalError(null), 5000);
    return () => clearTimeout(timer);
  }, [globalError]);

  // Handle online/offline status changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle QR code scans from URL (phone camera)
  useEffect(() => {
    if (!userId) return;

    const path = window.location.pathname;
    const scanMatch = path.match(/\/scan\/([a-f0-9-]{36})/i);
    
    if (scanMatch) {
      const qrCodeId = scanMatch[1];
      console.log('[App] QR scanned from URL:', qrCodeId);
      
      const loadProduct = async () => {
        try {
          const docRef = doc(db, collectionPath, qrCodeId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            console.log('[App] ✅ Loading existing product');
            const productData = { ...docSnap.data(), id: docSnap.id };
            console.log('[App] Product data:', productData);
            setCurrentProduct(productData);
          } else {
            console.log('[App] ℹ️ New product (not in database)');
            setCurrentProduct(null);
          }
          
          setCurrentQrCodeId(qrCodeId);
          setView('form');
        } catch (error) {
          console.error('[App] Error loading product:', error);
          setGlobalError(`Error loading product: ${error.message}`);
        }
      };
      
      loadProduct();
      window.history.replaceState({}, '', '/');
    } else {
      // Check if it's an external QR code URL (Vista Auction, etc.)
      const externalQRMatch = path.match(/\/scan\/(.+)/);
      if (externalQRMatch) {
        console.log('[App] External QR code detected from URL');
        const externalValue = decodeURIComponent(externalQRMatch[1]);
        const newQrCodeId = crypto.randomUUID();
        
        setCurrentQrCodeId(newQrCodeId);
        setCurrentProduct({
          itemType: 'inventory',
          externalSKU: externalValue, // NEW: Store external QR value
          notes: `External QR Code: ${externalValue}`,
          description: 'Scanned from external source (Vista Auction or other)'
        });
        setView('form');
        window.history.replaceState({}, '', '/');
      }
    }
  }, [userId, db, collectionPath]);

  // FIXED: Only show spinner during initial load
  if (!isAuthReady) {
    return <Spinner text="Loading..." />;
  }

  const handleLogin = async (email, password, isSignUp) => {
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  };

  // Show login screen if not authenticated
  if (!userId) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const handleNavigate = (newView) => {
    console.log('[App] Navigating to:', newView);
    setCurrentView(newView);
    setCurrentProduct(null);
    setCurrentQrCodeId(null);
    
    // Map navigation to view
    if (newView === 'inventory') setView('list');
    else if (newView === 'sold') setView('sold'); // NEW
    else if (newView === 'expenses') setView('expenses');
    else if (newView === 'locations') setView('locations');
    else if (newView === 'scanner') setView('scanner');
    else if (newView === 'quickadd') setView('quickadd');
    else if (newView === 'bulkqr') setView('bulkqr');
  };

  // FIXED: Always render app container once authenticated
  return (
    <div className="min-h-screen bg-gray-100">
      <Header 
        setView={setView}
        userId={userId}
        currentView={currentView}
        onNavigate={handleNavigate}
        isOnline={isOnline}
      />

      {globalError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-auto max-w-4xl mt-4 rounded">
          {globalError}
        </div>
      )}

      <div className="container mx-auto p-4">
        {/* Add fallback for empty inventory */}
        {view === 'list' && inventory.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg text-center">
            <p className="text-lg">No inventory items yet. Click "Quick Add" to get started!</p>
          </div>
        )}

        {view === 'list' && (
          <InventoryList
            inventory={inventory.filter(item => !item.itemType || item.itemType === 'inventory')}
            setView={setView}
            setCurrentProduct={setCurrentProduct}
            setCurrentQrCodeId={setCurrentQrCodeId}
            db={db}
            collectionPath={collectionPath}
            setGlobalError={setGlobalError}
          />
        )}

        {view === 'expenses' && (
          <ExpensesList
            expenses={inventory.filter(item => item.itemType === 'expense')}
            setView={setView}
            setCurrentProduct={setCurrentProduct}
            setCurrentQrCodeId={setCurrentQrCodeId}
            db={db}
            collectionPath={collectionPath}
          />
        )}

        {view === 'locations' && (
          <LocationsList
            locations={inventory.filter(item => item.itemType === 'location')}
            inventory={inventory.filter(item => !item.itemType || item.itemType === 'inventory')}
            setView={setView}
            setCurrentProduct={setCurrentProduct}
            setCurrentQrCodeId={setCurrentQrCodeId}
          />
        )}

        {view === 'scanner' && (
          <Scanner
            db={db}
            collectionPath={collectionPath}
            setCurrentQrCodeId={setCurrentQrCodeId}
            setView={setView}
            setCurrentProduct={setCurrentProduct}
          />
        )}

        {view === 'form' && (
          <ProductForm
            db={db}
            collectionPath={collectionPath}
            currentProduct={currentProduct}
            currentQrCodeId={currentQrCodeId}
            setView={setView}
          />
        )}

        {view === 'expenseForm' && (
          <ExpenseForm
            db={db}
            collectionPath={collectionPath}
            currentProduct={currentProduct}
            currentQrCodeId={currentQrCodeId}
            setView={setView}
          />
        )}

        {view === 'locationForm' && (
          <LocationForm
            db={db}
            collectionPath={collectionPath}
            currentProduct={currentProduct}
            currentQrCodeId={currentQrCodeId}
            setView={setView}
          />
        )}

        {view === 'quickadd' && (
          <QuickAdd
            db={db}
            collectionPath={collectionPath}
            setView={setView}
            onComplete={() => {
              setView('list');
              setCurrentView('inventory');
            }}
          />
        )}

        {view === 'bulkqr' && <QrGenerator />}

        {/* NEW: Sold Inventory View */}
        {view === 'sold' && (
          <SoldInventory
            inventory={inventory}
            setView={setView}
            setCurrentProduct={setCurrentProduct}
            setCurrentQrCodeId={setCurrentQrCodeId}
            db={db}
            collectionPath={collectionPath}
            setGlobalError={setGlobalError}
          />
        )}
      </div>
    </div>
  );
}

export default App;
