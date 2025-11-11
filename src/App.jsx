// src/App.jsx
import React, { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
  getFirestore, collection, query, onSnapshot, setLogLevel
} from 'firebase/firestore';

// Import Firebase config (your custom file)
import { firebaseConfig, myAppIdentifier } from './firebaseConfig';

// Import UI components (from your new components folder)
import Modal from './components/Modal.jsx';
import Spinner from './components/Spinner.jsx';
import Header from './components/Header.jsx';
import LoginScreen from './components/LoginScreen.jsx';

// Import View components (from your new views folder)
import InventoryList from './views/InventoryList.jsx';
import Scanner from './views/Scanner.jsx';
import ProductForm from './views/ProductForm.jsx';
import QrGenerator from './views/QrGenerator.jsx';
import QuickAdd from './views/QuickAdd.jsx';
import BulkQrGenerator from './views/BulkQrGenerator.jsx';

// Initialize Firebase with debug logging in development
setLogLevel(import.meta.env.MODE === 'development' ? 'debug' : 'error');
console.log('Initializing Firebase (safe init) with config: ', { apiKey: '***' });
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized');
} else {
  app = getApps()[0];
  console.log('Re-using existing Firebase app');
}
// Optional: App Check with reCAPTCHA v3 (protects Firestore/Storage)
// Provide VITE_RECAPTCHA_SITE_KEY in your environment to enable.
try {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (siteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    console.log('App Check initialized with reCAPTCHA v3');
  } else {
    console.log('App Check not initialized (no VITE_RECAPTCHA_SITE_KEY set)');
  }
} catch (e) {
  console.warn('App Check initialization skipped or failed:', e?.message || e);
}
const auth = getAuth(app);
const db = getFirestore(app);

function App() {
  // Authentication state
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // UI state
  const [view, setView] = useState('inventory'); // 'inventory', 'scanner', 'form', 'qrgen', 'quickadd', 'bulkqr'
  const [globalError, setGlobalError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Product state
  const [inventory, setInventory] = useState([]);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [currentQrCodeId, setCurrentQrCodeId] = useState(null);

  // Collection path for user's products
  const collectionPath = `artifacts/${myAppIdentifier}/users/${userId}/products`;

  // Handle authentication
  useEffect(() => {
    console.log('Starting authentication listener...');
    
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? 'User authenticated' : 'No user');
      if (user) {
        console.log('Setting user ID:', user.uid);
        setUserId(user.uid);
        setIsAuthReady(true);
      } else {
        console.log('No authenticated user');
        setIsAuthReady(true);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to inventory updates when auth is ready
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
        setIsLoading(false);
      },
      (error) => {
        console.error('Firestore error:', error);
        setGlobalError('Failed to load inventory. Please refresh.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, collectionPath]); // db is stable and doesn't need to be a dependency

  // Reset error after 5 seconds
  useEffect(() => {
    if (!globalError) return;
    const timer = setTimeout(() => setGlobalError(null), 5000);
    return () => clearTimeout(timer);
  }, [globalError]);

  if (!isAuthReady || isLoading) {
    return <Spinner text="Loading..." />;
  }

  // Handle login/signup
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

  const renderCurrentView = () => {
    switch (view) {
      case 'inventory':
        return (
          <InventoryList
            inventory={inventory}
            setView={setView}
            setCurrentProduct={setCurrentProduct}
            setCurrentQrCodeId={setCurrentQrCodeId}
          />
        );
      case 'scanner':
        return (
          <Scanner
            db={db}
            collectionPath={collectionPath}
            setView={setView}
            setCurrentProduct={setCurrentProduct}
            setCurrentQrCodeId={setCurrentQrCodeId}
            setGlobalError={setGlobalError}
            view={view}
          />
        );
      case 'form':
        return (
          <ProductForm
            db={db}
            collectionPath={collectionPath}
            currentProduct={currentProduct}
            currentQrCodeId={currentQrCodeId}
            setView={setView}
            setGlobalError={setGlobalError}
          />
        );
      case 'qrgen':
        return (
          <QrGenerator
            db={db}
            collectionPath={collectionPath}
            currentQrCodeId={currentQrCodeId}
            inventory={inventory}
            setView={setView}
            setGlobalError={setGlobalError}
          />
        );
      case 'quickadd':
        return (
          <QuickAdd
            db={db}
            collectionPath={collectionPath}
            onComplete={() => setView('inventory')}
          />
        );
      case 'bulkqr':
        return (
          <BulkQrGenerator
            setView={setView}
            setGlobalError={setGlobalError}
          />
        );
      case 'loading':
        return <Spinner text="Processing..." />;
      default:
        return <div>Invalid view state</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onNavigate={setView} 
        userId={userId}
        currentView={view}
      />
      
      {globalError && (
        <Modal
          isOpen={!!globalError}
          onClose={() => setGlobalError(null)}
        >
          <div className="p-4 text-red-600">{globalError}</div>
        </Modal>
      )}

      <main className="container mx-auto max-w-5xl py-4">
        {renderCurrentView()}
      </main>
    </div>
  );
}

export default App;
