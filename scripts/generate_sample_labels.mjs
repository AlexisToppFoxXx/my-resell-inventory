import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import fs from 'fs';

async function makePdf() {
  const pageWidth = 47.752; // mm
  const pageHeight = 73.152; // mm
  const margin = 2.032; // mm
  const qrSize = pageWidth * 0.22; // approx

  const productName = 'CAR RAMP';
  const productQrUrl = 'https://resell-inventory-flow.web.app/scan/SAMPLE123';
  const websiteQrUrl = 'https://example.com/?utm_source=4tl';

  const productQrData = await QRCode.toDataURL(productQrUrl, { width: 600, margin: 1 });
  const websiteQrData = await QRCode.toDataURL(websiteQrUrl, { width: 300, margin: 1 });

  const pdf = new jsPDF({ unit: 'mm', format: [pageWidth, pageHeight] });

  for (let p = 0; p < 3; p++) {
    if (p > 0) pdf.addPage([pageWidth, pageHeight]);

    // 4TL top center
    const topCenterY = margin + (pageHeight * 0.06);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    try { pdf.text('4TL', pageWidth / 2, topCenterY, { align: 'center', stroke: true }); } catch (e) { pdf.text('4TL', pageWidth / 2, topCenterY, { align: 'center' }); }

    // top-right product QR
    const topRightX = pageWidth - margin - qrSize - 1;
    const topRightY = topCenterY + 2;
    pdf.addImage(productQrData, 'PNG', topRightX, topRightY, qrSize, qrSize);

    // bottom-left website QR (lifted by 6.35mm to avoid overlap)
    const bottomLeftX = margin + 1;
    const bottomLeftY = pageHeight - margin - qrSize - (pageHeight * 0.06) - 6.35;
    pdf.addImage(websiteQrData, 'PNG', bottomLeftX, bottomLeftY, qrSize, qrSize);

    // Centered product name (left->right), Helvetica Bold 13pt
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    const bottomWebsiteY = pageHeight - margin - 3;
    const maxWidth = pageWidth - (2 * margin) - 4;
    let nameLines = pdf.splitTextToSize(productName, maxWidth);
    if (!nameLines || nameLines.length === 0 || nameLines.every(l => !String(l || '').trim())) {
      nameLines = pdf.splitTextToSize('NAME SHOULD SHOW HERE', maxWidth);
    }
    nameLines = nameLines.slice(0, 2);
    const lineHeight = 6.5;
    const totalHeight = Math.min(nameLines.length, 2) * lineHeight;

    const topSafe = topCenterY + 2 + qrSize + 1.5;
    const bottomSafe = bottomLeftY - 1.5;
    const centerCandidate = (topCenterY + bottomWebsiteY) / 2;
    const minCenter = topSafe + (totalHeight / 2);
    const maxCenter = bottomSafe - (totalHeight / 2);
    const centerY = Math.max(minCenter, Math.min(centerCandidate, maxCenter));
    const startY = centerY - (totalHeight / 2) + (lineHeight / 2);

    nameLines.forEach((line, idx) => {
      pdf.text(line, pageWidth / 2, startY + (idx * lineHeight), { align: 'center' });
    });

    // bottom center website text (13pt)
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text('example.com', pageWidth / 2, pageHeight - margin - 3, { align: 'center' });
  }

  const outDir = './sample_output';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const filePath = `${outDir}/QR_sample_labels.pdf`;
  const arrayBuffer = pdf.output('arraybuffer');
  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
  console.log('Saved sample PDF to', filePath);
}

makePdf().catch(err => { console.error(err); process.exit(1); });
