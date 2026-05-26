import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { drawLabel, PAGE_SIZE } from '../src/lib/qrTemplate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const caveatPath = path.join(__dirname, '..', 'src', 'assets', 'Caveat-Bold.ttf');
const fontBuf = fs.readFileSync(caveatPath);
const fontBase64 = fontBuf.toString('base64');

(async () => {
  try {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PAGE_SIZE.width, PAGE_SIZE.height], compress: true });

    pdf.addFileToVFS('Caveat-Bold.ttf', fontBase64);
    pdf.addFont('Caveat-Bold.ttf', 'Caveat', 'bold');

    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const shortId = `...${uuid.split('-').pop().substring(0, 5).toUpperCase()}`;
    const qrUrl = `https://resell-inventory-flow.web.app/scan/${uuid}`;
    const dataUrl = await QRCode.toDataURL(qrUrl, { width: 600, margin: 2 });

    drawLabel(pdf, {
      design: 'product',
      qrDataUrl: dataUrl,
      shortId,
      productName: 'Product Name Example for Shelf Label',
      pageWidth: PAGE_SIZE.width,
      pageHeight: PAGE_SIZE.height,
      branding: '4TL'
    });

    const outPath = path.join(__dirname, '..', 'sample_label.pdf');
    const arrayBuf = await pdf.output('arraybuffer');
    fs.writeFileSync(outPath, Buffer.from(arrayBuf));
    console.log('Wrote sample PDF to', outPath);
  } catch (err) {
    console.error('Error generating sample PDF:', err);
    process.exit(1);
  }
})();
