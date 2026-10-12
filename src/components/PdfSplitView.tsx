import React, { useState, useEffect } from 'react';
import {
  Scissors,
  CheckSquare,
  Square,
  Download,
  Trash2,
  FileCheck,
  Edit3,
  Layers,
  Upload,
  RefreshCw,
  Sparkles,
  FileText
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { extractPDFPages, splitPDFIntoSinglePages, createSampleDocument } from '../services/pdfLibService';
import { renderPageThumbnail } from '../services/pdfRenderer';

interface PdfSplitViewProps {
  initialBuffer: Uint8Array | null;
  initialFileName: string;
  onOpenInEditor: (buffer: Uint8Array, name: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export function PdfSplitView({
  initialBuffer,
  initialFileName,
  onOpenInEditor,
  onShowToast,
}: PdfSplitViewProps) {
  const [activeBuffer, setActiveBuffer] = useState<Uint8Array | null>(initialBuffer);
  const [activeFileName, setActiveFileName] = useState<string>(initialFileName || 'Dokumen.pdf');
  const [totalPages, setTotalPages] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [rangeInput, setRangeInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Extracted result
  const [extractedResult, setExtractedResult] = useState<{
    buffer: Uint8Array;
    name: string;
    pageCount: number;
  } | null>(null);

  // Single pages list (if split to individual files)
  const [individualFiles, setIndividualFiles] = useState<{ pageNumber: number; buffer: Uint8Array }[] | null>(null);

  // Load document whenever activeBuffer changes
  useEffect(() => {
    if (!activeBuffer) return;

    let isCancelled = false;
    async function loadDoc() {
      setIsLoading(true);
      try {
        const proxy = await pdfjsLib.getDocument({ data: activeBuffer!.slice(0) }).promise;
        if (isCancelled) return;

        setTotalPages(proxy.numPages);
        // Default select all or page 1
        setSelectedPages(new Set([1]));
        setRangeInput('1');

        const thumbList: string[] = [];
        for (let i = 1; i <= proxy.numPages; i++) {
          try {
            const thumbUrl = await renderPageThumbnail(proxy, i, 160);
            thumbList.push(thumbUrl);
          } catch (e) {
            thumbList.push('');
          }
        }

        if (!isCancelled) {
          setThumbnails(thumbList);
        }
      } catch (err) {
        console.error(err);
        onShowToast('Gagal memuat pratinjau halaman PDF', 'error');
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadDoc();
    return () => {
      isCancelled = true;
    };
  }, [activeBuffer]);

  // Toggle page selection
  const togglePage = (pageNum: number) => {
    const updated = new Set(selectedPages);
    if (updated.has(pageNum)) {
      updated.delete(pageNum);
    } else {
      updated.add(pageNum);
    }
    setSelectedPages(updated);
    setRangeInput(Array.from(updated).sort((a, b) => a - b).join(', '));
  };

  // Select all / None
  const handleSelectAll = () => {
    const all = new Set(Array.from({ length: totalPages }, (_, i) => i + 1));
    setSelectedPages(all);
    setRangeInput(`1-${totalPages}`);
  };

  const handleSelectNone = () => {
    setSelectedPages(new Set());
    setRangeInput('');
  };

  const handleSelectOdd = () => {
    const odd = new Set(Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p % 2 !== 0));
    setSelectedPages(odd);
    setRangeInput(Array.from(odd).join(', '));
  };

  const handleSelectEven = () => {
    const even = new Set(Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p % 2 === 0));
    setSelectedPages(even);
    setRangeInput(Array.from(even).join(', '));
  };

  // Parse text range input
  const applyRangeInput = (str: string) => {
    setRangeInput(str);
    const pages: Set<number> = new Set();
    const parts = str.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let p = Math.max(1, start); p <= Math.min(totalPages, end); p++) {
            pages.add(p);
          }
        }
      } else {
        const p = parseInt(trimmed, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          pages.add(p);
        }
      }
    }
    setSelectedPages(pages);
  };

  // Upload custom PDF file
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buf = new Uint8Array(arrayBuffer);
      setActiveBuffer(buf);
      setActiveFileName(file.name);
      setExtractedResult(null);
      setIndividualFiles(null);
      onShowToast(`Dokumen ${file.name} dimuat`, 'success');
    } catch (err) {
      onShowToast('Gagal membaca file PDF', 'error');
    }
  };

  // Load sample document if none exists
  const handleLoadSample = async () => {
    const buf = await createSampleDocument();
    setActiveBuffer(buf);
    setActiveFileName('Dokumen_Sampel_Perjanjian.pdf');
    setExtractedResult(null);
    setIndividualFiles(null);
    onShowToast('Dokumen contoh berhasil dimuat untuk dipecah', 'success');
  };

  // Operation 1: Extract Selected Pages into 1 new PDF
  const handleExtractSelected = async () => {
    if (!activeBuffer || selectedPages.size === 0) {
      onShowToast('Pilih setidaknya 1 halaman untuk diekstrak', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const pagesToExtract = Array.from(selectedPages).sort((a, b) => a - b);
      const extractedBuf = await extractPDFPages(activeBuffer, pagesToExtract);
      const outName = `${activeFileName.replace(/\.pdf$/i, '')}_Halaman_${pagesToExtract.join('-')}.pdf`;

      setExtractedResult({
        buffer: extractedBuf,
        name: outName,
        pageCount: pagesToExtract.length,
      });
      setIndividualFiles(null);
      onShowToast(`${pagesToExtract.length} halaman berhasil diekstrak!`, 'success');
    } catch (err) {
      console.error(err);
      onShowToast('Gagal mengekstrak halaman: ' + (err as Error).message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Operation 2: Split all pages into individual single-page files
  const handleSplitToSinglePages = async () => {
    if (!activeBuffer) return;

    setIsProcessing(true);
    try {
      const list = await splitPDFIntoSinglePages(activeBuffer);
      setIndividualFiles(list);
      setExtractedResult(null);
      onShowToast(`Dokumen berhasil dipecah menjadi ${list.length} berkas terpisah!`, 'success');
    } catch (err) {
      console.error(err);
      onShowToast('Gagal membagi dokumen', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Operation 3: Delete selected pages and keep the rest
  const handleDeleteSelected = async () => {
    if (!activeBuffer || selectedPages.size === 0) {
      onShowToast('Pilih halaman yang ingin dihapus', 'warning');
      return;
    }
    if (selectedPages.size >= totalPages) {
      onShowToast('Anda tidak dapat menghapus semua halaman', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const pagesToKeep = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
        (p) => !selectedPages.has(p)
      );
      const remainingBuf = await extractPDFPages(activeBuffer, pagesToKeep);
      const outName = `${activeFileName.replace(/\.pdf$/i, '')}_tanpa_${Array.from(selectedPages).join('-')}.pdf`;

      setExtractedResult({
        buffer: remainingBuf,
        name: outName,
        pageCount: pagesToKeep.length,
      });
      setIndividualFiles(null);
      onShowToast(`Halaman terpilih dihapus. Tersisa ${pagesToKeep.length} halaman.`, 'success');
    } catch (err) {
      console.error(err);
      onShowToast('Gagal memproses penghapusan halaman', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download single page
  const downloadBuffer = (buf: Uint8Array, name: string) => {
    const blob = new Blob([buf as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
              <Scissors className="w-5 h-5 text-neutral-800" />
              Bagi & Ekstrak Halaman PDF (Split PDF)
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Pilih halaman yang ingin diambil, pisahkan setiap halaman menjadi file mandiri, atau hapus halaman tertentu dengan cepat
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer shadow-2xs">
              <Upload className="w-3.5 h-3.5 text-neutral-500" />
              Unggah PDF Lain
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

        {/* If no buffer active */}
        {!activeBuffer && (
          <div className="bg-white border-2 border-dashed border-neutral-300 rounded-xl p-12 text-center space-y-4">
            <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-500">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Belum Ada Dokumen yang Dipilih</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Unggah dokumen PDF dari komputer Anda atau gunakan dokumen contoh kami untuk langsung mencoba fitur split.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <label className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors">
                Pilih Berkas PDF
                <input type="file" accept="application/pdf" onChange={handleUploadFile} className="hidden" />
              </label>
              <button
                type="button"
                onClick={handleLoadSample}
                className="px-4 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
              >
                Gunakan Contoh Dokumen
              </button>
            </div>
          </div>
        )}

        {/* If buffer is loaded */}
        {activeBuffer && (
          <div className="space-y-6">
            
            {/* Control Bar: Selection Filters & Range Input */}
            <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-neutral-800 mr-1">
                  Pilih Cepat:
                </span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"
                >
                  Semua ({totalPages})
                </button>
                <button
                  type="button"
                  onClick={handleSelectNone}
                  className="px-2.5 py-1 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"
                >
                  Batal Semua
                </button>
                <button
                  type="button"
                  onClick={handleSelectOdd}
                  className="px-2.5 py-1 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"
                >
                  Halaman Ganjil
                </button>
                <button
                  type="button"
                  onClick={handleSelectEven}
                  className="px-2.5 py-1 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"
                >
                  Halaman Genap
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-neutral-600 whitespace-nowrap">
                  Ketik Rentang:
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => applyRangeInput(e.target.value)}
                  placeholder="Contoh: 1, 3-5"
                  className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg w-36 focus:outline-hidden focus:border-neutral-900 bg-neutral-50 focus:bg-white"
                />
              </div>
            </div>

            {/* Visual Page Thumbnails Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-600">
                <span>
                  Klik halaman untuk memilih atau membatalkan ({selectedPages.size} dari {totalPages} halaman dipilih)
                </span>
                <span className="text-neutral-500 font-mono text-[11px] truncate max-w-xs">
                  {activeFileName}
                </span>
              </div>

              {isLoading ? (
                <div className="p-12 text-center text-xs text-neutral-500">
                  <div className="w-6 h-6 border-2 border-neutral-400 border-t-neutral-900 rounded-full animate-spin mx-auto mb-2" />
                  Merender pratinjau seluruh halaman...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    const isSelected = selectedPages.has(pageNum);
                    const thumb = thumbnails[pageNum - 1];

                    return (
                      <div
                        key={pageNum}
                        onClick={() => togglePage(pageNum)}
                        className={`group relative rounded-xl border-2 p-2 cursor-pointer transition-all bg-white flex flex-col justify-between ${
                          isSelected
                            ? 'border-neutral-900 ring-2 ring-neutral-900/10 shadow-sm'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        {/* Checkbox indicator */}
                        <div className="absolute top-3.5 right-3.5 z-10">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-neutral-900 fill-white" />
                          ) : (
                            <Square className="w-5 h-5 text-neutral-300 group-hover:text-neutral-400" />
                          )}
                        </div>

                        {/* Page preview */}
                        <div className="aspect-[1/1.414] bg-neutral-100 rounded-md overflow-hidden flex items-center justify-center border border-neutral-200 relative mb-2">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={`Halaman ${pageNum}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileText className="w-8 h-8 text-neutral-400" />
                          )}
                        </div>

                        {/* Bottom label */}
                        <div className="flex items-center justify-between text-xs px-1">
                          <span className={`font-semibold ${isSelected ? 'text-neutral-900' : 'text-neutral-600'}`}>
                            Halaman {pageNum}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] text-emerald-700 font-medium">Terpilih</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Buttons Group */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
              <div className="text-xs text-neutral-600">
                Status:{' '}
                <strong className="text-neutral-900 font-semibold">{selectedPages.size} halaman</strong>{' '}
                siap diproses
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Action 1: Extract Selected */}
                <button
                  type="button"
                  onClick={handleExtractSelected}
                  disabled={isProcessing || selectedPages.size === 0}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 rounded-lg transition-colors shadow-xs"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Ekstrak Halaman Terpilih</span>
                </button>

                {/* Action 2: Split to individual single pages */}
                <button
                  type="button"
                  onClick={handleSplitToSinglePages}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 rounded-lg transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Pisahkan Tiap Halaman</span>
                </button>

                {/* Action 3: Delete selected */}
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={isProcessing || selectedPages.size === 0}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-40 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Halaman Terpilih</span>
                </button>
              </div>
            </div>

            {/* Extracted Success Result */}
            {extractedResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-950">
                      Hasil Ekstraksi Siap!
                    </h3>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      {extractedResult.name} ({extractedResult.pageCount} Halaman)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => downloadBuffer(extractedResult.buffer, extractedResult.name)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    Unduh Berkas Ekstrak
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenInEditor(extractedResult.buffer, extractedResult.name)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-800 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-lg transition-colors shadow-2xs"
                  >
                    <Edit3 className="w-4 h-4" />
                    Buka & Edit di Editor
                  </button>
                </div>
              </div>
            )}

            {/* Individual Files List Result */}
            {individualFiles && individualFiles.length > 0 && (
              <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Dokumen Berhasil Dipecah Menjadi {individualFiles.length} Berkas
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      individualFiles.forEach((f) =>
                        downloadBuffer(f.buffer, `${activeFileName.replace(/\.pdf$/i, '')}_Halaman_${f.pageNumber}.pdf`)
                      );
                      onShowToast('Mengunduh semua berkas...', 'info');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh Semua Halaman Sekaligus
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {individualFiles.map((file) => (
                    <div
                      key={file.pageNumber}
                      className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-between"
                    >
                      <div className="text-xs font-medium text-neutral-800">
                        Halaman {file.pageNumber}.pdf
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          downloadBuffer(file.buffer, `${activeFileName.replace(/\.pdf$/i, '')}_Halaman_${file.pageNumber}.pdf`)
                        }
                        className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-white rounded"
                        title="Unduh Halaman Ini"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
