// Shared QR label drawing helper for jsPDF
// Exports: drawLabel(pdf, opts), registerCaveatFont(pdf)
// opts: { design: 'bulk'|'product', qrDataUrl, shortId, productName, branding, brandingFontSize }

const inchToMm = (inches) => inches * 25.4;
const caveatFontUrl = new URL('../assets/Caveat-Bold.ttf', import.meta.url).href;
let caveatFontBase64Promise = null;

const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const loadCaveatFontBase64 = async () => {
  if (!caveatFontBase64Promise) {
    caveatFontBase64Promise = fetch(caveatFontUrl)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Unable to load Caveat font: ${res.status}`);
        }
        const buffer = await res.arrayBuffer();
        return arrayBufferToBase64(buffer);
      });
  }
  return caveatFontBase64Promise;
};

export async function registerCaveatFont(pdf) {
  if (!pdf || typeof pdf.addFileToVFS !== 'function' || typeof pdf.addFont !== 'function') {
    return;
  }

  if (pdf.__caveatFontRegistered) {
    return;
  }

  try {
    const fontBase64 = await loadCaveatFontBase64();
    pdf.addFileToVFS('Caveat-Bold.ttf', fontBase64);
    pdf.addFont('Caveat-Bold.ttf', 'Caveat', 'bold');
    pdf.__caveatFontRegistered = true;
  } catch (error) {
    console.warn('Failed to register Caveat Bold font with jsPDF:', error);
  }
}

export function drawLabel(pdf, opts = {}) {
  const pageWidth = opts.pageWidth || inchToMm(3); // 76.2 mm (3")
  const pageHeight = opts.pageHeight || inchToMm(2); // 50.8 mm (2")
  const margin = opts.margin ?? 2.5;
  const branding = opts.branding || '4TL';
  const brandingFontSize = opts.brandingFontSize || 14;

  // Draw white background and border
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);

  if (opts.design === 'bulk') {
    const qrMaxSize = Math.min(pageWidth - 2 * margin - 4, pageHeight - 2 * margin - 10);
    const qrX = (pageWidth - qrMaxSize) / 2;
    const qrY = margin + 2;

    try {
      if (opts.qrDataUrl) pdf.addImage(opts.qrDataUrl, 'PNG', qrX, qrY, qrMaxSize, qrMaxSize);
    } catch (e) {
      console.warn('addImage bulk', e);
    }

    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    if (opts.shortId) {
      pdf.text(opts.shortId, pageWidth / 2, pageHeight - margin - 6, { align: 'center' });
    }

    pdf.setFontSize(brandingFontSize);
    try {
      pdf.setFont('Caveat', 'bold');
    } catch (e) {
      pdf.setFont('helvetica', 'bold');
    }
    const brX = pageWidth - margin - 2;
    const brY = pageHeight - margin - 2;
    try {
      pdf.text(branding, brX, brY, { align: 'right' });
    } catch (e) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(branding, brX, brY, { align: 'right' });
    }
    return;
  }

  if (opts.design === 'product') {
    const qrSize = 16;
    const qrX = margin + 2;
    const qrY = margin + 2;
    try {
      if (opts.qrDataUrl) pdf.addImage(opts.qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch (e) {
      console.warn('addImage product', e);
    }

    // Print short identifier under the QR (if provided)
    if (opts.shortId) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      const shortX = qrX + qrSize / 2;
      const shortY = qrY + qrSize + 6;
      try {
        pdf.text(opts.shortId, shortX, shortY, { align: 'center' });
      } catch (e) {
        // fallback quietly
      }
    }

    const gutter = 4;
    const textX = qrX + qrSize + gutter;
    const maxTextWidth = pageWidth - textX - margin - 2;
    const name = (opts.productName || '').toString().trim();
    const availableHeight = pageHeight - 2 * margin - 4;

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    let fontSize = 18;
    let lines = [];
    let lineHeight = 0;
    while (fontSize >= 8) {
      pdf.setFontSize(fontSize);
      lines = pdf.splitTextToSize(name, maxTextWidth);
      lineHeight = fontSize * 1.2;
      if (lines.length * lineHeight <= availableHeight) break;
      fontSize -= 1;
    }

    if (lines.length > 4) {
      lines = lines.slice(0, 4);
    }

    const startY = margin + 4;
    lines.forEach((line, idx) => {
      pdf.text(line, textX, startY + idx * lineHeight);
    });

    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(qrX + qrSize + gutter / 2, margin + 2, qrX + qrSize + gutter / 2, pageHeight - margin - 2);

    pdf.setFontSize(brandingFontSize);
    try {
      pdf.setFont('Caveat', 'bold');
    } catch (e) {
      pdf.setFont('helvetica', 'bold');
    }
    const brX = pageWidth - margin - 2;
    const brY = pageHeight - margin - 2;
    try {
      pdf.text(branding, brX, brY, { align: 'right' });
    } catch (e) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(branding, brX, brY, { align: 'right' });
    }
    return;
  }

  pdf.setFontSize(10);
  pdf.text('Label', pageWidth / 2, pageHeight / 2, { align: 'center' });
}

export const PAGE_SIZE = { width: inchToMm(2), height: inchToMm(3) };

