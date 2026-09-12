// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
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
  getFirestore, collection, query, onSnapshot, setLogLevel, doc, getDoc, setDoc
} from 'firebase/firestore';
import { normalizePlatform, normalizePlatforms } from './utils';

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

  // ref to make sure platform migration only runs once
  const migratedRef = useRef(false);

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
  // mirror inventory and perform one-time normalization of messy platform values
  useEffect(() => {
    if (!userId) return;

    const productsQuery = query(collection(db, collectionPath));

    const unsubscribe = onSnapshot(productsQuery, 
      async (snapshot) => {
        const products = [];
        const migrationPromises = [];

        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          // handle platform migration to array
          let platforms = [];

          if (Array.isArray(data.platforms)) {
            // normalize each entry in existing array
            platforms = normalizePlatforms(data.platforms);
          } else if (data.platform) {
            // legacy single string field -- convert to array
            platforms = normalizePlatforms(data.platform);
          }

          // if migration necessary (either platforms array empty but string exists,
          // or normalization changed values), write back
          const needsUpdate = (() => {
            if (!Array.isArray(data.platforms) && platforms.length > 0) return true;
            if (Array.isArray(data.platforms)) {
              const existing = normalizePlatforms(data.platforms);
              return JSON.stringify(existing) !== JSON.stringify(platforms);
            }
            return false;
          })();

          if (needsUpdate) {
            migrationPromises.push(
              setDoc(doc(db, collectionPath, docSnap.id), { platforms }, { merge: true })
            );
          }

          products.push({ ...data, id: docSnap.id, platforms });
        });

        // update inventory state immediately for counting
        setInventory(products);

        // run migrations but don't await before rendering
        if (!migratedRef.current && migrationPromises.length > 0) {
          migratedRef.current = true;
          Promise.allSettled(migrationPromises).then(results => {
            console.log('[App] Platform migration results', results);
          }).catch(err => console.error('[App] migration error', err));
        }
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
    // capture the first segment after /scan/ (stop at slash, ? or #)
    const scanMatch = path.match(/\/scan\/([^/?#]+)/);
    if (!scanMatch) return;

    const rawValue = decodeURIComponent(scanMatch[1]);
    console.log('[App] QR scanned from URL:', rawValue);

    const loadProduct = async () => {
      try {
        // Try to load the value as a normal document id first
        const docRef = doc(db, collectionPath, rawValue);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          console.log('[App] ✅ Loading existing product');
          const productData = { ...docSnap.data(), id: docSnap.id };
          setCurrentProduct(productData);
          setCurrentQrCodeId(rawValue);
        } else {
          // treat anything that isn’t in Firestore as an external SKU
          console.log('[App] ℹ️ Value not found in database, assuming external SKU');
          const newUid = crypto.randomUUID();
          setCurrentQrCodeId(newUid);
          setCurrentProduct({
            itemType: 'inventory',
            externalSKU: rawValue,
            notes: `External QR Code: ${rawValue}`,
            description: 'Scanned from external source (Vista Auction or other)'
          });
        }

        setView('form');
      } catch (error) {
        console.error('[App] Error loading product:', error);
        setGlobalError(`Error loading product: ${error.message}`);
      }
    };

    loadProduct();
    window.history.replaceState({}, '', '/');
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
            setGlobalError={setGlobalError}
            // update inventory locally when a delete occurs so counters update immediately
            onItemDeleted={(id) => setInventory(prev => prev.filter(p => p.id !== id))}
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
