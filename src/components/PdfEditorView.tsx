import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Trash2,
  Type,
  PenTool,
  Image as ImageIcon,
  Square,
  Highlighter,
  Award,
  Undo2,
  Redo2,
  Download,
  Copy,
  Move,
  ArrowUpCircle,
  ArrowDownCircle,
  Sparkles,
  FileText,
  Search,
  Replace,
  Eraser,
  Edit,
  Lock,
  Unlock,
  Check,
  X
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { AnnotationItem, applyAnnotationsToPDF, rotatePDFPage, deletePDFPage } from '../services/pdfLibService';
import { renderPageToCanvas, renderPageThumbnail, extractPageTextItems, ExtractedTextItem } from '../services/pdfRenderer';
import { SignatureModal } from './SignatureModal';
import { StampPickerModal } from './StampPickerModal';
import { EditExistingTextModal } from './EditExistingTextModal';
import { FindAndReplaceModal } from './FindAndReplaceModal';

interface PdfEditorViewProps {
  pdfBuffer: Uint8Array;
  fileName: string;
  onBufferChange: (newBuffer: Uint8Array) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

type ActiveTool = 'select' | 'text' | 'rect' | 'highlight' | 'whiteout';
type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw' | 'e' | 's';

export function PdfEditorView({
  pdfBuffer,
  fileName,
  onBufferChange,
  onShowToast,
}: PdfEditorViewProps) {
  const [pdfDocProxy, setPdfDocProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.15);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isLoadingDoc, setIsLoadingDoc] = useState<boolean>(true);

  // Canvas & container refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Annotations & Undo/Redo stack
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const annotationsRef = useRef<AnnotationItem[]>([]);
  annotationsRef.current = annotations;

  const [history, setHistory] = useState<AnnotationItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Active tool and selected element
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);

  // Text Extraction & Existing PDF Text Editing state
  const [extractedTexts, setExtractedTexts] = useState<ExtractedTextItem[]>([]);
  const [isTextEditModeActive, setIsTextEditModeActive] = useState<boolean>(false);
  const [isLoadingExtractedTexts, setIsLoadingExtractedTexts] = useState<boolean>(false);
  const [targetTextItemForEdit, setTargetTextItemForEdit] = useState<ExtractedTextItem | null>(null);
  const [isEditTextModalOpen, setIsEditTextModalOpen] = useState<boolean>(false);
  const [isFindReplaceModalOpen, setIsFindReplaceModalOpen] = useState<boolean>(false);

  // Modals
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isStampModalOpen, setIsStampModalOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Current page dimensions (PDF unscaled points)
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }>({
    width: 595.28,
    height: 841.89,
  });

  // Direct dragging and multi-handle resizing state refs to avoid stale closures
  const dragRef = useRef<{
    isDragging: boolean;
    id: string | null;
    startX: number;
    startY: number;
    initialElemX: number;
    initialElemY: number;
  }>({
    isDragging: false,
    id: null,
    startX: 0,
    startY: 0,
    initialElemX: 0,
    initialElemY: 0,
  });

  const resizeRef = useRef<{
    isResizing: boolean;
    id: string | null;
    handle: ResizeHandle | null;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
    aspectRatio: number;
  }>({
    isResizing: false,
    id: null,
    handle: null,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    initialW: 0,
    initialH: 0,
    aspectRatio: 1,
  });

  // Inline editing for text annotation
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Commit annotations to history
  const commitAnnotations = useCallback((newAnnotations: AnnotationItem[]) => {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, newAnnotations];
    });
    setHistoryIndex((prev) => prev + 1);
    setAnnotations(newAnnotations);
  }, [historyIndex]);

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setAnnotations(history[newIndex]);
      onShowToast('Aksi dibatalkan (Undo)', 'info');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setAnnotations(history[newIndex]);
      onShowToast('Aksi diulang (Redo)', 'info');
    }
  };

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    async function loadDoc() {
      setIsLoadingDoc(true);
      try {
        const loadingTask = pdfjsLib.getDocument({
          data: pdfBuffer.slice(0),
          cMapUrl: 'https://unpkg.com/pdfjs-dist@4.0.379/cmaps/',
          cMapPacked: true,
        });
        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDocProxy(doc);
        setTotalPages(doc.numPages);
        if (currentPage > doc.numPages) {
          setCurrentPage(1);
        }

        // Generate thumbnails
        const thumbList: string[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          try {
            const thumbUrl = await renderPageThumbnail(doc, i, 120);
            thumbList.push(thumbUrl);
          } catch (e) {
            thumbList.push('');
          }
        }
        if (!isCancelled) {
          setThumbnails(thumbList);
        }
      } catch (err) {
        console.error('Error loading PDF document:', err);
        onShowToast('Gagal memuat dokumen PDF.', 'error');
      } finally {
        if (!isCancelled) setIsLoadingDoc(false);
      }
    }

    loadDoc();
    return () => {
      isCancelled = true;
    };
  }, [pdfBuffer]);

  // Render current page to canvas & extract text
  useEffect(() => {
    if (!pdfDocProxy || !canvasRef.current) return;

    let isCancelled = false;
    async function renderPage() {
      try {
        const canvas = canvasRef.current;
        if (!canvas || !pdfDocProxy) return;

        const info = await renderPageToCanvas(pdfDocProxy, currentPage, canvas, zoomScale);
        if (!isCancelled) {
          setPageDimensions({
            width: info.originalWidth,
            height: info.originalHeight,
          });
        }

        // Extract text items from this page
        setIsLoadingExtractedTexts(true);
        try {
          const texts = await extractPageTextItems(pdfDocProxy, currentPage);
          if (!isCancelled) {
            setExtractedTexts(texts);
          }
        } catch (textErr) {
          console.warn('Text extraction warning:', textErr);
        } finally {
          if (!isCancelled) setIsLoadingExtractedTexts(false);
        }
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    }

    renderPage();
    return () => {
      isCancelled = true;
    };
  }, [pdfDocProxy, currentPage, zoomScale]);

  // Window-level mousemove & mouseup for butter-smooth dragging & resizing
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (dragRef.current.isDragging && dragRef.current.id) {
        const id = dragRef.current.id;
        const deltaX = (e.clientX - dragRef.current.startX) / zoomScale;
        const deltaY = (e.clientY - dragRef.current.startY) / zoomScale;

        setAnnotations((prev) =>
          prev.map((ann) => {
            if (ann.id !== id) return ann;
            const newX = Math.round(Math.max(0, Math.min(pageDimensions.width - ann.width, dragRef.current.initialElemX + deltaX)));
            const newY = Math.round(Math.max(0, Math.min(pageDimensions.height - ann.height, dragRef.current.initialElemY + deltaY)));
            return { ...ann, x: newX, y: newY };
          })
        );
      } else if (resizeRef.current.isResizing && resizeRef.current.id && resizeRef.current.handle) {
        const id = resizeRef.current.id;
        const handle = resizeRef.current.handle;
        const deltaX = (e.clientX - resizeRef.current.startX) / zoomScale;
        const deltaY = (e.clientY - resizeRef.current.startY) / zoomScale;

        const { initialX, initialY, initialW, initialH, aspectRatio } = resizeRef.current;

        setAnnotations((prev) =>
          prev.map((ann) => {
            if (ann.id !== id) return ann;

            let newW = initialW;
            let newH = initialH;
            let newX = initialX;
            let newY = initialY;

            if (handle === 'se') {
              newW = Math.max(24, initialW + deltaX);
              if (lockAspectRatio && (ann.type === 'signature' || ann.type === 'image' || ann.type === 'stamp')) {
                newH = newW / aspectRatio;
              } else {
                newH = Math.max(20, initialH + deltaY);
              }
            } else if (handle === 'e') {
              newW = Math.max(24, initialW + deltaX);
            } else if (handle === 's') {
              newH = Math.max(20, initialH + deltaY);
            } else if (handle === 'sw') {
              const proposedW = Math.max(24, initialW - deltaX);
              newX = initialX + (initialW - proposedW);
              newW = proposedW;
              if (lockAspectRatio && (ann.type === 'signature' || ann.type === 'image' || ann.type === 'stamp')) {
                newH = newW / aspectRatio;
              } else {
                newH = Math.max(20, initialH + deltaY);
              }
            } else if (handle === 'ne') {
              newW = Math.max(24, initialW + deltaX);
              const proposedH = Math.max(20, initialH - deltaY);
              newY = initialY + (initialH - proposedH);
              newH = proposedH;
            } else if (handle === 'nw') {
              const proposedW = Math.max(24, initialW - deltaX);
              const proposedH = Math.max(20, initialH - deltaY);
              newX = initialX + (initialW - proposedW);
              newY = initialY + (initialH - proposedH);
              newW = proposedW;
              newH = proposedH;
            }

            return {
              ...ann,
              x: Math.round(newX),
              y: Math.round(newY),
              width: Math.round(newW),
              height: Math.round(newH),
            };
          })
        );
      }
    };

    const handleWindowMouseUp = () => {
      if (dragRef.current.isDragging || resizeRef.current.isResizing) {
        dragRef.current.isDragging = false;
        dragRef.current.id = null;
        resizeRef.current.isResizing = false;
        resizeRef.current.id = null;
        resizeRef.current.handle = null;

        // Commit updated annotations from ref
        commitAnnotations(annotationsRef.current);
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [zoomScale, pageDimensions, lockAspectRatio, commitAnnotations]);

  // Handle overlay click to insert items if tool is active
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If user clicked inside an annotation or its handle, ignore background click
    const target = e.target as HTMLElement;
    if (target.closest('[data-element-id]') || target.closest('[data-resize-handle]')) {
      return;
    }

    const overlayRect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - overlayRect.left;
    const clickY = e.clientY - overlayRect.top;

    const pdfX = Math.round(clickX / zoomScale);
    const pdfY = Math.round(clickY / zoomScale);

    if (activeTool === 'text') {
      const newAnn: AnnotationItem = {
        id: 'ann_' + Date.now(),
        pageNumber: currentPage,
        type: 'text',
        x: Math.max(0, pdfX - 10),
        y: Math.max(0, pdfY - 10),
        width: 180,
        height: 38,
        content: 'Ketik teks di sini...',
        fontFamily: 'Helvetica',
        fontSize: 14,
        color: '#0f172a',
        backgroundColor: 'transparent',
      };
      commitAnnotations([...annotations, newAnn]);
      setSelectedId(newAnn.id);
      setActiveTool('select');
      onShowToast('Kotak teks ditambahkan. Klik dua kali untuk mengedit.', 'success');
    } else if (activeTool === 'whiteout') {
      // Tip-Ex / Whiteout box
      const newAnn: AnnotationItem = {
        id: 'whiteout_' + Date.now(),
        pageNumber: currentPage,
        type: 'shape',
        shapeType: 'rectangle',
        x: Math.max(0, pdfX - 40),
        y: Math.max(0, pdfY - 15),
        width: 120,
        height: 28,
        color: '#ffffff',
        borderWidth: 0,
        backgroundColor: '#ffffff',
        opacity: 1,
      };
      commitAnnotations([...annotations, newAnn]);
      setSelectedId(newAnn.id);
      setActiveTool('select');
      onShowToast('Tip-Ex / Kotak pemutih ditambahkan untuk menutupi teks', 'success');
    } else if (activeTool === 'rect') {
      const newAnn: AnnotationItem = {
        id: 'ann_' + Date.now(),
        pageNumber: currentPage,
        type: 'shape',
        shapeType: 'rectangle',
        x: Math.max(0, pdfX - 50),
        y: Math.max(0, pdfY - 30),
        width: 140,
        height: 60,
        color: '#2563eb',
        borderWidth: 2,
        backgroundColor: 'transparent',
        opacity: 1,
      };
      commitAnnotations([...annotations, newAnn]);
      setSelectedId(newAnn.id);
      setActiveTool('select');
      onShowToast('Kotak bentuk ditambahkan', 'success');
    } else if (activeTool === 'highlight') {
      const newAnn: AnnotationItem = {
        id: 'ann_' + Date.now(),
        pageNumber: currentPage,
        type: 'shape',
        shapeType: 'highlight',
        x: Math.max(0, pdfX - 60),
        y: Math.max(0, pdfY - 10),
        width: 160,
        height: 22,
        color: '#facc15',
        backgroundColor: 'transparent',
        opacity: 0.45,
      };
      commitAnnotations([...annotations, newAnn]);
      setSelectedId(newAnn.id);
      setActiveTool('select');
      onShowToast('Penyorot ditambahkan', 'success');
    } else {
      setSelectedId(null);
      setEditingTextId(null);
    }
  };

  // Drag element handler
  const handleStartDrag = (e: React.MouseEvent, ann: AnnotationItem) => {
    e.stopPropagation();
    setSelectedId(ann.id);
    dragRef.current = {
      isDragging: true,
      id: ann.id,
      startX: e.clientX,
      startY: e.clientY,
      initialElemX: ann.x,
      initialElemY: ann.y,
    };
  };

  // Resize element handler
  const handleStartResize = (e: React.MouseEvent, ann: AnnotationItem, handle: ResizeHandle) => {
    e.stopPropagation();
    setSelectedId(ann.id);
    resizeRef.current = {
      isResizing: true,
      id: ann.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialX: ann.x,
      initialY: ann.y,
      initialW: ann.width,
      initialH: ann.height,
      aspectRatio: ann.width / Math.max(1, ann.height),
    };
  };

  // Selected annotation inspector states
  const selectedAnnotation = annotations.find((a) => a.id === selectedId);

  // Direct dimension adjusters (X, Y, W, H)
  const updateSelectedDimensions = (changes: Partial<AnnotationItem>) => {
    if (!selectedId) return;
    const updated = annotations.map((a) => (a.id === selectedId ? { ...a, ...changes } : a));
    commitAnnotations(updated);
  };

  // Delete selected item
  const handleDeleteSelected = () => {
    if (!selectedId) return;
    const next = annotations.filter((a) => a.id !== selectedId);
    commitAnnotations(next);
    setSelectedId(null);
    setEditingTextId(null);
    onShowToast('Elemen dihapus', 'info');
  };

  // Duplicate selected item
  const handleDuplicateSelected = () => {
    if (!selectedAnnotation) return;
    const duplicated: AnnotationItem = {
      ...selectedAnnotation,
      id: 'ann_' + Date.now(),
      x: selectedAnnotation.x + 20,
      y: selectedAnnotation.y + 20,
    };
    commitAnnotations([...annotations, duplicated]);
    setSelectedId(duplicated.id);
    onShowToast('Elemen digandakan', 'success');
  };

  // Bring to front & Send to back
  const handleBringToFront = () => {
    if (!selectedAnnotation) return;
    const other = annotations.filter((a) => a.id !== selectedId);
    commitAnnotations([...other, selectedAnnotation]);
    onShowToast('Pindah ke lapisan paling depan', 'info');
  };

  const handleSendToBack = () => {
    if (!selectedAnnotation) return;
    const other = annotations.filter((a) => a.id !== selectedId);
    commitAnnotations([selectedAnnotation, ...other]);
    onShowToast('Pindah ke lapisan paling belakang', 'info');
  };

  // Signature applied from modal
  const handleApplySignature = (dataUrl: string, metadata?: { signerName?: string; date?: string; reason?: string }) => {
    const width = metadata ? 240 : 180;
    const height = metadata ? 90 : 70;
    const newAnn: AnnotationItem = {
      id: 'sig_' + Date.now(),
      pageNumber: currentPage,
      type: 'signature',
      content: dataUrl,
      x: 100,
      y: 200,
      width,
      height,
      metadata: metadata,
      opacity: 1,
    };
    commitAnnotations([...annotations, newAnn]);
    setSelectedId(newAnn.id);
    onShowToast('Tanda tangan disematkan! Anda dapat menyeret atau mengubah ukurannya.', 'success');
  };

  // Stamp applied from modal
  const handleApplyStamp = (stampDataUrl: string, title: string) => {
    const newAnn: AnnotationItem = {
      id: 'stamp_' + Date.now(),
      pageNumber: currentPage,
      type: 'stamp',
      content: stampDataUrl,
      stampType: title,
      x: 120,
      y: 160,
      width: 170,
      height: 70,
      opacity: 0.95,
    };
    commitAnnotations([...annotations, newAnn]);
    setSelectedId(newAnn.id);
    onShowToast(`Stempel "${title}" berhasil disematkan!`, 'success');
  };

  // Image uploaded from toolbar
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Calculate proportional default dimensions
        const maxDefaultW = 200;
        const scale = Math.min(1, maxDefaultW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const newAnn: AnnotationItem = {
          id: 'img_' + Date.now(),
          pageNumber: currentPage,
          type: 'image',
          content: dataUrl,
          x: 100,
          y: 150,
          width: w,
          height: h,
          opacity: 1,
        };
        commitAnnotations([...annotations, newAnn]);
        setSelectedId(newAnn.id);
        onShowToast('Gambar berhasil disisipkan! Tarik sudut untuk mengubah ukuran.', 'success');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Apply replacement for existing PDF text block
  const handleApplyTextReplacement = (
    item: ExtractedTextItem,
    newText: string,
    options: {
      fontSize: number;
      fontFamily: 'Helvetica' | 'TimesRoman' | 'Courier';
      color: string;
      whiteoutColor: string;
      isDeleteOnly?: boolean;
    }
  ) => {
    const paddingX = 4;
    const paddingY = 2;
    const finalWidth = Math.max(item.width + paddingX * 2, newText.length * options.fontSize * 0.65);
    const finalHeight = Math.max(item.height + paddingY * 2, options.fontSize * 1.3);

    const replacementAnn: AnnotationItem = {
      id: 'text_replace_' + Date.now(),
      pageNumber: currentPage,
      type: 'text',
      isTextReplacement: true,
      originalText: item.text,
      content: options.isDeleteOnly ? '' : newText,
      x: Math.max(0, item.x - paddingX),
      y: Math.max(0, item.y - paddingY),
      width: Math.round(finalWidth),
      height: Math.round(finalHeight),
      fontFamily: options.fontFamily,
      fontSize: options.fontSize,
      color: options.color,
      backgroundColor: options.whiteoutColor, // Covers original text cleanly
      opacity: 1,
    };

    commitAnnotations([...annotations, replacementAnn]);
    setSelectedId(replacementAnn.id);
    onShowToast(
      options.isDeleteOnly ? 'Teks asli berhasil dihapus (Tip-Ex)' : 'Teks asli PDF berhasil diperbarui!',
      'success'
    );
  };

  // Batch Replace (Find & Replace)
  const handleBatchFindReplace = (
    matches: ExtractedTextItem[],
    replacementText: string,
    options: { color?: string; whiteoutColor?: string }
  ) => {
    const newAnns: AnnotationItem[] = [];

    matches.forEach((item, idx) => {
      const paddingX = 3;
      const paddingY = 2;
      const fontSize = Math.max(9, Math.round(item.fontSize));
      const finalWidth = Math.max(item.width + paddingX * 2, replacementText.length * fontSize * 0.65);
      const finalHeight = Math.max(item.height + paddingY * 2, fontSize * 1.3);

      newAnns.push({
        id: 'batch_replace_' + Date.now() + '_' + idx,
        pageNumber: currentPage,
        type: 'text',
        isTextReplacement: true,
        originalText: item.text,
        content: replacementText,
        x: Math.max(0, item.x - paddingX),
        y: Math.max(0, item.y - paddingY),
        width: Math.round(finalWidth),
        height: Math.round(finalHeight),
        fontFamily: 'Helvetica',
        fontSize: fontSize,
        color: options.color || '#0f172a',
        backgroundColor: options.whiteoutColor || '#ffffff',
        opacity: 1,
      });
    });

    commitAnnotations([...annotations, ...newAnns]);
    onShowToast(`${matches.length} teks berhasil diganti secara otomatis!`, 'success');
  };

  // Page operations
  const handleRotateCurrentPage = async () => {
    try {
      const updated = await rotatePDFPage(pdfBuffer, currentPage - 1, 90);
      onBufferChange(updated);
      onShowToast(`Halaman ${currentPage} diputar 90°`, 'info');
    } catch (err) {
      console.error(err);
      onShowToast('Gagal memutar halaman', 'error');
    }
  };

  const handleDeleteCurrentPage = async () => {
    if (totalPages <= 1) {
      onShowToast('Dokumen harus memiliki minimal 1 halaman', 'warning');
      return;
    }
    if (!confirm(`Hapus Halaman ${currentPage} secara permanen?`)) return;

    try {
      const updated = await deletePDFPage(pdfBuffer, currentPage - 1);
      const updatedAnns = annotations
        .filter((a) => a.pageNumber !== currentPage)
        .map((a) => (a.pageNumber > currentPage ? { ...a, pageNumber: a.pageNumber - 1 } : a));

      setAnnotations(updatedAnns);
      onBufferChange(updated);
      if (currentPage > 1) {
        setCurrentPage((p) => p - 1);
      }
      onShowToast(`Halaman ${currentPage} berhasil dihapus`, 'success');
    } catch (err) {
      console.error(err);
      onShowToast('Gagal menghapus halaman', 'error');
    }
  };

  // Export finished PDF with annotations burned in
  const handleExportPDF = async () => {
    try {
      onShowToast('Menyusun dan mengekspor dokumen PDF...', 'info');
      const finalBuffer = await applyAnnotationsToPDF(pdfBuffer, annotations);

      const blob = new Blob([finalBuffer as BlobPart], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName.replace(/\.pdf$/i, '') + '_diedit.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      onShowToast('Dokumen PDF berhasil diekspor dan diunduh!', 'success');
    } catch (err) {
      console.error('Export failed:', err);
      onShowToast('Gagal mengekspor PDF: ' + (err as Error).message, 'error');
    }
  };

  const currentPageAnnotations = annotations.filter((a) => a.pageNumber === currentPage);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-61px)] overflow-hidden bg-neutral-100">
      
      {/* Primary Editing Toolbar */}
      <div className="bg-white border-b border-neutral-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        
        {/* Left Tools Group */}
        <div className="flex items-center gap-1.5 flex-wrap">
          
          {/* Select & Move */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('select');
              setIsTextEditModeActive(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTool === 'select' && !isTextEditModeActive
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
            title="Pilih, Geser, dan Ubah Ukuran Objek"
          >
            <Move className="w-3.5 h-3.5" />
            <span>Pilih Objek</span>
          </button>

          {/* Edit Existing PDF Text Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextState = !isTextEditModeActive;
              setIsTextEditModeActive(nextState);
              if (nextState) {
                setActiveTool('select');
                onShowToast('Mode Edit Teks Aktif: Klik pada kalimat mana saja di dokumen untuk mengedit!', 'info');
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              isTextEditModeActive
                ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
            }`}
            title="Deteksi dan edit teks asli dokumen PDF"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Teks Asli PDF</span>
            {extractedTexts.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
                {extractedTexts.length}
              </span>
            )}
          </button>

          {/* Find & Replace */}
          <button
            type="button"
            onClick={() => setIsFindReplaceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-neutral-700 hover:bg-neutral-100 border border-neutral-200 transition-colors"
            title="Cari kata di PDF dan ganti secara otomatis"
          >
            <Replace className="w-3.5 h-3.5" />
            <span>Cari & Ganti</span>
          </button>

          {/* Tip-Ex / Whiteout */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('whiteout');
              setIsTextEditModeActive(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTool === 'whiteout'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
            }`}
            title="Hapus / Tutup teks asli dengan Tip-Ex putih"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Tip-Ex / Hapus Teks</span>
          </button>

          <div className="h-4 w-px bg-neutral-200 mx-1" />

          {/* Add Text */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('text');
              setIsTextEditModeActive(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTool === 'text'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
            title="Tambah Teks Baru di mana saja"
          >
            <Type className="w-3.5 h-3.5" />
            <span>Tambah Teks</span>
          </button>

          {/* Add Signature */}
          <button
            type="button"
            onClick={() => setIsSignatureModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-xs"
            title="Buat Tanda Tangan Digital (Gambar, Ketik, Unggah)"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Tanda Tangan</span>
          </button>

          {/* Add Image */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-neutral-700 hover:bg-neutral-100 transition-colors"
            title="Sisipkan Foto / Logo / Cap Stempel"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Gambar</span>
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Add Stamp */}
          <button
            type="button"
            onClick={() => setIsStampModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-neutral-700 hover:bg-neutral-100 transition-colors"
            title="Pilih Stempel Resmi (Lunas, Disetujui, E-Meterai, dll)"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Stempel</span>
          </button>

          {/* Highlight */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('highlight');
              setIsTextEditModeActive(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTool === 'highlight'
                ? 'bg-amber-100 text-amber-900 font-semibold'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
            title="Sorot teks / area penting"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>Sorotan</span>
          </button>

          <div className="h-4 w-px bg-neutral-200 mx-1" />

          {/* Undo / Redo */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none rounded-md"
            title="Urungkan Perubahan (Undo)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none rounded-md"
            title="Ulangi Perubahan (Redo)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center / Right Group: Zoom, Pages, & Actions */}
        <div className="flex items-center gap-3">
          
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
              className="p-1 text-neutral-600 hover:text-neutral-900 rounded"
              title="Perkecil Tampilan"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] tabular-nums text-neutral-700 min-w-[42px] text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
              className="p-1 text-neutral-600 hover:text-neutral-900 rounded"
              title="Perbesar Tampilan"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1.15)}
              className="p-1 text-neutral-600 hover:text-neutral-900 rounded"
              title="Reset Skala 100%"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-30 rounded-md"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs tabular-nums text-neutral-700 px-1">
              Halaman <span className="font-semibold">{currentPage}</span> / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-30 rounded-md"
              title="Halaman Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-neutral-200 mx-1" />

          {/* Page Rotate & Delete */}
          <button
            type="button"
            onClick={handleRotateCurrentPage}
            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md"
            title="Putar Halaman Ini 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDeleteCurrentPage}
            className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md"
            title="Hapus Halaman Ini"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Primary CTA: Export PDF */}
          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs ml-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh PDF</span>
          </button>
        </div>
      </div>

      {/* Floating Precision Inspector when an element is selected */}
      {selectedAnnotation && (
        <div className="bg-white/95 backdrop-blur-xs border-b border-neutral-200 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-neutral-700 shrink-0 gap-3 shadow-2xs">
          
          {/* Left section: Type badge & Content/Text editors */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-neutral-900 uppercase text-[10px] tracking-wider px-2 py-0.5 bg-neutral-100 rounded">
              {selectedAnnotation.type === 'text'
                ? selectedAnnotation.isTextReplacement
                  ? 'Teks Hasil Edit'
                  : 'Kotak Teks'
                : selectedAnnotation.type === 'signature'
                ? 'Tanda Tangan'
                : selectedAnnotation.type === 'stamp'
                ? 'Stempel'
                : 'Bentuk / Tip-Ex'}
            </span>

            {/* If Text: Edit text content, font size, font family, color */}
            {selectedAnnotation.type === 'text' && (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={selectedAnnotation.content || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAnnotations((prev) =>
                      prev.map((a) => (a.id === selectedId ? { ...a, content: val } : a))
                    );
                  }}
                  className="px-2.5 py-1 text-xs border border-neutral-300 rounded bg-white w-52 focus:outline-hidden focus:border-neutral-900"
                  placeholder="Ketik isi teks..."
                />

                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-neutral-500">Ukuran:</span>
                  <select
                    value={selectedAnnotation.fontSize || 14}
                    onChange={(e) => updateSelectedDimensions({ fontSize: Number(e.target.value) })}
                    className="px-2 py-1 text-xs border border-neutral-300 rounded bg-white font-mono"
                  >
                    {[9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 40].map((s) => (
                      <option key={s} value={s}>
                        {s} pt
                      </option>
                    ))}
                  </select>
                </div>

                <select
                  value={selectedAnnotation.fontFamily || 'Helvetica'}
                  onChange={(e) => updateSelectedDimensions({ fontFamily: e.target.value as any })}
                  className="px-2 py-1 text-xs border border-neutral-300 rounded bg-white"
                >
                  <option value="Helvetica">Helvetica (Sans)</option>
                  <option value="TimesRoman">Times Roman (Serif)</option>
                  <option value="Courier">Courier (Mono)</option>
                </select>

                <div className="flex items-center gap-1 pl-1">
                  {['#0f172a', '#1e40af', '#b91c1c', '#15803d'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateSelectedDimensions({ color: c })}
                      style={{ backgroundColor: c }}
                      className={`w-4 h-4 rounded-full border border-white shadow-2xs ${
                        selectedAnnotation.color === c ? 'ring-2 ring-neutral-900' : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Position and Size Steppers (X, Y, Lebar, Tinggi) for exact adjustment */}
            <div className="flex items-center gap-2 pl-2 border-l border-neutral-200">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-neutral-400 font-mono">X:</span>
                <input
                  type="number"
                  value={Math.round(selectedAnnotation.x)}
                  onChange={(e) => updateSelectedDimensions({ x: Number(e.target.value) })}
                  className="w-14 px-1.5 py-0.5 text-xs border border-neutral-300 rounded text-center font-mono bg-white"
                />
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-neutral-400 font-mono">Y:</span>
                <input
                  type="number"
                  value={Math.round(selectedAnnotation.y)}
                  onChange={(e) => updateSelectedDimensions({ y: Number(e.target.value) })}
                  className="w-14 px-1.5 py-0.5 text-xs border border-neutral-300 rounded text-center font-mono bg-white"
                />
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-neutral-400 font-mono">L:</span>
                <input
                  type="number"
                  value={Math.round(selectedAnnotation.width)}
                  onChange={(e) => updateSelectedDimensions({ width: Math.max(20, Number(e.target.value)) })}
                  className="w-14 px-1.5 py-0.5 text-xs border border-neutral-300 rounded text-center font-mono bg-white"
                  title="Lebar elemen (Width)"
                />
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-neutral-400 font-mono">T:</span>
                <input
                  type="number"
                  value={Math.round(selectedAnnotation.height)}
                  onChange={(e) => updateSelectedDimensions({ height: Math.max(16, Number(e.target.value)) })}
                  className="w-14 px-1.5 py-0.5 text-xs border border-neutral-300 rounded text-center font-mono bg-white"
                  title="Tinggi elemen (Height)"
                />
              </div>

              {/* Quick size presets */}
              <div className="flex items-center gap-1 ml-1">
                <button
                  type="button"
                  onClick={() =>
                    updateSelectedDimensions({
                      width: Math.round(selectedAnnotation.width * 0.8),
                      height: Math.round(selectedAnnotation.height * 0.8),
                    })
                  }
                  className="px-1.5 py-0.5 text-[11px] bg-neutral-100 hover:bg-neutral-200 rounded text-neutral-700"
                  title="Perkecil 20%"
                >
                  -20%
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateSelectedDimensions({
                      width: Math.round(selectedAnnotation.width * 1.25),
                      height: Math.round(selectedAnnotation.height * 1.25),
                    })
                  }
                  className="px-1.5 py-0.5 text-[11px] bg-neutral-100 hover:bg-neutral-200 rounded text-neutral-700"
                  title="Perbesar 25%"
                >
                  +25%
                </button>
              </div>

              {/* Aspect Ratio Lock for Images and Signatures */}
              {(selectedAnnotation.type === 'signature' || selectedAnnotation.type === 'image' || selectedAnnotation.type === 'stamp') && (
                <button
                  type="button"
                  onClick={() => setLockAspectRatio(!lockAspectRatio)}
                  className={`p-1 rounded transition-colors ${
                    lockAspectRatio ? 'text-blue-600 bg-blue-50' : 'text-neutral-400 hover:text-neutral-700'
                  }`}
                  title={lockAspectRatio ? 'Rasio Aspek Terkunci (Proporsional)' : 'Rasio Aspek Bebas'}
                >
                  {lockAspectRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDuplicateSelected}
              className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded"
              title="Gandakan Objek"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Salin</span>
            </button>
            <button
              type="button"
              onClick={handleBringToFront}
              className="p-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded"
              title="Bawa ke Depan"
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleSendToBack}
              className="p-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded"
              title="Kirim ke Belakang"
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
            </button>
            <div className="h-3 w-px bg-neutral-200 mx-1" />
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="flex items-center gap-1 px-2 py-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded"
              title="Hapus Objek"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace: Left Thumbnails + Center Canvas */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Thumbnails Sidebar */}
        <div className="w-48 bg-white border-r border-neutral-200 overflow-y-auto p-3 flex flex-col gap-3 shrink-0">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-1">
            Halaman Dokumen ({totalPages})
          </div>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
            const isSelected = pNum === currentPage;
            const thumbUrl = thumbnails[pNum - 1];
            const pageAnnsCount = annotations.filter((a) => a.pageNumber === pNum).length;

            return (
              <button
                key={pNum}
                type="button"
                onClick={() => setCurrentPage(pNum)}
                className={`group relative text-left p-2 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-neutral-900 bg-neutral-50 ring-2 ring-neutral-900/10'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white'
                }`}
              >
                <div className="aspect-[1/1.414] bg-neutral-100 rounded overflow-hidden flex items-center justify-center border border-neutral-200 relative">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={`Halaman ${pNum}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-neutral-400 font-mono text-xs">P.{pNum}</div>
                  )}

                  {pageAnnsCount > 0 && (
                    <div className="absolute top-1 right-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                      {pageAnnsCount}
                    </div>
                  )}
                </div>

                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className={`font-medium ${isSelected ? 'text-neutral-900' : 'text-neutral-600'}`}>
                    Halaman {pNum}
                  </span>
                  {isSelected && <span className="text-[10px] text-neutral-500 font-mono">Aktif</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Center Canvas Viewport */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto p-8 flex justify-center items-start relative select-none"
        >
          {isLoadingDoc ? (
            <div className="flex flex-col items-center justify-center mt-24 text-neutral-500 space-y-2">
              <div className="w-8 h-8 border-3 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
              <p className="text-xs">Memuat halaman dokumen PDF...</p>
            </div>
          ) : (
            <div
              className="relative shadow-xl border border-neutral-300 bg-white rounded-xs transition-shadow duration-200"
              style={{
                width: `${pageDimensions.width * zoomScale}px`,
                height: `${pageDimensions.height * zoomScale}px`,
              }}
            >
              {/* PDF.js canvas backdrop */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 block pointer-events-none"
              />

              {/* Layer 1: Detectable Existing PDF Text Blocks (When Edit Existing Text mode is active) */}
              {isTextEditModeActive && (
                <div className="absolute inset-0 z-20 pointer-events-auto">
                  {extractedTexts.map((item) => (
                    <div
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetTextItemForEdit(item);
                        setIsEditTextModalOpen(true);
                      }}
                      className="absolute group border border-dashed border-blue-400 hover:border-solid hover:border-blue-600 hover:bg-blue-500/15 cursor-pointer rounded-xs transition-all"
                      style={{
                        left: `${item.x * zoomScale}px`,
                        top: `${item.y * zoomScale}px`,
                        width: `${item.width * zoomScale}px`,
                        height: `${Math.max(item.height, 14) * zoomScale}px`,
                      }}
                      title={`Klik untuk edit teks: "${item.text}"`}
                    >
                      <div className="hidden group-hover:flex absolute -top-5 left-0 items-center gap-1 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-30">
                        <Edit className="w-2.5 h-2.5" />
                        <span>Edit Teks Asli</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Layer 2: Interactive Overlay Layer for Annotations & Elements */}
              <div
                onClick={handleOverlayClick}
                className={`absolute inset-0 overflow-hidden ${
                  activeTool === 'text'
                    ? 'cursor-text'
                    : activeTool === 'whiteout'
                    ? 'cursor-cell'
                    : activeTool === 'rect' || activeTool === 'highlight'
                    ? 'cursor-crosshair'
                    : 'cursor-default'
                }`}
              >
                {currentPageAnnotations.map((ann) => {
                  const isSelected = ann.id === selectedId;
                  const itemLeft = ann.x * zoomScale;
                  const itemTop = ann.y * zoomScale;
                  const itemWidth = ann.width * zoomScale;
                  const itemHeight = ann.height * zoomScale;

                  return (
                    <div
                      key={ann.id}
                      data-element-id={ann.id}
                      onMouseDown={(e) => handleStartDrag(e, ann)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (ann.type === 'text') {
                          setEditingTextId(ann.id);
                        }
                      }}
                      className={`absolute group transition-shadow select-none ${
                        isSelected
                          ? 'ring-2 ring-blue-600 shadow-md ring-offset-1 z-30 cursor-move'
                          : 'hover:ring-1 hover:ring-neutral-400 cursor-pointer z-10'
                      }`}
                      style={{
                        left: `${itemLeft}px`,
                        top: `${itemTop}px`,
                        width: `${itemWidth}px`,
                        height: `${itemHeight}px`,
                      }}
                    >
                      {/* Render based on item type */}
                      {ann.type === 'text' && (
                        <>
                          {editingTextId === ann.id ? (
                            <textarea
                              autoFocus
                              value={ann.content || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAnnotations((prev) =>
                                  prev.map((a) => (a.id === ann.id ? { ...a, content: val } : a))
                                );
                              }}
                              onBlur={() => {
                                setEditingTextId(null);
                                commitAnnotations(annotationsRef.current);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setEditingTextId(null);
                                  commitAnnotations(annotationsRef.current);
                                }
                              }}
                              className="w-full h-full p-1 text-xs border border-blue-500 bg-white rounded focus:outline-hidden resize-none"
                              style={{
                                fontSize: `${(ann.fontSize || 14) * zoomScale}px`,
                                color: ann.color || '#000000',
                              }}
                            />
                          ) : (
                            <div
                              className="w-full h-full p-1 whitespace-pre-wrap select-none leading-tight overflow-hidden"
                              style={{
                                fontFamily:
                                  ann.fontFamily === 'TimesRoman'
                                    ? 'Times New Roman, serif'
                                    : ann.fontFamily === 'Courier'
                                    ? 'Courier New, monospace'
                                    : 'Helvetica, Arial, sans-serif',
                                fontSize: `${(ann.fontSize || 14) * zoomScale}px`,
                                color: ann.color || '#000000',
                                backgroundColor: ann.backgroundColor || 'transparent',
                              }}
                            >
                              {ann.content || ''}
                            </div>
                          )}
                        </>
                      )}

                      {(ann.type === 'signature' || ann.type === 'image' || ann.type === 'stamp') && (
                        <div className="w-full h-full relative pointer-events-none">
                          <img
                            src={ann.content}
                            alt="Anotasi"
                            className="w-full h-full object-contain pointer-events-none select-none"
                            style={{ opacity: ann.opacity ?? 1 }}
                            draggable={false}
                          />
                        </div>
                      )}

                      {ann.type === 'shape' && (
                        <div
                          className="w-full h-full"
                          style={{
                            border:
                              ann.shapeType === 'highlight'
                                ? 'none'
                                : (ann.borderWidth === 0
                                ? 'none'
                                : `${(ann.borderWidth || 2) * zoomScale}px solid ${ann.color || '#2563eb'}`),
                            borderRadius: ann.shapeType === 'circle' ? '9999px' : '2px',
                            backgroundColor:
                              ann.shapeType === 'highlight'
                                ? ann.color || '#facc15'
                                : ann.backgroundColor || 'transparent',
                            opacity: ann.shapeType === 'highlight' ? 0.45 : (ann.opacity ?? 1),
                          }}
                        />
                      )}

                      {/* Prominent Multi-Handle Resize System (Corners + Edges) */}
                      {isSelected && (
                        <>
                          {/* Corner SE Handle */}
                          <div
                            data-resize-handle="se"
                            onMouseDown={(e) => handleStartResize(e, ann, 'se')}
                            className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md cursor-se-resize z-40 hover:scale-125 transition-transform"
                            title="Ubah ukuran sudut kanan bawah"
                          />

                          {/* Corner SW Handle */}
                          <div
                            data-resize-handle="sw"
                            onMouseDown={(e) => handleStartResize(e, ann, 'sw')}
                            className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md cursor-sw-resize z-40 hover:scale-125 transition-transform"
                            title="Ubah ukuran sudut kiri bawah"
                          />

                          {/* Corner NE Handle */}
                          <div
                            data-resize-handle="ne"
                            onMouseDown={(e) => handleStartResize(e, ann, 'ne')}
                            className="absolute -top-2 -right-2 w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md cursor-ne-resize z-40 hover:scale-125 transition-transform"
                            title="Ubah ukuran sudut kanan atas"
                          />

                          {/* Corner NW Handle */}
                          <div
                            data-resize-handle="nw"
                            onMouseDown={(e) => handleStartResize(e, ann, 'nw')}
                            className="absolute -top-2 -left-2 w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md cursor-nw-resize z-40 hover:scale-125 transition-transform"
                            title="Ubah ukuran sudut kiri atas"
                          />

                          {/* Edge E (Width) Handle */}
                          <div
                            data-resize-handle="e"
                            onMouseDown={(e) => handleStartResize(e, ann, 'e')}
                            className="absolute top-1/2 -right-2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm shadow-xs cursor-ew-resize z-40 hover:scale-125 transition-transform"
                            title="Tarik untuk melebarkan"
                          />

                          {/* Edge S (Height) Handle */}
                          <div
                            data-resize-handle="s"
                            onMouseDown={(e) => handleStartResize(e, ann, 's')}
                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm shadow-xs cursor-ns-resize z-40 hover:scale-125 transition-transform"
                            title="Tarik untuk meninggikan"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onApplySignature={handleApplySignature}
      />

      {/* Stamp Picker Modal */}
      <StampPickerModal
        isOpen={isStampModalOpen}
        onClose={() => setIsStampModalOpen(false)}
        onSelectStamp={handleApplyStamp}
      />

      {/* Edit Existing Text Modal */}
      <EditExistingTextModal
        isOpen={isEditTextModalOpen}
        onClose={() => {
          setIsEditTextModalOpen(false);
          setTargetTextItemForEdit(null);
        }}
        targetTextItem={targetTextItemForEdit}
        onApplyReplacement={handleApplyTextReplacement}
      />

      {/* Find and Replace Modal */}
      <FindAndReplaceModal
        isOpen={isFindReplaceModalOpen}
        onClose={() => setIsFindReplaceModalOpen(false)}
        extractedItems={extractedTexts}
        onBatchReplace={handleBatchFindReplace}
      />
    </div>
  );
}
