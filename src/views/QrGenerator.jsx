// src/views/QrGenerator.js
import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';

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
      
      // Create PDF with 2"x3" pages (50.8mm x 76.2mm to be exact)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [50.8, 76.2],
        compress: true
      });

      for (let i = 0; i < validCodes.length; i++) {
        const code = validCodes[i];
        console.log(`Adding page ${i + 1}/${validCodes.length} for ${code.shortId}`);
        console.log(`Data URL length: ${code.dataUrl.length}`);
        
        if (i > 0) {
          pdf.addPage();
        }

        // Calculate dimensions for centered layout
        const pageWidth = 50.8;
        const pageHeight = 76.2;
        const qrSize = 40; // 40mm QR code
        const qrX = (pageWidth - qrSize) / 2; // Center horizontally
        const qrY = 10; // Start 10mm from top

        // Add white background
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        try {
          // Add QR code image with explicit format
          pdf.addImage(
            code.dataUrl, 
            'PNG', 
            qrX, 
            qrY, 
            qrSize, 
            qrSize,
            undefined,
            'FAST'
          );
          console.log(`✓ Image added successfully for ${code.shortId}`);
        } catch (imgError) {
          console.error(`Failed to add image for ${code.shortId}:`, imgError);
          throw new Error(`Failed to add QR image: ${imgError.message}`);
        }

        // Add short ID text below QR
        pdf.setFontSize(24);
        pdf.setFont('courier', 'bold');
        pdf.setTextColor(0, 0, 0);
        const textY = qrY + qrSize + 8; // 8mm below QR code
        pdf.text(code.shortId, pageWidth / 2, textY, { align: 'center' });
        console.log(`✓ Text added for ${code.shortId}`);
      }

      // Save PDF
      const filename = `QR-Labels-${new Date().toISOString().slice(0,10)}.pdf`;
      console.log('Saving PDF as:', filename);
      pdf.save(filename);
      
      console.log('✅ PDF generation complete!');
      alert(`✅ PDF downloaded with ${validCodes.length} labels! Check your Downloads folder.\n\nOpen the PDF and print to your Phomemo M221 printer.`);
    } catch (error) {
      console.error('❌ PDF generation error:', error);
      setGlobalError('Error generating PDF: ' + error.message);
      alert('❌ Error: ' + error.message + '\n\nCheck console for details.');
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
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="text-2xl font-bold mb-2">Generate QR Code Labels</h2>
        <p className="text-sm text-gray-600 mb-4">
          For Phomemo M221 thermal printer (2" x 3" labels)
        </p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={selectAll}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Select All ({inventory.length})
          </button>
          <button
            onClick={clearAll}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
          >
            Clear Selection
          </button>
          <button
            onClick={handleGeneratePDF}
            disabled={selectedIds.length === 0 || qrCodes.length === 0 || generating}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 font-semibold text-sm"
          >
            {generating ? '⏳ Generating PDF...' : `📄 Download PDF (${selectedIds.length} label${selectedIds.length !== 1 ? 's' : ''})`}
          </button>
          <button
            onClick={() => setView('inventory')}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
          >
            ← Back
          </button>
        </div>

        <div className="border rounded-lg p-4 max-h-96 overflow-y-auto bg-gray-50">
          <h3 className="font-semibold mb-3 text-sm text-gray-700">Select Products to Print:</h3>
          {inventory.length === 0 ? (
            <p className="text-gray-500 text-sm">No products in inventory</p>
          ) : (
            <div className="space-y-2">
              {inventory.map(product => (
                <label
                  key={product.id}
                  className="flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer border border-transparent hover:border-blue-200"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(product.id)}
                    onChange={() => toggleSelection(product.id)}
                    className="w-4 h-4"
                  />
                  <span className="flex-1 text-sm">{product.title || 'Untitled'}</span>
                  <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                    {getShortId(product.id)}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {qrCodes.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-3 text-sm text-gray-700">
              Preview ({qrCodes.length} label{qrCodes.length !== 1 ? 's' : ''} ready):
            </h3>
            <p className="text-xs text-blue-600 mb-3">
              ✓ QR codes are generated and ready. Click "Download PDF" above.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {qrCodes.map(code => (
                <div key={code.id} className="border rounded p-3 bg-white shadow-sm">
                  <div className="flex flex-col items-center gap-2">
                    <img src={code.dataUrl} alt={code.shortId} className="w-32 h-32" />
                    <div className="font-bold text-lg font-mono">{code.shortId}</div>
                    <div className="text-xs text-gray-500 truncate w-full text-center">{code.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QrGenerator;
