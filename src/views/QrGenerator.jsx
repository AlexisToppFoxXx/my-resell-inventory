// src/views/QrGenerator.js
import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { APP_CONFIG } from '../config';
import { drawLabel, PAGE_SIZE, registerCaveatFont } from '../lib/qrTemplate';

// Hook to load external script
function useScript(src, globalName) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (window[globalName]) {
      setLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [src, globalName]);
  return loaded;
}

const QrGenerator = ({ setView, setGlobalError, db, collectionPath, currentQrCodeId, inventory }) => {
  const qrLibLoaded = useScript('https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js', 'QRCode');
  const [qrCodes, setQrCodes] = useState([]);
  const [selectedIds, setSelectedIds] = useState(currentQrCodeId ? [currentQrCodeId] : []);
  const [generating, setGenerating] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // Get last 5 characters of UUID (after last dash)
  const getShortId = (uuid) => {
    if (!uuid) return '';
    const parts = uuid.split('-');
    return parts[parts.length - 1].toUpperCase();
  };

  // Generate QR codes as data URLs
  useEffect(() => {
    if (!qrLibLoaded || selectedIds.length === 0) return;

    const generateCodes = async () => {
      console.log('Generating QR codes for:', selectedIds);
      const codes = [];
      for (const id of selectedIds) {
        try {
          const dataUrl = await window.QRCode.toDataURL(id, {
            width: 600,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          console.log('Generated QR for:', id, 'Data URL length:', dataUrl.length);
          const product = inventory.find(p => p.id === id);
          codes.push({
            id,
            dataUrl,
            shortId: getShortId(id),
            title: product?.title || 'Unknown Product'
          });
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      }
      console.log('Total QR codes generated:', codes.length);
      setQrCodes(codes);
    };

    generateCodes();
  }, [qrLibLoaded, selectedIds, inventory]);

  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(inventory.map(p => p.id));
  };

  const clearAll = () => {
    setSelectedIds([]);
  };

  const handleGeneratePDF = async () => {
    if (qrCodes.length === 0) {
      setGlobalError('No QR codes to print');
      return;
    }

    setGenerating(true);
    console.log('Starting PDF generation with', qrCodes.length, 'codes');
    
    try {
      // Wait a moment to ensure all QR codes are fully rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify all QR codes have valid data URLs
      const validCodes = qrCodes.filter(code => {
        const isValid = code.dataUrl && code.dataUrl.startsWith('data:image');
        if (!isValid) {
          console.error('Invalid QR code data for:', code.id);
        }
        return isValid;
      });
      
      if (validCodes.length === 0) {
        throw new Error('No valid QR codes generated. Please try again.');
      }
      
      console.log(`Valid codes: ${validCodes.length}/${qrCodes.length}`);
      
      // Create PDF using shared page size and drawLabel helper
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PAGE_SIZE.width, PAGE_SIZE.height], compress: true });
      await registerCaveatFont(pdf);

      for (let i = 0; i < validCodes.length; i++) {
        const code = validCodes[i];
        if (i > 0) pdf.addPage([PAGE_SIZE.width, PAGE_SIZE.height]);
        const product = inventory.find(p => p.id === code.id);
        drawLabel(pdf, {
          design: 'product',
          qrDataUrl: code.dataUrl,
          shortId: `...${code.shortId}`,
          productName: product?.product || '',
          pageWidth: PAGE_SIZE.width,
          pageHeight: PAGE_SIZE.height,
          branding: '4TL'
        });
      }

      const filename = `QR-Labels-${new Date().toISOString().slice(0,10)}.pdf`;
      pdf.save(filename);
      alert(`✅ Generated ${validCodes.length} labels! Check your Downloads folder.`);
    } catch (error) {
      console.error('❌ PDF generation error:', error);
      setGlobalError('Error generating PDF: ' + error.message);
      alert('❌ Error: ' + error.message + '\n\nCheck console for details.');
    } finally {
      setGenerating(false);
    }
  };

  const generateLabels = async () => {
    // ...existing validation...

    try {
      if (!window.QRCode) {
        alert('QR Code library is still loading. Please wait a moment and try again.');
        return;
      }

      setGenerating(true);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PAGE_SIZE.width, PAGE_SIZE.height], compress: true });
      await registerCaveatFont(pdf);
      for (let i = 0; i < quantity; i++) {
        const uuid = crypto.randomUUID();
        const qrUrl = `https://resell-inventory-flow.web.app/scan/${uuid}`;
        const dataUrl = await window.QRCode.toDataURL(qrUrl, {
          width: 600,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#FFFFFF' }
        });
        if (i > 0) pdf.addPage([PAGE_SIZE.width, PAGE_SIZE.height]);
        const shortId = uuid.split('-').pop().substring(0,5).toUpperCase();
        drawLabel(pdf, {
          design: 'bulk',
          qrDataUrl: dataUrl,
          shortId: `...${shortId}`,
          pageWidth: PAGE_SIZE.width,
          pageHeight: PAGE_SIZE.height,
          branding: '4TL'
        });
      }

      pdf.save(`QR_Labels_${quantity}_${Date.now()}.pdf`);
      alert(`✅ Generated ${quantity} QR label(s)!`);
      
    } catch (error) {
      console.error('Error generating labels:', error);
      alert('Error: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  if (!qrLibLoaded) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-600">Loading QR code generator...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl">🖨️</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bulk QR Code Generator</h2>
            <p className="text-sm text-gray-500">Generate multiple blank QR code labels at once</p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Labels
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={quantity}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                setQuantity('');
              } else {
                const num = parseInt(val);
                if (!isNaN(num) && num >= 1 && num <= 100) {
                  setQuantity(num);
                }
              }
            }}
            onBlur={(e) => {
              if (e.target.value === '' || parseInt(e.target.value) < 1) {
                setQuantity(1);
              }
            }}
            className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Enter quantity (1-100)"
          />
          <p className="mt-2 text-sm text-gray-500">
            💡 Each label is 2" x 3" (50.8mm x 76.2mm) - perfect for standard label sheets
          </p>
        </div>

        {!qrLibLoaded && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">⏳ Loading QR code library...</p>
          </div>
        )}

        <button
          onClick={generateLabels}
          disabled={generating || !qrLibLoaded}
          className="w-full bg-purple-600 text-white py-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium text-lg transition-colors flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v4h8z" />
              </svg>
              Generate {quantity} Label{quantity !== 1 ? 's' : ''}
            </>
          )}
        </button>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">📋 How to Use</h3>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
            <li>Enter the number of labels you need (1-100)</li>
            <li>Click "Generate" to download the PDF</li>
            <li>Print the PDF on 2"x3" label sheets</li>
            <li>Apply labels to your inventory items</li>
            <li>Scan labels later to add product details</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default QrGenerator;
