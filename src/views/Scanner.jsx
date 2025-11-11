// src/views/QrGenerator.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getDoc, doc } from 'firebase/firestore'; // Import Firestore functions
import Spinner from '../components/Spinner'; // Import Spinner component

// --- Script Loading States ---
const SCRIPT_STATUS = {
  PENDING: 'pending',
  LOADED: 'loaded',
  ERROR: 'error',
};

/* External Script Loader Hook */
const useScript = (url, globalObjectName) => {
  const [status, setStatus] = useState(SCRIPT_STATUS.PENDING);
  const onLoadRef = useRef(null);

  const checkGlobalAndResolve = useCallback(() => {
    const maxTime = 5000;
    const startTime = Date.now();

    const check = () => {
      if (window[globalObjectName]) {
        console.log(`[ScriptLoader] Global ${globalObjectName} found. Status: LOADED`);
        setStatus(SCRIPT_STATUS.LOADED);
        return;
      }

      if (Date.now() - startTime < maxTime) {
        onLoadRef.current = setTimeout(check, 100);
      } else {
        console.error(`[ScriptLoader] Timeout: Global ${globalObjectName} not found after 5s. URL: ${url}`);
        setStatus(SCRIPT_STATUS.ERROR);
      }
    };
    check();
  }, [globalObjectName, url]);

  useEffect(() => {
    setStatus(SCRIPT_STATUS.PENDING);

    if (globalObjectName && window[globalObjectName]) {
      setStatus(SCRIPT_STATUS.LOADED);
      return;
    }

    let script = document.querySelector(`script[src="${url}"]`);

    const handleLoad = () => {
      console.log(`[ScriptLoader] Script tag loaded for: ${url}. Starting global check.`);
      checkGlobalAndResolve();
    };

    const handleError = () => {
        console.error(`[ScriptLoader] Failed to load script tag: ${url}`);
        setStatus(SCRIPT_STATUS.ERROR);
    };

    if (script) {
      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);
    } else {
      console.log(`[ScriptLoader] Creating new script tag for: ${url}`);
      script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);
      document.body.appendChild(script);
    }

    return () => {
      clearTimeout(onLoadRef.current);
      if (script) {
        script.removeEventListener('load', handleLoad);
        script.removeEventListener('error', handleError);
      }
    };
  }, [url, globalObjectName, checkGlobalAndResolve]);

  return status;
};


const Scanner = ({ db, collectionPath, setView, setCurrentProduct, setCurrentQrCodeId, setGlobalError, view }) => {
  // Copy the entire Scanner component function here
  const scannerStatus = useScript("https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js", "Html5Qrcode");
  const scannerReady = scannerStatus === SCRIPT_STATUS.LOADED;
  const scannerRef = useRef(null);

  const stopScanner = () => {
    try {
      if (scannerRef.current && typeof scannerRef.current.stop === 'function') {
        scannerRef.current.stop().catch(err => console.warn("Scanner stop failed:", err));
      }
    } catch (e) {
      console.warn('Gracefully ignoring scanner stop error:', e);
    } finally {
      // Ensure we don't try to reuse a potentially bad instance
      scannerRef.current = null;
    }
  };

  const onScanSuccess = useCallback(async (decodedText, decodedResult) => {
    console.log(`[Scanner] Scan successful, QR Code ID: ${decodedText}`);
    
    // Immediately prevent any default browser behavior
    if (window.event) {
      window.event.preventDefault();
      window.event.stopPropagation();
    }
    
    // Stop scanner immediately to prevent multiple scans
    stopScanner();

    const qrCodeId = decodedText.trim();
    console.log(`[Scanner] Setting current QR Code ID: ${qrCodeId}`);
    
    // Ensure we stay on the current page
    if (window.location.href !== window.location.origin + window.location.pathname) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    
    setCurrentQrCodeId(qrCodeId);

    try {
      console.log('[Scanner] Checking database for product...');
      console.log('[Scanner] Collection path:', collectionPath);
      console.log('[Scanner] Document ID:', qrCodeId);
      
      const docRef = doc(db, collectionPath, qrCodeId);
      console.log('[Scanner] Created doc reference, attempting getDoc...');
      
      // Add a timeout to catch hanging requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore request timeout after 10s')), 10000)
      );
      
      const docSnap = await Promise.race([
        getDoc(docRef),
        timeoutPromise
      ]);

      console.log('[Scanner] getDoc completed successfully');

      if (docSnap.exists()) {
        console.log('[Scanner] Product found in database:', docSnap.data());
        setCurrentProduct(docSnap.data());
      } else {
        console.log('[Scanner] Product not found, will create new');
        setCurrentProduct(null);
      }

      // Navigate to form
      console.log('[Scanner] Navigating to form view');
      setView('form');
      console.log('[Scanner] setView called');

    } catch (err) {
      console.error("[Scanner] Error in scan flow:", err);
      console.error("[Scanner] Error code:", err?.code);
      console.error("[Scanner] Error message:", err?.message);
      
      let hint = '';
      if (err?.code === 'permission-denied') {
        hint = ' (Firestore rules or App Check enforcement blocked the request)';
      } else if (err?.code === 'unavailable') {
        hint = ' (Network issue – check connection)';
      } else if (err?.code === 'not-found') {
        hint = ' (Document not found – creating new)';
      } else if (err?.message?.includes('timeout')) {
        hint = ' (Request took too long – check network or Firestore rules)';
      }
      
      setGlobalError(`Error checking database for QR Code: ${err.message || 'Missing or insufficient permissions'}${hint}`);
      console.log('[Scanner] Returning to list view due to error');
      setView('list');
    }
  }, [db, collectionPath, setView, setCurrentProduct, setCurrentQrCodeId, setGlobalError]);

  const onScanFailure = () => {
    // Silent failure logging
  };

  useEffect(() => {
    if (scannerReady && !scannerRef.current && view === 'scanner') {
      try {
        const html5QrcodeScanner = new window.Html5Qrcode("qr-reader");
        scannerRef.current = html5QrcodeScanner;

        html5QrcodeScanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
            supportedScanTypes: [window.Html5QrcodeScanType.SCAN_TYPE_CAMERA],
            disableFlip: false,
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            // Disable experimental features that might cause navigation
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: false
            }
          },
          onScanSuccess,
          onScanFailure
        ).catch(err => {
          setGlobalError(`Failed to start QR scanner: ${err?.message || err}. Please grant camera permissions.`);
          setView('list');
        });
      } catch (err) {
        setGlobalError(`Scanner initialization error: ${err?.message || err}`);
        setView('list');
      }
    }

    return () => {
      stopScanner();
    };
  }, [scannerReady, view, onScanSuccess, setGlobalError, setView]);


  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        {scannerStatus === SCRIPT_STATUS.PENDING && <Spinner text="Loading Scanner Library..." />}
        {scannerStatus === SCRIPT_STATUS.ERROR && (
          <div className="p-4 bg-red-100 text-red-800 text-center">
            Error loading scanner. Check console for details.
          </div>
        )}
        {scannerReady && (
          <div id="qr-reader" className="w-full"></div>
        )}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <p className="text-center text-gray-600">Align QR code within the frame.</p>
          <button
            onClick={() => {
              stopScanner();
              setView('list');
            }}
            className="mt-4 w-full bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
export default Scanner; // Export it
