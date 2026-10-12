import React, { useState } from 'react';
import {
  ImagePlus,
  ArrowUp,
  ArrowDown,
  Trash2,
  FileCheck2,
  Download,
  Edit3,
  FileText,
  Sparkles
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

interface ImageItem {
  id: string;
  name: string;
  dataUrl: string;
  size: number;
  width: number;
  height: number;
  type: string;
}

interface ImageToPdfViewProps {
  onOpenInEditor: (buffer: Uint8Array, name: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export function ImageToPdfView({ onOpenInEditor, onShowToast }: ImageToPdfViewProps) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<'A4' | 'fit'>('A4');
  const [pageOrientation, setPageOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultPdf, setResultPdf] = useState<{ buffer: Uint8Array; name: string } | null>(null);

  const handleUploadImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const newItem: ImageItem = {
            id: 'img_' + Date.now() + '_' + i,
            name: file.name,
            dataUrl,
            size: file.size,
            width: img.width,
            height: img.height,
            type: file.type,
          };
          setImages((prev) => [...prev, newItem]);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }

    onShowToast(`${files.length} gambar dimuat`, 'success');
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return;
    const copy = [...images];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    setImages(copy);
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    setResultPdf(null);
  };

  const handleGeneratePdf = async () => {
    if (images.length === 0) {
      onShowToast('Silakan pilih minimal 1 gambar', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();

      for (const item of images) {
        const isPng = item.type.includes('png');
        const base64 = item.dataUrl.split(',')[1];
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

        const embeddedImg = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

        // Standard A4 dimensions: 595.28 x 841.89 pt
        const isLandscape =
          pageOrientation === 'landscape' || (pageOrientation === 'auto' && item.width > item.height);

        const pageWidth = isLandscape ? 841.89 : 595.28;
        const pageHeight = isLandscape ? 595.28 : 841.89;

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Fit image inside page with margins
        const margin = 36; // 0.5 inch margin
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2;

        const imgScale = Math.min(maxWidth / embeddedImg.width, maxHeight / embeddedImg.height, 1);
        const drawWidth = embeddedImg.width * imgScale;
        const drawHeight = embeddedImg.height * imgScale;

        // Center on page
        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2;

        page.drawImage(embeddedImg, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const outputName = 'Dokumen_Foto_' + new Date().toISOString().slice(0, 10) + '.pdf';
      setResultPdf({ buffer: pdfBytes, name: outputName });
      onShowToast('Dokumen PDF dari gambar berhasil dibuat!', 'success');
    } catch (err) {
      console.error(err);
      onShowToast('Gagal mengubah gambar ke PDF', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-neutral-200 pb-5">
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-neutral-800" />
            Konversi Gambar ke PDF (Image to PDF)
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Ubah foto dokumen, nota, scan ijazah, atau sertifikat JPG/PNG menjadi satu berkas PDF siap kirim atau tanda tangan
          </p>
        </div>

        {/* Upload Card */}
        <div
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/png,image/jpeg,image/webp';
            input.onchange = (e) => handleUploadImages(e as any);
            input.click();
          }}
          className="border-2 border-dashed border-neutral-300 hover:border-neutral-900 bg-white rounded-xl p-8 text-center transition-colors cursor-pointer group"
        >
          <div className="w-12 h-12 bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white rounded-full flex items-center justify-center mx-auto mb-3 transition-colors text-neutral-600">
            <ImagePlus className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-neutral-900">
            Pilih Foto Dokumen atau Gambar Anda
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Mendukung PNG, JPG, JPEG, WebP. Bisa memilih banyak gambar sekaligus.
          </p>
        </div>

        {/* Images Grid */}
        {images.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 border border-neutral-200 rounded-xl">
              <span className="text-xs font-semibold text-neutral-900">
                {images.length} Gambar Dimuat
              </span>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-600">Orientasi:</span>
                  <select
                    value={pageOrientation}
                    onChange={(e) => setPageOrientation(e.target.value as any)}
                    className="border border-neutral-300 rounded px-2 py-1 bg-neutral-50"
                  >
                    <option value="auto">Otomatis Sesuai Foto</option>
                    <option value="portrait">Paksa Potret (Tegak)</option>
                    <option value="landscape">Paksa Lanskap (Mendatar)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {images.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-white border border-neutral-200 rounded-xl p-2.5 flex flex-col justify-between shadow-2xs group"
                >
                  <div className="aspect-[4/3] bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200 mb-2 relative">
                    <img src={item.dataUrl} alt={item.name} className="w-full h-full object-cover" />
                    <span className="absolute top-1.5 left-1.5 bg-neutral-900/80 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate max-w-[100px] text-neutral-700 font-medium">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-neutral-500 hover:text-neutral-900 disabled:opacity-20"
                        title="Geser Kiri"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(index, 'down')}
                        disabled={index === images.length - 1}
                        className="p-1 text-neutral-500 hover:text-neutral-900 disabled:opacity-20"
                        title="Geser Kanan"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(item.id)}
                        className="p-1 text-rose-500 hover:text-rose-700"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Convert CTA */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleGeneratePdf}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4" />
                <span>{isProcessing ? 'Mengonversi ke PDF...' : 'Konversi Jadi Dokumen PDF'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Success Result */}
        {resultPdf && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-emerald-950">
                  PDF dari Gambar Selesai Dibuat!
                </h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {resultPdf.name} ({images.length} Halaman)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([resultPdf.buffer as BlobPart], { type: 'application/pdf' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = resultPdf.name;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  onShowToast('PDF berhasil diunduh', 'success');
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                Unduh PDF
              </button>
              <button
                type="button"
                onClick={() => onOpenInEditor(resultPdf.buffer, resultPdf.name)}
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
