// src/views/Scanner.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';

const Scanner = ({ db, collectionPath, setCurrentQrCodeId, setView, setCurrentProduct }) => {
  const scannerRef = useRef(null);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop().catch(e => console.warn('Scanner stop:', e));
      } catch (e) {
        console.warn('Scanner stop:', e);
      }
      scannerRef.current = null;
    }
  };

  const handleScanSuccess = useCallback(async (decodedText) => {
    console.log(`[Scanner] Raw scan: ${decodedText}`);
    stopScanner();

    let qrCodeId = decodedText.trim();
    let isExternalSKU = false;

    // if the scanned value looks like a URL, try to pull the last path segment
    if (qrCodeId.startsWith('http')) {
      try {
        const urlObj = new URL(qrCodeId);
        const segments = urlObj.pathname.split('/').filter(Boolean);
        const last = segments[segments.length - 1] || '';
        qrCodeId = decodeURIComponent(last);
      } catch (e) {
        console.warn('[Scanner] URL parsing failed, falling back to regex', e);
        const match = qrCodeId.match(/\/scan\/(.+?)(?:[\/?#]|$)/i); // eslint-disable-line no-useless-escape
        if (match) qrCodeId = match[1];
      }
    }

    // determine if it's a UUID (our native format)
    const isUUID = /^[a-f0-9-]{36}$/i.test(qrCodeId);
    if (!isUUID) {
      isExternalSKU = true;
    }

    // If it's external SKU, check for reference document
    if (isExternalSKU) {
      const sanitizedSKU = qrCodeId.replace(/[^a-zA-Z0-9-_]/g, '_');
      console.log(`[Scanner] Checking for external SKU reference: ${sanitizedSKU}`);
      
      try {
        const refDoc = doc(db, collectionPath, sanitizedSKU);
        const refSnap = await getDoc(refDoc);
        
        if (refSnap.exists() && refSnap.data().isExternalSKU) {
          // Found reference! Load the actual product
          const actualId = refSnap.data().redirectTo;
          console.log(`[Scanner] ✅ Found external SKU reference -> ${actualId}`);
          
          const productDoc = doc(db, collectionPath, actualId);
          const productSnap = await getDoc(productDoc);
          
          if (productSnap.exists()) {
            setCurrentQrCodeId(actualId);
            setCurrentProduct({ ...productSnap.data(), id: productSnap.id });
            setView('form');
            return;
          }
        }
        
        // No reference found - this is a NEW external item
        console.log('[Scanner] No reference found, creating new item with external SKU');
        const newQrCodeId = crypto.randomUUID();
        
        setCurrentQrCodeId(newQrCodeId);
        setCurrentProduct({
          itemType: 'inventory',
          externalSKU: qrCodeId,
          notes: `External QR Code: ${qrCodeId}`,
          description: 'Scanned from external source'
        });
        setView('form');
        return;
        
      } catch (error) {
        console.error('[Scanner] Error checking external SKU:', error);
      }
    }

    // Standard UUID - load directly
    console.log(`[Scanner] Loading product with UUID: ${qrCodeId}`);
    setCurrentQrCodeId(qrCodeId);

    try {
      const docRef = doc(db, collectionPath, qrCodeId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log('[Scanner] ✅ Found existing product');
        setCurrentProduct({ ...docSnap.data(), id: docSnap.id });
      } else {
        console.log('[Scanner] ℹ️ New product');
        setCurrentProduct(null);
      }

      setView('form');
    } catch (error) {
      console.error('[Scanner] Error:', error);
      alert(`Error loading product: ${error.message}`);
      setView('list');
    }
  }, [db, collectionPath, setCurrentQrCodeId, setCurrentProduct, setView]);

  // Load Html5Qrcode library
  useEffect(() => {
    if (window.Html5Qrcode) {
      setIsLibraryLoaded(true);
      return;
    }

    console.log('[Scanner] Loading Html5Qrcode library...');
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    script.async = true;
    
    script.onload = () => {
      console.log('[Scanner] Library loaded');
      setIsLibraryLoaded(true);
    };
    
    script.onerror = () => {
      console.error('[Scanner] Failed to load library');
      setCameraError('Failed to load scanner library');
    };
    
    document.body.appendChild(script);
    
    return () => {
      if (script.parentNode) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Start scanner when library is loaded
  useEffect(() => {
    if (!isLibraryLoaded || scannerRef.current) return;

    console.log('[Scanner] Starting camera...');
    const scanner = new window.Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      handleScanSuccess,
      () => {} // Ignore scan errors
    ).catch(err => {
      console.error('[Scanner] Failed to start:', err);
      setCameraError('Camera not available. Please allow camera access.');
      stopScanner();
    });

    return () => stopScanner();
  }, [isLibraryLoaded, handleScanSuccess]);

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-purple-600 text-white p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Scan QR Code</h2>
        <button
          onClick={() => {
            stopScanner();
            setView('list');
          }}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
        >
          Cancel
        </button>
      </div>

      {/* Scanner Area - Centered */}
      <div className="flex-1 flex items-center justify-center p-4">
        {!isLibraryLoaded && !cameraError && (
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-lg">Loading scanner...</p>
          </div>
        )}

        {cameraError && (
          <div className="bg-red-100 text-red-800 p-6 rounded-lg text-center max-w-md">
            <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-semibold mb-2">{cameraError}</p>
            <button
              onClick={() => {
                setCameraError(null);
                setIsLibraryLoaded(false);
                setTimeout(() => setIsLibraryLoaded(true), 100);
              }}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg"
            >
              Try Again
            </button>
          </div>
        )}

        <div 
          id="qr-reader" 
          className="w-full max-w-md rounded-lg overflow-hidden shadow-2xl"
          style={{ display: isLibraryLoaded && !cameraError ? 'block' : 'none' }}
        ></div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-800 text-white p-4 text-center">
        <p className="text-sm">Position the QR code within the frame</p>
        <p className="text-xs text-gray-400 mt-1">Scanner will automatically detect and process the code</p>
      </div>
    </div>
  );
};

export default Scanner;
