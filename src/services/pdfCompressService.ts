import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export type CompressionLevel = 'extreme' | 'recommended' | 'light';

export interface CompressProgress {
  currentPage: number;
  totalPages: number;
  percent: number;
}

export async function compressPdf(
  buffer: Uint8Array,
  level: CompressionLevel,
  onProgress?: (progress: CompressProgress) => void
): Promise<{
  compressedBuffer: Uint8Array;
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
}> {
  const originalSize = buffer.byteLength;
  const pdfDoc = await PDFDocument.create();

  // Settings based on level
  let scale = 1.25;
  let quality = 0.72;

  if (level === 'extreme') {
    scale = 0.95;
    quality = 0.52;
  } else if (level === 'recommended') {
    scale = 1.25;
    quality = 0.72;
  } else if (level === 'light') {
    scale = 1.6;
    quality = 0.85;
  }

  const loadingTask = pdfjsLib.getDocument({
    data: buffer.slice(0),
    cMapUrl: 'https://unpkg.com/pdfjs-dist@4.0.379/cmaps/',
    cMapPacked: true,
  });
  const srcDoc = await loadingTask.promise;
  const totalPages = srcDoc.numPages;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (onProgress) {
      onProgress({
        currentPage: pageNum,
        totalPages,
        percent: Math.round(((pageNum - 0.5) / totalPages) * 100),
      });
    }

    const page = await srcDoc.getPage(pageNum);
    const unscaled = page.getViewport({ scale: 1.0 });
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // Fill white background for clean transparency handling
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // @ts-expect-error pdfjs typing
    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const base64 = dataUrl.split(',')[1];
    const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const embeddedJpg = await pdfDoc.embedJpg(imgBytes);
    // Keep page dimensions matching unscaled original
    const newPage = pdfDoc.addPage([unscaled.width, unscaled.height]);
    newPage.drawImage(embeddedJpg, {
      x: 0,
      y: 0,
      width: unscaled.width,
      height: unscaled.height,
    });
  }

  if (onProgress) {
    onProgress({ currentPage: totalPages, totalPages, percent: 100 });
  }

  const compressedBuffer = await pdfDoc.save({ useObjectStreams: true });
  const compressedSize = compressedBuffer.byteLength;
  const reductionPercent = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

  return {
    compressedBuffer,
    originalSize,
    compressedSize,
    reductionPercent,
  };
}
