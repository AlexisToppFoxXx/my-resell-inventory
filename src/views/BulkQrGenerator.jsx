import { useState, useEffect } from 'react';
import { makeQrUrl } from '../utils';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';


function BulkQrGenerator({ setView, setGlobalError }) {
  const [quantity, setQuantity] = useState('');
  const [generating, setGenerating] = useState(false);


  // Get last 5 characters of UUID (after last dash)
  const getShortId = (uuid) => {
    if (!uuid) return '';
    const parts = uuid.split('-');
    return parts[parts.length - 1].substring(0, 5).toUpperCase();
  };

  const handleGenerate = async () => {
    console.log('🎯🎯🎯 NEW GENERATE BUTTON CLICKED! Quantity:', quantity);
    
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1 || qty > 1000) {
      alert('Please enter a number between 1 and 1000');
      return;
    }

    setGenerating(true);
    console.log(`✅ Starting generation of ${qty} QR codes...`);

    try {
      // QRCode library imported above; proceed

      // Generate UUIDs and QR codes
      const qrCodes = [];
      for (let i = 0; i < qty; i++) {
        const uuid = crypto.randomUUID();
        const shortId = getShortId(uuid);
        
        console.log(`Generating QR ${i + 1}/${qty}: ${shortId}`);
        
        // Generate QR code with URL instead of just UUID
        const qrUrl = makeQrUrl(uuid);
        
        const dataUrl = await QRCode.toDataURL(qrUrl, {
          width: 600,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#FFFFFF' }
        });
        
        console.log(`✓ QR ${i + 1} done, URL length: ${dataUrl.length}`);
        qrCodes.push({ uuid, shortId, dataUrl });
      }

      console.log(`✅ All ${qty} QR codes generated! Creating PDF...`);

      // Create PDF with 1.88" x 2.88" pages
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [47.752, 73.152],
        compress: true
      });

      console.log('PDF object created');

      for (let i = 0; i < qrCodes.length; i++) {
        const code = qrCodes[i];
        console.log(`Adding page ${i + 1}/${qrCodes.length} for ${code.shortId}`);
        
        if (i > 0) {
          pdf.addPage([47.752, 73.152]);
        }

        const pageWidth = 47.752;
        const pageHeight = 73.152;
        const margin = 2.032;
        const qrSize = pageWidth * 0.5; // larger for scanning

        // White background
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Border
        pdf.setLineWidth(0.5);
        pdf.setDrawColor(0,0,0);
        pdf.rect(margin, margin, pageWidth - (2*margin), pageHeight - (2*margin));

        // Top center 4TL
        const topCenterY = margin + (pageHeight * 0.06);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        try { pdf.text('4TL', pageWidth / 2, topCenterY, { align: 'center', stroke: true }); } catch(e) { pdf.text('4TL', pageWidth / 2, topCenterY, { align: 'center' }); }

        // Centered QR (product)
        const qrX = (pageWidth - qrSize) / 2;
        const qrY = topCenterY + 2;
        pdf.addImage(code.dataUrl, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST');

        // Label text (ID or name) large and bold beneath QR
        pdf.setFontSize(24); pdf.setFont('helvetica','bold');
        const maxWidth = pageWidth - (2 * margin) - 4;
        const labelText = code.shortId || 'NAME SHOULD SHOW HERE';
        let labelLines = pdf.splitTextToSize(labelText, maxWidth);
        if (!labelLines || labelLines.length === 0 || labelLines.every(l => !String(l || '').trim())) {
          labelLines = pdf.splitTextToSize('NAME SHOULD SHOW HERE', maxWidth);
        }
        labelLines = labelLines.slice(0, 2);
        const lineHeight = 10;
        const startY = qrY + qrSize + 6;
        labelLines.forEach((line, idx) => {
          pdf.text(line, pageWidth / 2, startY + (idx * lineHeight), { align: 'center' });
        });

        console.log(`✓ Text added for ${code.shortId}`);
      }

      const filename = `QR-Labels-${qty}-${Date.now()}.pdf`;
      pdf.save(filename);
      
      console.log('✅✅✅ PDF SAVED!', filename);
      alert(`✅ ${qty} labels downloaded!`);
      
    } catch (error) {
      console.error('❌ ERROR:', error);
      alert('Error: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };


  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-3xl font-bold mb-2">🖨️ Bulk QR Generator</h2>
        <p className="text-gray-600 mb-6">Generate blank QR codes for your thermal printer (2" x 3" labels)</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">How many QR codes?</label>
            <input
              type="number"
              min="1"
              max="1000"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity (e.g., 100)"
              className="w-full px-4 py-3 text-lg border-2 rounded-lg focus:border-blue-500 focus:outline-none"
              disabled={generating}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={!quantity || generating}
              className="flex-1 bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 font-semibold text-lg"
            >
              {generating ? '⏳ Generating...' : `📄 Generate ${quantity || '___'} Labels`}
            </button>
            <button
              onClick={() => setView('inventory')}
              disabled={generating}
              className="px-6 bg-gray-300 text-gray-700 py-4 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BulkQrGenerator;
