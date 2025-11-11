import { useState, useEffect } from 'react';
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

function BulkQrGenerator({ setView, setGlobalError }) {
  const qrLibLoaded = useScript('https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js', 'QRCode');
  const [quantity, setQuantity] = useState('');
  const [generating, setGenerating] = useState(false);

  // Get last 5 characters of UUID (after last dash)
  const getShortId = (uuid) => {
    if (!uuid) return '';
    const parts = uuid.split('-');
    return parts[parts.length - 1].toUpperCase();
  };

  const handleGenerate = async () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1 || qty > 1000) {
      alert('Please enter a number between 1 and 1000');
      return;
    }

    setGenerating(true);
    console.log(`Generating ${qty} blank QR codes...`);

    try {
      // Generate UUIDs and QR codes
      const qrCodes = [];
      for (let i = 0; i < qty; i++) {
        const uuid = crypto.randomUUID();
        const shortId = getShortId(uuid);
        
        // Generate QR code as data URL
        const dataUrl = await window.QRCode.toDataURL(uuid, {
          width: 600,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        qrCodes.push({ uuid, shortId, dataUrl });
        console.log(`Generated ${i + 1}/${qty}: ${shortId}`);
      }

      console.log(`All ${qty} QR codes generated, creating PDF...`);

      // Create PDF with 2"x3" pages
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [50.8, 76.2],
        compress: true
      });

      for (let i = 0; i < qrCodes.length; i++) {
        const code = qrCodes[i];
        
        if (i > 0) {
          pdf.addPage();
        }

        const pageWidth = 50.8;
        const pageHeight = 76.2;
        const qrSize = 40;
        const qrX = (pageWidth - qrSize) / 2;
        const qrY = 10;

        // White background
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Add QR code
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

        // Add short ID
        pdf.setFontSize(24);
        pdf.setFont('courier', 'bold');
        pdf.setTextColor(0, 0, 0);
        const textY = qrY + qrSize + 8;
        pdf.text(code.shortId, pageWidth / 2, textY, { align: 'center' });
      }

      // Save PDF
      const filename = `Blank-QR-Labels-${qty}-${Date.now()}.pdf`;
      pdf.save(filename);
      
      console.log('✅ PDF saved:', filename);
      alert(`✅ Generated ${qty} QR labels!\n\nThe PDF has been downloaded.\nYou can print these and add products to inventory later using the Scanner.`);
      
    } catch (error) {
      console.error('❌ Error:', error);
      setGlobalError('Error generating QR codes: ' + error.message);
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
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-3xl font-bold mb-2">🖨️ Bulk QR Code Generator</h2>
        <p className="text-gray-600 mb-6">
          Generate blank QR codes to print and stick on products. Add product details later by scanning the codes.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              How many QR codes do you want to generate?
            </label>
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
            <p className="text-xs text-gray-500 mt-1">
              Maximum 1000 labels per batch
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={!quantity || generating}
              className="flex-1 bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 font-semibold text-lg"
            >
              {generating ? '⏳ Generating PDF...' : `📄 Generate ${quantity || '___'} Labels`}
            </button>
            <button
              onClick={() => setView('inventory')}
              disabled={generating}
              className="px-6 bg-gray-300 text-gray-700 py-4 rounded-lg hover:bg-gray-400 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold mb-2">📋 How it works:</h3>
          <ol className="text-sm space-y-1 list-decimal list-inside text-gray-700">
            <li>Enter the number of labels you need</li>
            <li>Click "Generate" to download a PDF</li>
            <li>Print the PDF on your Phomemo M221 (2"x3" labels)</li>
            <li>Stick labels on your products</li>
            <li>Later: scan each QR code to add product details</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default BulkQrGenerator;
