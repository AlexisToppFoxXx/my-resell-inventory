import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import fs from 'fs';

async function makePdf() {
  const pageWidth = 47.752; // mm
  const pageHeight = 73.152; // mm
  const margin = 2.032; // mm
  // make QR extremely large for reliable scanning
  const qrSize = pageWidth * 0.5;

  const productName = 'CAR RAMP';
  const productQrUrl = 'https://resell-inventory-flow.web.app/scan/SAMPLE123';

  const productQrData = await QRCode.toDataURL(productQrUrl, { width: 600, margin: 1 });

  const pdf = new jsPDF({ unit: 'mm', format: [pageWidth, pageHeight] });

  for (let p = 0; p < 3; p++) {
    if (p > 0) pdf.addPage([pageWidth, pageHeight]);

    // 4TL top center
    const topCenterY = margin + (pageHeight * 0.06);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    try { pdf.text('4TL', pageWidth / 2, topCenterY, { align: 'center', stroke: true }); } catch (e) { pdf.text('4TL', pageWidth / 2, topCenterY, { align: 'center' }); }

    // centered product QR
    const qrX = (pageWidth - qrSize) / 2;
    const qrY = topCenterY + 2;
    pdf.addImage(productQrData, 'PNG', qrX, qrY, qrSize, qrSize);

    // Product name large and bold under QR
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    const maxWidth = pageWidth - (2 * margin) - 4;
    let nameLines = pdf.splitTextToSize(productName, maxWidth);
    if (!nameLines || nameLines.length === 0 || nameLines.every(l => !String(l || '').trim())) {
      nameLines = pdf.splitTextToSize('NAME SHOULD SHOW HERE', maxWidth);
    }
    nameLines = nameLines.slice(0, 2);
    const lineHeight = 10;
    const startY = qrY + qrSize + 6;
    nameLines.forEach((line, idx) => {
      pdf.text(line, pageWidth / 2, startY + (idx * lineHeight), { align: 'center' });
    });
  }

  const outDir = './sample_output';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const filePath = `${outDir}/QR_sample_labels.pdf`;
  const arrayBuffer = pdf.output('arraybuffer');
  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
  console.log('Saved sample PDF to', filePath);
}

makePdf().catch(err => { console.error(err); process.exit(1); });
