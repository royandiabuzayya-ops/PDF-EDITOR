import React, { useState } from 'react';
import {
  Minimize2,
  FileCheck,
  Download,
  Edit3,
  Upload,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight
} from 'lucide-react';
import { compressPdf, CompressionLevel, CompressProgress } from '../services/pdfCompressService';
import { createSampleDocument } from '../services/pdfLibService';

interface PdfCompressViewProps {
  initialBuffer: Uint8Array | null;
  initialFileName: string;
  onOpenInEditor: (buffer: Uint8Array, name: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export function PdfCompressView({
  initialBuffer,
  initialFileName,
  onOpenInEditor,
  onShowToast,
}: PdfCompressViewProps) {
  const [activeBuffer, setActiveBuffer] = useState<Uint8Array | null>(initialBuffer);
  const [activeFileName, setActiveFileName] = useState<string>(initialFileName || 'Dokumen.pdf');
  const [level, setLevel] = useState<CompressionLevel>('recommended');
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [progress, setProgress] = useState<CompressProgress | null>(null);

  const [result, setResult] = useState<{
    buffer: Uint8Array;
    name: string;
    originalSize: number;
    compressedSize: number;
    reductionPercent: number;
  } | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
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
      setResult(null);
      onShowToast(`Dokumen "${file.name}" dimuat (${formatBytes(file.size)})`, 'success');
    } catch (err) {
      onShowToast('Gagal membaca berkas PDF', 'error');
    }
  };

  // Load sample demo document
  const handleLoadSample = async () => {
    const buf = await createSampleDocument();
    setActiveBuffer(buf);
    setActiveFileName('Dokumen_Sampel_Perjanjian.pdf');
    setResult(null);
    onShowToast('Dokumen contoh berhasil dimuat untuk dikompresi', 'success');
  };

  // Execute Compression
  const handleStartCompress = async () => {
    if (!activeBuffer) return;

    setIsCompressing(true);
    setProgress({ currentPage: 1, totalPages: 1, percent: 10 });

    try {
      const res = await compressPdf(activeBuffer, level, (p) => {
        setProgress(p);
      });

      const outName = `${activeFileName.replace(/\.pdf$/i, '')}_dikompres.pdf`;
      setResult({
        buffer: res.compressedBuffer,
        name: outName,
        originalSize: res.originalSize,
        compressedSize: res.compressedSize,
        reductionPercent: res.reductionPercent,
      });

      onShowToast(`Dokumen berhasil dikompresi! Hemat ${res.reductionPercent}% ukuran berkas.`, 'success');
    } catch (err) {
      console.error(err);
      onShowToast('Gagal mengompresi PDF: ' + (err as Error).message, 'error');
    } finally {
      setIsCompressing(false);
      setProgress(null);
    }
  };

  // Download compressed PDF
  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.buffer as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast('Dokumen PDF berhasil diunduh', 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
              <Minimize2 className="w-5 h-5 text-neutral-800" />
              Kompres & Perkecil Ukuran PDF (Compress PDF)
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Perkecil ukuran berkas PDF secara instan dan efisien agar mudah dikirim via email atau WhatsApp tanpa kehilangan keterbacaan teks
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer shadow-2xs">
              <Upload className="w-3.5 h-3.5 text-neutral-500" />
              Pilih PDF Lain
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
              <Minimize2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Belum Ada Dokumen yang Dipilih</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Unggah dokumen PDF yang ingin Anda perkecil ukurannya atau coba dengan dokumen sampel.
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
            
            {/* Document summary strip */}
            <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-100 border border-neutral-200 rounded-lg flex items-center justify-center text-neutral-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-900 truncate max-w-sm md:max-w-md">
                    {activeFileName}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    Ukuran Asli: <strong className="text-neutral-800 font-mono">{formatBytes(activeBuffer.byteLength)}</strong>
                  </div>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 justify-end">
                  <Zap className="w-3.5 h-3.5" />
                  100% Kompresi Lokal di Peramban
                </span>
                <span className="text-[11px] text-neutral-400">Aman & Tanpa batas unggah</span>
              </div>
            </div>

            {/* Compression Level Selector Cards */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider">
                Pilih Tingkat Kompresi:
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Level 1: Extreme */}
                <div
                  onClick={() => setLevel('extreme')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    level === 'extreme'
                      ? 'border-neutral-900 bg-neutral-50 ring-2 ring-neutral-900/10 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-neutral-900">Kompresi Kuat</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-semibold">
                        ~70-80% Lebih Kecil
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Ukuran berkas terkecil, cocok untuk batas lampiran email ketat (&lt;2 MB) atau WhatsApp.
                    </p>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-3 pt-2 border-t border-neutral-100">
                    Resolusi gambar disesuaikan secara efisien
                  </div>
                </div>

                {/* Level 2: Recommended */}
                <div
                  onClick={() => setLevel('recommended')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between relative ${
                    level === 'recommended'
                      ? 'border-neutral-900 bg-neutral-50 ring-2 ring-neutral-900/10 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <span className="absolute -top-2.5 right-3 bg-neutral-900 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-xs">
                    Rekomendasi
                  </span>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-neutral-900">Kompresi Sedang</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">
                        ~40-60% Lebih Kecil
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Keseimbangan sempurna antara kejernihan teks/grafis dan penghematan ukuran berkas.
                    </p>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-3 pt-2 border-t border-neutral-100">
                    Pilihan terbaik untuk sebagian besar dokumen
                  </div>
                </div>

                {/* Level 3: Light */}
                <div
                  onClick={() => setLevel('light')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    level === 'light'
                      ? 'border-neutral-900 bg-neutral-50 ring-2 ring-neutral-900/10 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-neutral-900">Kompresi Ringan</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">
                        ~20-30% Lebih Kecil
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Prioritas kualitas visual maksimal dengan sedikit pemadatan aliran data PDF.
                    </p>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-3 pt-2 border-t border-neutral-100">
                    Cocok untuk dokumen portofolio & cetak
                  </div>
                </div>
              </div>
            </div>

            {/* Action Compress Button & Progress Bar */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-neutral-900">
                    Mulai Proses Kompresi
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    Proses berjalan cepat dan seluruh lembaran halaman dioptimalkan
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStartCompress}
                  disabled={isCompressing}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>{isCompressing ? 'Sedang Mengompresi...' : 'Kompres PDF Sekarang'}</span>
                </button>
              </div>

              {/* Progress bar */}
              {isCompressing && progress && (
                <div className="pt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-neutral-600 font-mono">
                    <span>Memproses halaman {progress.currentPage} dari {progress.totalPages}...</span>
                    <span>{progress.percent}%</span>
                  </div>
                  <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-neutral-900 h-full transition-all duration-200"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Compression Results Dashboard */}
            {result && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-emerald-950">
                        Kompresi PDF Berhasil Selesai!
                      </h3>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Ukuran dokumen berhasil dikurangi secara signifikan
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold font-mono px-3 py-1 bg-emerald-600 text-white rounded-full">
                    Hemat {result.reductionPercent}%
                  </span>
                </div>

                {/* Metrics Comparison Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-white/80 rounded-lg border border-emerald-200 text-center">
                  <div>
                    <div className="text-[11px] text-neutral-500 uppercase tracking-wider">Ukuran Awal</div>
                    <div className="text-sm font-bold text-neutral-800 font-mono mt-0.5">
                      {formatBytes(result.originalSize)}
                    </div>
                  </div>

                  <div className="flex items-center justify-center text-neutral-400">
                    <ArrowRight className="w-4 h-4 hidden sm:block" />
                    <span className="sm:hidden text-xs">menjadi</span>
                  </div>

                  <div>
                    <div className="text-[11px] text-emerald-700 uppercase tracking-wider font-semibold">Ukuran Baru</div>
                    <div className="text-sm font-bold text-emerald-800 font-mono mt-0.5">
                      {formatBytes(result.compressedSize)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh PDF Hasil Kompresi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenInEditor(result.buffer, result.name)}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-neutral-800 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-lg transition-colors shadow-2xs"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Buka di Editor & Tanda Tangani</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
