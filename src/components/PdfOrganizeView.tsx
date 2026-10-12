import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  RotateCw,
  RotateCcw,
  Trash2,
  Copy,
  PlusCircle,
  ArrowLeft,
  ArrowRight,
  Download,
  Edit3,
  FileCheck2,
  Upload,
  Sparkles,
  FileText,
  Rotate3D
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PageOrganizeItem, reorderAndOrganizePages, createSampleDocument } from '../services/pdfLibService';
import { renderPageThumbnail } from '../services/pdfRenderer';

interface PdfOrganizeViewProps {
  initialBuffer: Uint8Array | null;
  initialFileName: string;
  onOpenInEditor: (buffer: Uint8Array, name: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

interface PageCardState extends PageOrganizeItem {
  thumbnailUrl: string;
  originalPageNumber: number; // 1-indexed
}

export function PdfOrganizeView({
  initialBuffer,
  initialFileName,
  onOpenInEditor,
  onShowToast,
}: PdfOrganizeViewProps) {
  const [activeBuffer, setActiveBuffer] = useState<Uint8Array | null>(initialBuffer);
  const [activeFileName, setActiveFileName] = useState<string>(initialFileName || 'Dokumen.pdf');
  const [pages, setPages] = useState<PageCardState[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [savedResult, setSavedResult] = useState<{ buffer: Uint8Array; name: string } | null>(null);

  // Drag and drop state for reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Load document pages and generate thumbnails
  useEffect(() => {
    if (!activeBuffer) return;

    let isCancelled = false;
    async function loadPages() {
      setIsLoading(true);
      try {
        const proxy = await pdfjsLib.getDocument({ data: activeBuffer!.slice(0) }).promise;
        if (isCancelled) return;

        const cards: PageCardState[] = [];
        for (let i = 1; i <= proxy.numPages; i++) {
          let thumb = '';
          try {
            thumb = await renderPageThumbnail(proxy, i, 160);
          } catch (e) {
            console.warn(e);
          }
          cards.push({
            id: 'page_' + i + '_' + Date.now(),
            originalPageIndex: i - 1,
            originalPageNumber: i,
            rotation: 0,
            isBlank: false,
            thumbnailUrl: thumb,
          });
        }

        if (!isCancelled) {
          setPages(cards);
          setSavedResult(null);
        }
      } catch (err) {
        console.error(err);
        onShowToast('Gagal memuat pratinjau halaman PDF', 'error');
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadPages();
    return () => {
      isCancelled = true;
    };
  }, [activeBuffer]);

  // Reorder page move
  const movePage = (index: number, direction: 'left' | 'right') => {
    const target = direction === 'left' ? index - 1 : index + 1;
    if (target < 0 || target >= pages.length) return;

    const copy = [...pages];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    setPages(copy);
    setSavedResult(null);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const copy = [...pages];
    const item = copy.splice(draggedIndex, 1)[0];
    copy.splice(targetIndex, 0, item);
    setPages(copy);
    setDraggedIndex(null);
    setSavedResult(null);
  };

  // Rotate single page
  const rotatePage = (index: number, delta: number) => {
    setPages((prev) =>
      prev.map((p, idx) => {
        if (idx !== index) return p;
        const newRot = (p.rotation + delta + 360) % 360;
        return { ...p, rotation: newRot };
      })
    );
    setSavedResult(null);
  };

  // Rotate all pages at once
  const rotateAllPages = (delta: number) => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotation: (p.rotation + delta + 360) % 360,
      }))
    );
    setSavedResult(null);
    onShowToast(`Semua halaman diputar ${delta > 0 ? '90° searah jarum jam' : '90° berlawanan arah'}`, 'info');
  };

  // Duplicate page
  const duplicatePage = (index: number) => {
    const target = pages[index];
    const clone: PageCardState = {
      ...target,
      id: 'clone_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    };
    const copy = [...pages];
    copy.splice(index + 1, 0, clone);
    setPages(copy);
    setSavedResult(null);
    onShowToast(`Halaman ${index + 1} berhasil digandakan`, 'success');
  };

  // Delete page
  const deletePage = (index: number) => {
    if (pages.length <= 1) {
      onShowToast('Dokumen harus memiliki setidaknya 1 halaman', 'warning');
      return;
    }
    const copy = pages.filter((_, idx) => idx !== index);
    setPages(copy);
    setSavedResult(null);
    onShowToast('Halaman berhasil dihapus', 'info');
  };

  // Insert blank page
  const insertBlankPage = (index?: number) => {
    const blank: PageCardState = {
      id: 'blank_' + Date.now(),
      originalPageIndex: -1,
      originalPageNumber: 0,
      rotation: 0,
      isBlank: true,
      thumbnailUrl: '',
    };
    const copy = [...pages];
    if (index !== undefined) {
      copy.splice(index + 1, 0, blank);
    } else {
      copy.push(blank);
    }
    setPages(copy);
    setSavedResult(null);
    onShowToast('Halaman kosong berhasil ditambahkan', 'success');
  };

  // Upload different PDF file
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buf = new Uint8Array(arrayBuffer);
      setActiveBuffer(buf);
      setActiveFileName(file.name);
      setSavedResult(null);
      onShowToast(`Dokumen "${file.name}" dimuat`, 'success');
    } catch (err) {
      onShowToast('Gagal membaca berkas PDF', 'error');
    }
  };

  // Load sample demo document
  const handleLoadSample = async () => {
    const buf = await createSampleDocument();
    setActiveBuffer(buf);
    setActiveFileName('Dokumen_Sampel_Perjanjian.pdf');
    setSavedResult(null);
    onShowToast('Dokumen contoh berhasil dimuat untuk diatur halamannya', 'success');
  };

  // Save new organized PDF
  const handleSaveOrganizedPdf = async () => {
    if (!activeBuffer || pages.length === 0) return;

    setIsProcessing(true);
    try {
      const organizedBuf = await reorderAndOrganizePages(activeBuffer, pages);
      const outName = `${activeFileName.replace(/\.pdf$/i, '')}_disusun.pdf`;
      setSavedResult({
        buffer: organizedBuf,
        name: outName,
      });
      onShowToast('Susunan halaman berhasil disimpan dan diperbarui!', 'success');
    } catch (err) {
      console.error(err);
      onShowToast('Gagal menyimpan susunan halaman: ' + (err as Error).message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download organized PDF
  const handleDownload = () => {
    if (!savedResult) return;
    const blob = new Blob([savedResult.buffer as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = savedResult.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast('Dokumen PDF berhasil diunduh', 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-neutral-800" />
              Atur Susunan Halaman PDF (Organize Pages)
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Geser untuk mengubah urutan halaman, putar orientasi (90°/180°), duplikasi, hapus, atau sisipkan halaman kosong dengan mudah
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer shadow-2xs">
              <Upload className="w-3.5 h-3.5 text-neutral-500" />
              Ganti Berkas PDF
              <input type="file" accept="application/pdf" onChange={handleUploadFile} className="hidden" />
            </label>
            {!activeBuffer && (
              <button
                type="button"
                onClick={handleLoadSample}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Gunakan Contoh PDF
              </button>
            )}
          </div>
        </div>

        {/* Global Page Action Toolbar */}
        {activeBuffer && (
          <div className="bg-white border border-neutral-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-neutral-900">
                Total {pages.length} Halaman
              </span>
              <span className="text-neutral-400">·</span>
              <span className="text-neutral-500">Tarik kartu halaman untuk mengubah urutan</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => rotateAllPages(90)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"
                title="Putar semua halaman 90° searah jarum jam"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Putar Semua +90°</span>
              </button>

              <button
                type="button"
                onClick={() => rotateAllPages(-90)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"
                title="Putar semua halaman 90° berlawanan arah jarum jam"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Putar Semua -90°</span>
              </button>

              <button
                type="button"
                onClick={() => insertBlankPage()}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"
                title="Tambah halaman putih kosong di akhir"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Tambah Halaman Kosong</span>
              </button>
            </div>
          </div>
        )}

        {/* Page Cards Grid */}
        {isLoading ? (
          <div className="p-16 text-center text-xs text-neutral-500 bg-white border border-neutral-200 rounded-xl">
            <div className="w-7 h-7 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mx-auto mb-2" />
            Memuat pratinjau seluruh halaman dokumen...
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pages.map((item, index) => {
              const isRotated = item.rotation !== 0;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  className={`bg-white border-2 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all cursor-move select-none relative group ${
                    draggedIndex === index ? 'opacity-40 border-neutral-400' : 'border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  {/* Top Order Badge & Drag Handle */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-900 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                      {index + 1}
                    </span>

                    <span className="text-[10px] text-neutral-400 font-mono">
                      {item.isBlank ? 'Kosong' : `Asal: Hal ${item.originalPageNumber}`}
                    </span>
                  </div>

                  {/* Thumbnail Container */}
                  <div className="aspect-[1/1.414] bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200 relative flex items-center justify-center mb-2.5">
                    {item.isBlank ? (
                      <div className="text-center text-neutral-400 p-2">
                        <FileText className="w-6 h-6 mx-auto mb-1 opacity-40" />
                        <span className="text-[10px]">Halaman Kosong</span>
                      </div>
                    ) : item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={`Hal ${index + 1}`}
                        style={{
                          transform: `rotate(${item.rotation}deg)`,
                          transition: 'transform 0.2s ease',
                        }}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <FileText className="w-8 h-8 text-neutral-300" />
                    )}

                    {/* Rotation indicator badge */}
                    {isRotated && (
                      <span className="absolute top-1 left-1 bg-blue-600 text-white text-[9px] px-1 rounded font-mono font-bold shadow-xs">
                        {item.rotation}°
                      </span>
                    )}
                  </div>

                  {/* Page Card Actions */}
                  <div className="space-y-1.5 pt-1 border-t border-neutral-100">
                    {/* Rotate & Duplicate */}
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => rotatePage(index, 90)}
                        className="p-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded"
                        title="Putar 90° searah jarum jam"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => rotatePage(index, -90)}
                        className="p-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded"
                        title="Putar 90° berlawanan jarum jam"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => duplicatePage(index)}
                        className="p-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded"
                        title="Gandakan halaman ini"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => deletePage(index)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                        title="Hapus halaman ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Move Left / Right Buttons */}
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => movePage(index, 'left')}
                        disabled={index === 0}
                        className="flex-1 flex items-center justify-center py-0.5 text-[10px] text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-20 rounded"
                        title="Geser posisi ke kiri"
                      >
                        <ArrowLeft className="w-3 h-3 mr-0.5" /> Geser
                      </button>
                      <button
                        type="button"
                        onClick={() => movePage(index, 'right')}
                        disabled={index === pages.length - 1}
                        className="flex-1 flex items-center justify-center py-0.5 text-[10px] text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-20 rounded"
                        title="Geser posisi ke kanan"
                      >
                        Geser <ArrowRight className="w-3 h-3 ml-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Save Bar */}
        {pages.length > 0 && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveOrganizedPdf}
              disabled={isProcessing}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>{isProcessing ? 'Menyimpan Susunan Halaman...' : 'Simpan Susunan Halaman'}</span>
            </button>
          </div>
        )}

        {/* Success Result */}
        {savedResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-emerald-950">
                  Susunan Halaman Berhasil Diperbarui!
                </h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {savedResult.name} ({pages.length} Halaman)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                Unduh PDF Baru
              </button>
              <button
                type="button"
                onClick={() => onOpenInEditor(savedResult.buffer, savedResult.name)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-800 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-lg transition-colors shadow-2xs"
              >
                <Edit3 className="w-4 h-4" />
                Buka di Editor & Tanda Tangani
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
