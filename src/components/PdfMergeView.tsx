import React, { useState } from 'react';
import {
  FilePlus,
  ArrowUp,
  ArrowDown,
  Trash2,
  FileCheck2,
  Download,
  Edit3,
  Layers,
  Sparkles,
  AlertCircle,
  FileText
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { MergeItem } from '../types/pdf';
import { mergePDFDocuments, createSampleDocument } from '../services/pdfLibService';
import { renderPageThumbnail } from '../services/pdfRenderer';

interface PdfMergeViewProps {
  onOpenInEditor: (buffer: Uint8Array, name: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export function PdfMergeView({ onOpenInEditor, onShowToast }: PdfMergeViewProps) {
  const [items, setItems] = useState<MergeItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergedResult, setMergedResult] = useState<{ buffer: Uint8Array; name: string } | null>(null);

  // Helper to format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Handle uploading multiple PDFs
  const handleFilesUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newItems: MergeItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        continue;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const pageCount = pdfDoc.getPageCount();

        // Generate thumbnail of first page
        let thumbnailUrl = '';
        try {
          const proxy = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
          thumbnailUrl = await renderPageThumbnail(proxy, 1, 100);
        } catch (thumbErr) {
          console.warn('Thumbnail generation skipped:', thumbErr);
        }

        newItems.push({
          id: 'merge_' + Date.now() + '_' + i,
          file,
          name: file.name,
          size: file.size,
          buffer,
          pageCount,
          pageRangeStr: 'Semua',
          thumbnailUrl,
        });
      } catch (err) {
        console.error('Error reading PDF:', err);
        onShowToast(`File ${file.name} gagal dibaca atau terenkripsi`, 'error');
      }
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
      onShowToast(`${newItems.length} dokumen PDF ditambahkan`, 'success');
      setMergedResult(null);
    }
  };

  // Add sample demo documents for instant testing
  const handleAddSampleFiles = async () => {
    try {
      const sampleBuf1 = await createSampleDocument();
      const proxy1 = await pdfjsLib.getDocument({ data: sampleBuf1.slice(0) }).promise;
      const thumb1 = await renderPageThumbnail(proxy1, 1, 100);

      // Create a secondary sample (invoice / berita acara)
      const doc2 = await PDFDocument.create();
      const p = doc2.addPage([595.28, 841.89]);
      p.drawText('BERITA ACARA SERAH TERIMA PEKERJAAN (BAST)', { x: 50, y: 780, size: 14 });
      p.drawText('Nomor: 042/BAST-IT/2026', { x: 50, y: 755, size: 10 });
      p.drawText('Lampiran Hasil Pengujian Sistem dan Verifikasi Kelayakan.', { x: 50, y: 720, size: 10 });
      const sampleBuf2 = await doc2.save();
      const proxy2 = await pdfjsLib.getDocument({ data: sampleBuf2.slice(0) }).promise;
      const thumb2 = await renderPageThumbnail(proxy2, 1, 100);

      const demo1: MergeItem = {
        id: 'sample_1',
        file: new File([sampleBuf1 as BlobPart], 'Surat_Perjanjian_Kerjasama.pdf', { type: 'application/pdf' }),
        name: 'Surat_Perjanjian_Kerjasama.pdf',
        size: sampleBuf1.byteLength,
        buffer: sampleBuf1,
        pageCount: 2,
        pageRangeStr: 'Semua',
        thumbnailUrl: thumb1,
      };

      const demo2: MergeItem = {
        id: 'sample_2',
        file: new File([sampleBuf2 as BlobPart], 'Berita_Acara_Serah_Terima.pdf', { type: 'application/pdf' }),
        name: 'Berita_Acara_Serah_Terima.pdf',
        size: sampleBuf2.byteLength,
        buffer: sampleBuf2,
        pageCount: 1,
        pageRangeStr: 'Semua',
        thumbnailUrl: thumb2,
      };

      setItems((prev) => [...prev, demo1, demo2]);
      onShowToast('2 dokumen contoh berhasil dimuat untuk penggabungan', 'success');
    } catch (e) {
      console.error(e);
    }
  };

  // Reorder items
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newArr = [...items];
    const temp = newArr[index];
    newArr[index] = newArr[targetIndex];
    newArr[targetIndex] = temp;
    setItems(newArr);
  };

  // Remove single item
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setMergedResult(null);
  };

  // Parse page range string (e.g. "Semua", "1-3, 5")
  const parsePageRange = (rangeStr: string, totalPages: number): number[] => {
    if (!rangeStr || rangeStr.toLowerCase().trim() === 'semua' || rangeStr.toLowerCase().trim() === 'all') {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: Set<number> = new Set();
    const parts = rangeStr.split(',');

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

    return Array.from(pages).sort((a, b) => a - b);
  };

  // Execute Merge
  const handleMerge = async () => {
    if (items.length < 2) {
      onShowToast('Silakan tambahkan minimal 2 file PDF untuk digabungkan', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const pdfConfigs = items.map((item) => {
        const parsedPages = parsePageRange(item.pageRangeStr, item.pageCount);
        return {
          name: item.name,
          buffer: item.buffer,
          pageRange: parsedPages,
        };
      });

      const mergedBuffer = await mergePDFDocuments(pdfConfigs);
      const outputName = 'Dokumen_Gabungan_' + new Date().toISOString().slice(0, 10) + '.pdf';
      setMergedResult({ buffer: mergedBuffer, name: outputName });
      onShowToast('Penggabungan PDF berhasil diselesaikan!', 'success');
    } catch (err) {
      console.error(err);
      onShowToast('Gagal menggabungkan PDF: ' + (err as Error).message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download merged file
  const handleDownloadMerged = () => {
    if (!mergedResult) return;
    const blob = new Blob([mergedResult.buffer as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mergedResult.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast('Dokumen hasil gabungan berhasil diunduh', 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-neutral-800" />
              Gabungkan Berkas PDF (Merge PDF)
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Satukan beberapa file PDF menjadi satu dokumen terpadu, atur urutan halaman, dan ekspor instan tanpa batas ukuran
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddSampleFiles}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Muat Contoh PDF
            </button>
          </div>
        </div>

        {/* Upload Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFilesUpload(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-neutral-300 hover:border-neutral-900 bg-white rounded-xl p-8 text-center transition-colors cursor-pointer group"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'application/pdf';
            input.onchange = (e) => handleFilesUpload((e.target as HTMLInputElement).files);
            input.click();
          }}
        >
          <div className="w-12 h-12 bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white rounded-full flex items-center justify-center mx-auto mb-3 transition-colors text-neutral-600">
            <FilePlus className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-neutral-900">
            Pilih atau Tarik Beberapa Dokumen PDF ke Sini
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Mendukung banyak file sekaligus. 100% diproses secara lokal dan aman di peramban Anda.
          </p>
        </div>

        {/* Document List */}
        {items.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-neutral-600">
              <span className="font-semibold text-neutral-900">
                Daftar Dokumen yang Akan Digabungkan ({items.length} Berkas)
              </span>
              <span>Gunakan tombol panah untuk mengatur urutan susunan</span>
            </div>

            <div className="space-y-2.5">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-white border border-neutral-200 rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-2xs hover:border-neutral-300 transition-all"
                >
                  {/* Left: Thumbnail & Order Badge */}
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-neutral-100 text-neutral-700 font-bold text-xs rounded-full flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>

                    <div className="w-10 h-14 bg-neutral-100 border border-neutral-200 rounded overflow-hidden shrink-0 flex items-center justify-center">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-medium text-neutral-900 truncate max-w-xs md:max-w-md">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {item.pageCount} Halaman · {formatFileSize(item.size)}
                      </div>
                    </div>
                  </div>

                  {/* Right: Page Range & Controls */}
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex flex-col items-end mr-2">
                      <span className="text-[10px] text-neutral-400">Rentang Halaman:</span>
                      <input
                        type="text"
                        value={item.pageRangeStr}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) =>
                            prev.map((it) => (it.id === item.id ? { ...it, pageRangeStr: val } : it))
                          );
                        }}
                        className="text-xs px-2 py-0.5 border border-neutral-300 rounded w-24 text-right bg-neutral-50 focus:bg-white focus:outline-hidden focus:border-neutral-900"
                        placeholder="Semua / 1-3"
                      />
                    </div>

                    {/* Up / Down Reorder */}
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-20 rounded"
                      title="Pindahkan ke Atas"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === items.length - 1}
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-20 rounded"
                      title="Pindahkan ke Bawah"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded ml-1"
                      title="Hapus dari antrean"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Merge Action Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleMerge}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
              >
                <Layers className="w-4 h-4" />
                <span>{isProcessing ? 'Menggabungkan Dokumen...' : 'Gabungkan PDF Sekarang'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Merged Success Panel */}
        {mergedResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-emerald-950">
                  Dokumen Berhasil Digabungkan!
                </h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {mergedResult.name} ({formatFileSize(mergedResult.buffer.byteLength)})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownloadMerged}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                Unduh PDF Gabungan
              </button>
              <button
                type="button"
                onClick={() => onOpenInEditor(mergedResult.buffer, mergedResult.name)}
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
