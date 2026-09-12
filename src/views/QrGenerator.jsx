// src/views/QrGenerator.js
import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { APP_CONFIG } from '../config';
import { makeQrUrl } from '../utils';

const QrGenerator = ({ setView, setGlobalError, db, collectionPath, currentQrCodeId, inventory }) => {
  const [qrCodes, setQrCodes] = useState([]);
  const [selectedIds, setSelectedIds] = useState(currentQrCodeId ? [currentQrCodeId] : []);
  const [generating, setGenerating] = useState(false);
  const [quantity, setQuantity] = useState(1);

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
      
      // Create PDF for product labels: 77.98mm x 52mm (landscape)
      const pageWidth = 77.98;
      const pageHeight = 52;
      const margin = 1; // 1mm margin
      const qrSize = 7; // 7mm QR code
      const spacing = 1.5; // spacing between QR and product name
      const logoFontSize = 18;
      const uuidFontSize = 12;
      const productNameMaxFont = 18;
      const productNameMinFont = 16;

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [pageWidth, pageHeight],
        compress: true
      });

      for (let i = 0; i < validCodes.length; i++) {
        const code = validCodes[i];
        const product = inventory.find(p => p.id === code.id);
        const productName = (product?.product || 'UNKNOWN').toUpperCase();
        const uuidShort = (code.id || '').replace(/-/g, '').slice(-5).toUpperCase();

        if (i > 0) pdf.addPage([pageWidth, pageHeight]);

        // Border only (no fill so pink label shows through)
        pdf.setLineWidth(0.5);
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);

        // 4TL logo (top-left)
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(logoFontSize);
        try {
          pdf.text('4TL', margin, margin + (logoFontSize * 0.35), { align: 'left', stroke: true });
        } catch (e) {
          pdf.text('4TL', margin, margin + (logoFontSize * 0.35), { align: 'left' });
        }

        // UUID (last 5 digits) top-right
        pdf.setFontSize(uuidFontSize);
        pdf.text(uuidShort, pageWidth - margin, margin + (uuidFontSize * 0.35), { align: 'right' });

        // QR code left side
        const qrX = margin;
        const qrY = margin + logoFontSize * 0.35 + 3; // slightly below logo
        try {
          pdf.addImage(code.dataUrl, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST');
        } catch (err) {
          console.warn('Failed to render product QR', err);
        }

        // Product name to the right of QR
        const nameX = qrX + qrSize + spacing;
        const nameMaxWidth = pageWidth - margin - nameX;

        // Auto-fit font size between max and min
        let fontSize = productNameMaxFont;
        pdf.setFont('helvetica', 'bold');
        while (fontSize >= productNameMinFont) {
          pdf.setFontSize(fontSize);
          if (pdf.getTextWidth(productName) <= nameMaxWidth) break;
          fontSize -= 1;
        }

        let displayName = productName;
        pdf.setFontSize(fontSize);
        if (pdf.getTextWidth(displayName) > nameMaxWidth) {
          while (displayName.length > 0 && pdf.getTextWidth(displayName + '...') > nameMaxWidth) {
            displayName = displayName.slice(0, -1);
          }
          displayName = displayName + '...';
        }

        const nameY = qrY + (qrSize / 2) + (fontSize * 0.35);
        pdf.text(displayName, nameX, nameY, { align: 'left' });
      }

      const filename = `QR-Labels-${new Date().toISOString().slice(0,10)}.pdf`;
      pdf.save(filename);
      
      console.log('✅ PDF generation complete!');
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
      setGenerating(true);

      // Bulk QR labels: 50mm x 77.98mm portrait
      const pageWidth = 50;
      const pageHeight = 77.98;
      const margin = 1; // 1mm margin
      const qrSize = 32; // 32mm QR
      const uuidFontSize = 41; // large text
      const logoFontSize = 18; // 4TL logo size

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pageWidth, pageHeight],
        compress: true
      });

      for (let i = 0; i < quantity; i++) {
        const uuid = crypto.randomUUID();
        const qrUrl = makeQrUrl(uuid);
        const shortId = uuid.replace(/-/g, '').slice(-5).toUpperCase();

        const dataUrl = await QRCode.toDataURL(qrUrl, {
          width: 600,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#FFFFFF' }
        });

        if (i > 0) {
          pdf.addPage([pageWidth, pageHeight]);
        }

        // Border (no fill so pink label shows through)
        pdf.setLineWidth(0.5);
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);

        // 4TL logo (top center)
        const logoY = margin + (logoFontSize * 0.35);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(logoFontSize);
        try {
          pdf.text('4TL', pageWidth / 2, logoY, { align: 'center', stroke: true });
        } catch (e) {
          pdf.text('4TL', pageWidth / 2, logoY, { align: 'center' });
        }

        // QR Code (centered horizontally, below logo)
        const qrX = (pageWidth - qrSize) / 2;
        const qrY = logoY + 4; // small gap below logo
        pdf.addImage(dataUrl, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST');

        // UUID (last 5) centered below QR with 1.5mm spacing
        const uuidY = qrY + qrSize + 1.5 + (uuidFontSize * 0.35);
        pdf.setFontSize(uuidFontSize);
        pdf.setFont('helvetica', 'bold');
        pdf.text(shortId, pageWidth / 2, uuidY, { align: 'center' });

        // Full UUID on bulk label for tracking
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        const fullUuidLines = pdf.splitTextToSize(uuid, pageWidth - (2 * margin) - 4);
        const fullUuidY = uuidY + 5;
        pdf.text(fullUuidLines, pageWidth / 2, fullUuidY, { align: 'center' });
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


        <button
          onClick={generateLabels}
          disabled={generating}
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
