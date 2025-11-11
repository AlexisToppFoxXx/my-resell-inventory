// src/views/QrGenerator.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
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

  // Memoize the handler to prevent unnecessary re-runs
  const checkGlobalAndResolve = useCallback(() => {
    // Poll for the global object every 100ms for up to 5 seconds
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

    // 1. Check if global object already exists (fast path)
    if (globalObjectName && window[globalObjectName]) {
      setStatus(SCRIPT_STATUS.LOADED);
      return;
    }

    // 2. Check for an existing script tag
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
      // Script tag exists, re-attach listeners in case it's currently loading
      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);
    } else {
      // Script tag does not exist. Create it.
      console.log(`[ScriptLoader] Creating new script tag for: ${url}`);
      script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);
      document.body.appendChild(script);
    }

    // Cleanup function
    return () => {
      clearTimeout(onLoadRef.current);
      if (script) {
        script.removeEventListener('load', handleLoad);
        script.removeEventListener('error', handleError);
      }
    };
  }, [url, globalObjectName, checkGlobalAndResolve]); // Dependencies

  return status;
};


const QrGenerator = ({ setView, setGlobalError }) => {
  const [numCodes, setNumCodes] = useState(10);
  const [generatedCodes, setGeneratedCodes] = useState([]);

  // *** FIX: Changed CDN from Cloudflare to jsDelivr/npm for better compatibility in sandboxed environments ***
  const generatorStatus = useScript("https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js", "QRCode");
  const generatorReady = generatorStatus === SCRIPT_STATUS.LOADED;
  const printAreaRef = useRef(null);

  const getStatusDisplay = () => {
    switch (generatorStatus) {
      case SCRIPT_STATUS.LOADED:
        return (
          <div className="text-sm font-medium text-green-700 bg-green-100 p-2 rounded-md flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            QR Generator Ready!
          </div>
        );
      case SCRIPT_STATUS.PENDING:
        return (
          <div className="text-sm font-medium text-yellow-700 bg-yellow-100 p-2 rounded-md flex items-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.381 18.09M20 20v-5h-.581" /></svg>
            Loading Library...
          </div>
        );
      case SCRIPT_STATUS.ERROR:
        return (
          <div className="text-sm font-medium text-red-700 bg-red-100 p-2 rounded-md flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Error loading QR library.
          </div>
        );
      default:
        return null;
    }
  };


  const generateCodes = () => {
    console.log("Generate button clicked.");
    if (!generatorReady || !window.QRCode) {
      setGlobalError("QR Code generator is not ready. Status: " + generatorStatus);
      return;
    }

    const codes = [];
    for (let i = 0; i < numCodes; i++) {
      // Use a smaller UUID part for less data dense QR codes
      const uuid = crypto.randomUUID().substring(0, 18);
      codes.push(uuid);
    }
    setGeneratedCodes(codes);
  };

  // Effect to render the QR codes using the loaded library
  useEffect(() => {
    if (generatedCodes.length > 0 && generatorReady && window.QRCode) {
      generatedCodes.forEach(codeId => {
        const canvas = document.getElementById(`qr-${codeId}`);
        if (canvas) {
          window.QRCode.toCanvas(canvas, codeId, { width: 100, margin: 2 }, (error) => {
            if (error) console.error(`Failed to generate QR for ${codeId}:`, error);
          });
        }
      });
    }
  }, [generatedCodes, generatorReady]);

  const handlePrint = () => {
    const printContents = printAreaRef.current.innerHTML;

    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Print QR Codes</title>');
    printWindow.document.write(`
      <style>
        body { font-family: sans-serif; }
        @media print {
          @page { size: auto; margin: 20mm; }
          body { margin: 0; }
          .qr-container {
            display: inline-block;
            width: 30%;
            padding: 10px;
            box-sizing: border-box;
            text-align: center;
            page-break-inside: avoid;
            border: 1px dashed #ccc;
            margin: 1.5%;
          }
          canvas { max-width: 100%; height: auto; }
          .qr-id { font-size: 8px; word-wrap: break-word; font-family: monospace; }
        }
        .qr-container {
          display: inline-block;
          width: 30%;
          padding: 10px;
          box-sizing: border-box;
          text-align: center;
          page-break-inside: avoid;
          border: 1px dashed #ccc;
          margin: 1.5%;
        }
        canvas { max-width: 100%; height: auto; }
        .qr-id { font-size: 8px; word-wrap: break-word; font-family: monospace; margin-top: 5px; }
      </style>
    `);
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h3>Your QR Codes - Print this page and cut out the codes.</h3>');
    printWindow.document.write(printContents);
    printWindow.document.write('</body></html>');

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
  };

  return (
    <>
      <style>{`
        @media print {
          /* Hide everything except print container */
          body * {
            visibility: hidden;
          }
          #print-container,
          #print-container * {
            visibility: visible;
          }
          #print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          
          /* Phomemo M221 label: 2in wide x 3in tall */
          .qr-label {
            width: 2in;
            height: 3in;
            page-break-after: always;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 0.15in;
            box-sizing: border-box;
            margin: 0;
          }
          .qr-label:last-child {
            page-break-after: auto;
          }
          
          /* QR code centered and large */
          .qr-label img {
            width: 1.6in;
            height: 1.6in;
            display: block;
            margin-bottom: 0.15in;
          }
          
          /* Short ID below QR, bold and large */
          .qr-label .short-id {
            font-size: 26pt;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            letter-spacing: 2px;
            text-align: center;
            margin-top: 0.1in;
          }
          
          /* Page setup for thermal printer */
          @page {
            size: 2in 3in;
            margin: 0;
          }
        }
        
        /* Hide print container on screen */
        #print-container {
          display: none;
        }
        
        .no-print {
          display: block;
        }
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print">
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-2xl font-bold mb-2">Generate QR Code Labels</h2>
          <p className="text-sm text-gray-600 mb-4">
            For Phomemo M221 thermal printer (2" x 3" labels)
          </p>
          
          <div className="my-4">
            {getStatusDisplay()}
          </div>

          <div className="flex gap-4 mb-4">
            <input
              type="number"
              value={numCodes}
              onChange={(e) => setNumCodes(Math.max(1, parseInt(e.target.value)))}
              className="block w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              min="1"
              max="100"
            />
            <button
              onClick={generateCodes}
              disabled={!generatorReady}
              className="bg-indigo-600 text-white font-semibold px-5 py-2 rounded-lg shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatorReady ? 'Generate' : 'Loading...'}
            </button>
          </div>

          {generatedCodes.length > 0 && (
            <div>
              <button
                onClick={handlePrint}
                className="w-full bg-green-600 text-white font-semibold px-5 py-2 rounded-lg shadow hover:bg-green-700 mb-4"
              >
                Print Generated Codes
              </button>
              <div ref={printAreaRef} className="border border-gray-200 p-4 rounded-lg bg-gray-50 max-h-96 overflow-y-auto">
                {generatedCodes.map(codeId => (
                  <div key={codeId} className="qr-container">
                    <canvas id={`qr-${codeId}`}></canvas>
                    <div className="qr-id">{codeId}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setView('list')}
            className="mt-6 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            &larr; Back to Inventory
          </button>
        </div>
      </div>

      {/* Print-only container - optimized for Phomemo M221 */}
      <div id="print-container" ref={printAreaRef}>
        {generatedCodes.map(codeId => (
          <div key={codeId} className="qr-label">
            <canvas id={`qr-${codeId}`}></canvas>
            <div className="short-id">{codeId}</div>
          </div>
        ))}
      </div>
    </>
  );
};
export default QrGenerator; // Export it
