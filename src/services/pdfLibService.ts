/**
 * PDF Document Service using pdf-lib
 * Handles reading, merging, splitting, and rendering annotations into PDF files.
 */
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

export interface PDFPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
}

export interface AnnotationItem {
  id: string;
  pageNumber: number;
  type: 'text' | 'image' | 'signature' | 'shape' | 'stamp';
  x: number; // percentage (0-100) or pts
  y: number; // percentage (0-100) or pts
  width: number; // percentage or pts
  height: number;
  content?: string; // text content or base64 dataUrl
  fontFamily?: 'Helvetica' | 'TimesRoman' | 'Courier';
  fontSize?: number;
  color?: string; // hex or rgb
  backgroundColor?: string;
  opacity?: number;
  shapeType?: 'rectangle' | 'circle' | 'line' | 'arrow' | 'highlight';
  borderWidth?: number;
  stampType?: string;
  isTextReplacement?: boolean;
  originalText?: string;
  metadata?: {
    signerName?: string;
    date?: string;
    hasWatermark?: boolean;
    reason?: string;
  };
}

// Helper to convert hex color to pdf-lib rgb
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0 };
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

/**
 * Creates a sample professional Indonesian business document
 * for quick testing if user doesn't have an immediate PDF.
 */
export async function createSampleDocument(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page 1: Surat Perjanjian Kerjasama (Agreement)
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width: p1Width, height: p1Height } = page1.getSize();

  // Header banner
  page1.drawRectangle({
    x: 0,
    y: p1Height - 80,
    width: p1Width,
    height: 80,
    color: rgb(0.06, 0.09, 0.16),
  });

  page1.drawText('SURAT PERJANJIAN KERJASAMA BISNIS', {
    x: 40,
    y: p1Height - 45,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page1.drawText('Nomor: SPK/2026/X/00889 | Dokumen Resmi & Terverifikasi', {
    x: 40,
    y: p1Height - 65,
    size: 9,
    font: fontRegular,
    color: rgb(0.8, 0.85, 0.9),
  });

  // Body content
  let y = p1Height - 120;
  const writeLine = (text: string, bold = false, size = 10, offset = 0) => {
    page1.drawText(text, {
      x: 40 + offset,
      y,
      size,
      font: bold ? fontBold : fontRegular,
      color: rgb(0.15, 0.15, 0.2),
    });
    y -= size + 8;
  };

  writeLine('Pada hari ini, Sabtu tanggal 10 Oktober 2026, telah disepakati perjanjian kerjasama antara:', false, 10);
  y -= 6;
  writeLine('PIHAK PERTAMA:', true, 11);
  writeLine('Nama Perusahaan : PT Kreasi Teknologi Nusantara', false, 10, 15);
  writeLine('Alamat          : Menara Palma Lt. 18, HR Rasuna Said, Jakarta Selatan', false, 10, 15);
  writeLine('Perwakilan      : Ir. Royandi Abuzayya (Direktur Operasional)', false, 10, 15);
  
  y -= 10;
  writeLine('PIHAK KEDUA:', true, 11);
  writeLine('Nama Perusahaan : Mitra Solusi Digital Nusantara', false, 10, 15);
  writeLine('Alamat          : Sudirman Central Business District (SCBD) Kav. 52', false, 10, 15);
  writeLine('Perwakilan      : Budi Hartono, M.Kom (Direktur Utama)', false, 10, 15);

  y -= 12;
  writeLine('PASAL 1: RUANG LINGKUP PEKERJAAN', true, 11);
  writeLine('1. Pihak Pertama memberikan kepercayaan kepada Pihak Kedua untuk implementasi sistem terpadu.');
  writeLine('2. Pihak Kedua berkomitmen menyelesaikan seluruh modul digitalisasi dalam jangka waktu 90 hari.');
  writeLine('3. Hak kekayaan intelektual atas dokumen dan kode sumber adalah milik bersama.');

  y -= 10;
  writeLine('PASAL 2: VALIDASI DAN PENANDATANGANAN ELEKTRONIK', true, 11);
  writeLine('Dokumen ini sah dan memiliki kekuatan hukum mengikat setelah dibubuhi tanda tangan elektronik');
  writeLine('oleh perwakilan yang berwenang dari kedua belah pihak di area kolom tanda tangan berikut.');

  // Signature box outlines
  const sigY = 130;
  // Box 1
  page1.drawRectangle({
    x: 50,
    y: sigY,
    width: 220,
    height: 100,
    borderColor: rgb(0.8, 0.82, 0.88),
    borderWidth: 1,
    color: rgb(0.98, 0.98, 1),
  });
  page1.drawText('Pihak Pertama (Pemberi Tugas)', {
    x: 60,
    y: sigY + 85,
    size: 9,
    font: fontBold,
    color: rgb(0.3, 0.35, 0.45),
  });
  page1.drawText('[Bubuhkan Tanda Tangan Di Sini]', {
    x: 60,
    y: sigY + 45,
    size: 8,
    font: fontRegular,
    color: rgb(0.6, 0.65, 0.7),
  });
  page1.drawText('( Ir. Royandi Abuzayya )', {
    x: 60,
    y: sigY + 12,
    size: 9,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.25),
  });

  // Box 2
  page1.drawRectangle({
    x: 325,
    y: sigY,
    width: 220,
    height: 100,
    borderColor: rgb(0.8, 0.82, 0.88),
    borderWidth: 1,
    color: rgb(0.98, 0.98, 1),
  });
  page1.drawText('Pihak Kedua (Pelaksana Kerja)', {
    x: 335,
    y: sigY + 85,
    size: 9,
    font: fontBold,
    color: rgb(0.3, 0.35, 0.45),
  });
  page1.drawText('[Bubuhkan Tanda Tangan Di Sini]', {
    x: 335,
    y: sigY + 45,
    size: 8,
    font: fontRegular,
    color: rgb(0.6, 0.65, 0.7),
  });
  page1.drawText('( Budi Hartono, M.Kom )', {
    x: 335,
    y: sigY + 12,
    size: 9,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.25),
  });

  // Footer
  page1.drawText('Halaman 1 dari 2 — Dokumen Sah PDFCraft Pro', {
    x: 40,
    y: 30,
    size: 8,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.55),
  });

  // Page 2: Lampiran Rincian & Jadwal
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  const { height: p2Height } = page2.getSize();

  page2.drawRectangle({
    x: 0,
    y: p2Height - 60,
    width: p1Width,
    height: 60,
    color: rgb(0.12, 0.16, 0.24),
  });

  page2.drawText('LAMPIRAN I: RENCANA KERJA & ANGGARAN', {
    x: 40,
    y: p2Height - 38,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  let y2 = p2Height - 100;
  const writeLine2 = (text: string, bold = false, size = 10) => {
    page2.drawText(text, {
      x: 40,
      y: y2,
      size,
      font: bold ? fontBold : fontRegular,
      color: rgb(0.15, 0.15, 0.2),
    });
    y2 -= size + 8;
  };

  writeLine2('Rincian tahapan implementasi sistem informasi manajemen:', true, 11);
  writeLine2('1. Analisis Kebutuhan Pengguna & Arsitektur Cloud (Minggu 1 - 2)');
  writeLine2('2. Desain Antarmuka & Verifikasi Pengguna (Minggu 3 - 4)');
  writeLine2('3. Pengembangan Modul Inti & Integrasi Dokumen Digital (Minggu 5 - 8)');
  writeLine2('4. Uji Coba Kinerja, Keamanan Siber & Pelatihan Staf (Minggu 9 - 10)');
  writeLine2('5. Peluncuran Resmi (Go-Live) & Pendampingan Operasional (Minggu 11 - 12)');

  y2 -= 15;
  writeLine2('Catatan Tambahan:', true, 11);
  writeLine2('Semua perubahan rincian biaya dan ruang lingkup harus disetujui secara tertulis.');
  writeLine2('Dapat ditambahkan materai elektronik ataupun stempel basah pada halaman ini.');

  page2.drawText('Halaman 2 dari 2 — Dokumen Sah PDFCraft Pro', {
    x: 40,
    y: 30,
    size: 8,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.55),
  });

  return await pdfDoc.save();
}

/**
 * Merge multiple PDF Uint8Array buffers into a single PDF
 */
export async function mergePDFDocuments(
  pdfBuffers: { name: string; buffer: Uint8Array; pageRange?: number[] }[]
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const item of pdfBuffers) {
    const srcDoc = await PDFDocument.load(item.buffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();
    
    // Determine which pages to copy (1-indexed input converted to 0-indexed)
    let pageIndices: number[] = [];
    if (item.pageRange && item.pageRange.length > 0) {
      pageIndices = item.pageRange
        .map(p => p - 1)
        .filter(p => p >= 0 && p < totalPages);
    } else {
      pageIndices = Array.from({ length: totalPages }, (_, i) => i);
    }

    if (pageIndices.length > 0) {
      const copiedPages = await mergedPdf.copyPages(srcDoc, pageIndices);
      for (const page of copiedPages) {
        mergedPdf.addPage(page);
      }
    }
  }

  return await mergedPdf.save();
}

/**
 * Split PDF by extracting selected pages
 */
export async function extractPDFPages(
  pdfBuffer: Uint8Array,
  pagesToKeep: number[] // 1-indexed
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();
  const totalPages = srcDoc.getPageCount();

  const validIndices = pagesToKeep
    .map(p => p - 1)
    .filter(p => p >= 0 && p < totalPages);

  if (validIndices.length === 0) {
    throw new Error('Tidak ada halaman yang dipilih.');
  }

  const copiedPages = await newDoc.copyPages(srcDoc, validIndices);
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }

  return await newDoc.save();
}

/**
 * Split PDF into individual single-page documents
 */
export async function splitPDFIntoSinglePages(
  pdfBuffer: Uint8Array
): Promise<{ pageNumber: number; buffer: Uint8Array }[]> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const results: { pageNumber: number; buffer: Uint8Array }[] = [];

  for (let i = 0; i < totalPages; i++) {
    const singleDoc = await PDFDocument.create();
    const [copiedPage] = await singleDoc.copyPages(srcDoc, [i]);
    singleDoc.addPage(copiedPage);
    const buf = await singleDoc.save();
    results.push({ pageNumber: i + 1, buffer: buf });
  }

  return results;
}

/**
 * Apply annotations (Text, Signatures, Images, Shapes, Stamps) onto the PDF document
 */
export async function applyAnnotationsToPDF(
  originalPdfBuffer: Uint8Array,
  annotations: AnnotationItem[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalPdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  // Pre-load standard fonts
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);

  for (const ann of annotations) {
    const pageIndex = ann.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { width: pWidth, height: pHeight } = page.getSize();

    // Coordinates in our app: x and y are given in percentage of page or point coordinates
    // We normalize: x is percentage (0-100) or pts. Let's use points on page scale:
    // Screen top-left (0,0) -> PDF bottom-left (0,0)
    // ann.x and ann.y are in PDF points from top-left, so pdfY = pHeight - ann.y - ann.height
    const pdfX = ann.x;
    const pdfY = pHeight - ann.y - ann.height;
    const itemWidth = ann.width;
    const itemHeight = ann.height;

    if (ann.type === 'text') {
      let chosenFont = fontHelvetica;
      if (ann.fontFamily === 'TimesRoman') chosenFont = fontTimes;
      if (ann.fontFamily === 'Courier') chosenFont = fontCourier;

      const textColor = hexToRgb(ann.color || '#000000');
      const fontSize = ann.fontSize || 14;

      // Optional background highlight or text replacement whiteout
      if (ann.backgroundColor && ann.backgroundColor !== 'transparent') {
        const bgColor = hexToRgb(ann.backgroundColor);
        page.drawRectangle({
          x: pdfX - 1,
          y: pdfY - 1,
          width: itemWidth + 2,
          height: itemHeight + 2,
          color: rgb(bgColor.r, bgColor.g, bgColor.b),
          opacity: ann.opacity ?? 1,
        });
      }

      // Draw text lines
      const text = ann.content || '';
      const lines = text.split('\n');
      let currentY = pdfY + itemHeight - fontSize;

      for (const line of lines) {
        page.drawText(line, {
          x: pdfX + 2,
          y: currentY,
          size: fontSize,
          font: chosenFont,
          color: rgb(textColor.r, textColor.g, textColor.b),
          opacity: ann.opacity ?? 1,
        });
        currentY -= fontSize * 1.25;
      }
    } else if (ann.type === 'signature' || ann.type === 'image' || ann.type === 'stamp') {
      if (ann.content && ann.content.startsWith('data:image/')) {
        try {
          const isPng = ann.content.startsWith('data:image/png');
          const base64Data = ann.content.split(',')[1];
          const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

          const embeddedImage = isPng
            ? await pdfDoc.embedPng(imageBytes)
            : await pdfDoc.embedJpg(imageBytes);

          page.drawImage(embeddedImage, {
            x: pdfX,
            y: pdfY,
            width: itemWidth,
            height: itemHeight,
            opacity: ann.opacity ?? 1,
          });

          // Optional digital signature verification footnote if metadata exists
          if (ann.type === 'signature' && ann.metadata?.signerName) {
            const footnoteSize = 7;
            const textY = pdfY - 10;
            const signerInfo = `Ditandatangani secara elektronik oleh: ${ann.metadata.signerName} | ${ann.metadata.date || new Date().toLocaleDateString('id-ID')}`;
            page.drawText(signerInfo, {
              x: pdfX,
              y: textY,
              size: footnoteSize,
              font: fontHelvetica,
              color: rgb(0.2, 0.4, 0.6),
            });
          }
        } catch (imgErr) {
          console.error('Gagal menyematkan gambar/tanda tangan:', imgErr);
        }
      }
    } else if (ann.type === 'shape') {
      const strokeColor = hexToRgb(ann.color || '#2563eb');
      const fillColor = ann.backgroundColor && ann.backgroundColor !== 'transparent'
        ? hexToRgb(ann.backgroundColor)
        : undefined;

      if (ann.shapeType === 'rectangle' || ann.shapeType === 'highlight') {
        const isHighlight = ann.shapeType === 'highlight';
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: itemWidth,
          height: itemHeight,
          borderColor: isHighlight ? undefined : rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          borderWidth: isHighlight ? 0 : (ann.borderWidth || 2),
          color: isHighlight
            ? rgb(strokeColor.r, strokeColor.g, strokeColor.b)
            : fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined,
          opacity: isHighlight ? 0.35 : (ann.opacity ?? 1),
        });
      } else if (ann.shapeType === 'circle') {
        page.drawEllipse({
          x: pdfX + itemWidth / 2,
          y: pdfY + itemHeight / 2,
          xScale: itemWidth / 2,
          yScale: itemHeight / 2,
          borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          borderWidth: ann.borderWidth || 2,
          color: fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined,
          opacity: ann.opacity ?? 1,
        });
      } else if (ann.shapeType === 'line') {
        page.drawLine({
          start: { x: pdfX, y: pdfY + itemHeight },
          end: { x: pdfX + itemWidth, y: pdfY },
          thickness: ann.borderWidth || 2,
          color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          opacity: ann.opacity ?? 1,
        });
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Rotates a page by specified degrees (e.g. 90, 180, 270)
 */
export async function rotatePDFPage(
  pdfBuffer: Uint8Array,
  pageIndex: number,
  additionalDegrees: number
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  if (pages[pageIndex]) {
    const currentRot = pages[pageIndex].getRotation().angle;
    pages[pageIndex].setRotation(degrees((currentRot + additionalDegrees) % 360));
  }
  return await pdfDoc.save();
}

/**
 * Deletes a specific page
 */
export async function deletePDFPage(
  pdfBuffer: Uint8Array,
  pageIndex: number
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  pdfDoc.removePage(pageIndex);
  return await pdfDoc.save();
}

export interface PageOrganizeItem {
  id: string;
  originalPageIndex: number; // 0-indexed, or -1 for blank page
  rotation: number; // additional rotation in degrees (0, 90, 180, 270)
  isBlank?: boolean;
}

/**
 * Reorders, rotates, duplicates, and organizes pages of a PDF document
 */
export async function reorderAndOrganizePages(
  originalPdfBuffer: Uint8Array,
  pageItems: PageOrganizeItem[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(originalPdfBuffer, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();

  for (const item of pageItems) {
    if (item.isBlank || item.originalPageIndex < 0) {
      newDoc.addPage([595.28, 841.89]);
    } else {
      const [copiedPage] = await newDoc.copyPages(srcDoc, [item.originalPageIndex]);
      if (item.rotation) {
        const curAngle = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees((curAngle + item.rotation) % 360));
      }
      newDoc.addPage(copiedPage);
    }
  }

  return await newDoc.save();
}
