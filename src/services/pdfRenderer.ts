/**
 * PDF Renderer service using pdfjs-dist to render pages onto HTML5 canvas.
 */
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker source to avoid bundler worker path resolution issues
// Use unpkg or cdnjs matching installed version or fallback
if (typeof window !== 'undefined') {
  try {
    // Set standard cdn worker fallback
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('Could not set pdf workerSrc directly:', e);
  }
}

export interface RenderedPageResult {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

/**
 * Load PDF document from Uint8Array
 */
export async function loadPDFDocument(data: Uint8Array) {
  // Pass copy of buffer because pdfjs transfers arraybuffers
  const loadingTask = pdfjsLib.getDocument({
    data: data.slice(0),
    cMapUrl: 'https://unpkg.com/pdfjs-dist@4.0.379/cmaps/',
    cMapPacked: true,
  });
  return await loadingTask.promise;
}

/**
 * Render a single page to a canvas element with high DPI support
 */
export async function renderPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  targetCanvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<{ width: number; height: number; originalWidth: number; originalHeight: number }> {
  const page = await pdfDoc.getPage(pageNumber);
  const unscaledViewport = page.getViewport({ scale: 1.0 });
  const viewport = page.getViewport({ scale });

  const context = targetCanvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context 2d tidak tersedia');
  }

  // Adjust for device pixel ratio for ultra-crisp display
  const outputScale = window.devicePixelRatio || 1;
  targetCanvas.width = Math.floor(viewport.width * outputScale);
  targetCanvas.height = Math.floor(viewport.height * outputScale);
  targetCanvas.style.width = `${Math.floor(viewport.width)}px`;
  targetCanvas.style.height = `${Math.floor(viewport.height)}px`;

  context.save();
  context.scale(outputScale, outputScale);

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  // @ts-expect-error pdfjs typing compatibility
  await page.render(renderContext).promise;
  context.restore();

  return {
    width: viewport.width,
    height: viewport.height,
    originalWidth: unscaledViewport.width,
    originalHeight: unscaledViewport.height,
  };
}

/**
 * Generate a thumbnail data URL for a page
 */
export async function renderPageThumbnail(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  thumbWidth: number = 160
): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  const unscaled = page.getViewport({ scale: 1.0 });
  const scale = thumbWidth / unscaled.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const context = canvas.getContext('2d');
  if (!context) return '';

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  // @ts-expect-error pdfjs typing compatibility
  await page.render(renderContext).promise;
  return canvas.toDataURL('image/jpeg', 0.8);
}

export interface ExtractedTextItem {
  id: string;
  text: string;
  x: number; // in PDF unscaled points from top-left
  y: number; // in PDF unscaled points from top-left
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
}

/**
 * Extract all text lines from a PDF page for in-place text editing
 */
export async function extractPageTextItems(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<ExtractedTextItem[]> {
  const page = await pdfDoc.getPage(pageNumber);
  const unscaled = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent();
  const items: ExtractedTextItem[] = [];

  for (let i = 0; i < textContent.items.length; i++) {
    const raw = textContent.items[i] as any;
    if (!raw.str || !raw.str.trim()) continue;

    const tx = raw.transform[4];
    const ty = raw.transform[5];
    const fontHeight = Math.hypot(raw.transform[2], raw.transform[3]) || 12;
    const width = raw.width || (raw.str.length * fontHeight * 0.55);
    const height = raw.height || fontHeight;

    // Convert from PDF coords (y=0 at bottom) to Top-Left coords (y=0 at top)
    const x = Math.max(0, tx);
    const y = Math.max(0, unscaled.height - ty - height);

    items.push({
      id: `text_${pageNumber}_${i}`,
      text: raw.str,
      x,
      y,
      width: Math.max(width, 10),
      height: Math.max(height, fontHeight),
      fontSize: Math.max(8, Math.round(fontHeight)),
      fontName: raw.fontName || 'Helvetica',
    });
  }

  // Merge items on the exact same line within 10px distance to form whole readable phrases
  const merged: ExtractedTextItem[] = [];
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 4) return a.y - b.y;
    return a.x - b.x;
  });

  for (const item of sorted) {
    const last = merged[merged.length - 1];
    if (
      last &&
      Math.abs(last.y - item.y) <= 4 &&
      Math.abs(last.fontSize - item.fontSize) <= 3 &&
      item.x - (last.x + last.width) <= 14 &&
      item.x >= last.x
    ) {
      last.text += (item.x - (last.x + last.width) > 2 ? ' ' : '') + item.text;
      last.width = (item.x + item.width) - last.x;
      last.height = Math.max(last.height, item.height);
    } else {
      merged.push({ ...item });
    }
  }

  return merged;
}
