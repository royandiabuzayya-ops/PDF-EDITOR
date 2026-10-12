import React, { useState, useEffect } from 'react';
import { AppMode, ToastMessage } from './types/pdf';
import { Header } from './components/Header';
import { PdfEditorView } from './components/PdfEditorView';
import { PdfOrganizeView } from './components/PdfOrganizeView';
import { PdfCompressView } from './components/PdfCompressView';
import { PdfMergeView } from './components/PdfMergeView';
import { PdfSplitView } from './components/PdfSplitView';
import { ImageToPdfView } from './components/ImageToPdfView';
import { NotificationToast } from './components/NotificationToast';
import { createSampleDocument } from './services/pdfLibService';
import { FileText, Sparkles, Upload } from 'lucide-react';

export default function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>('editor');
  const [activePdfBuffer, setActivePdfBuffer] = useState<Uint8Array | null>(null);
  const [activeFileName, setActiveFileName] = useState<string>('Surat_Perjanjian_Kerjasama.pdf');
  const [isLoadingInitialDoc, setIsLoadingInitialDoc] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initialize with a realistic business document on startup
  useEffect(() => {
    let isCancelled = false;
    async function init() {
      try {
        const sampleBuf = await createSampleDocument();
        if (!isCancelled) {
          setActivePdfBuffer(sampleBuf);
          setActiveFileName('Surat_Perjanjian_Kerjasama_2026.pdf');
        }
      } catch (err) {
        console.error('Failed to init sample doc:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingInitialDoc(false);
        }
      }
    }
    init();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Handle opening custom PDF file from file input
  const handleOpenPdfFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Harap pilih file dengan format PDF', 'error');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      setActivePdfBuffer(buffer);
      setActiveFileName(file.name);
      setCurrentMode('editor');
      showToast(`Dokumen "${file.name}" berhasil dibuka`, 'success');
    } catch (err) {
      showToast('Gagal membaca berkas PDF', 'error');
    }
  };

  // Load sample document on demand
  const handleLoadSampleDocument = async () => {
    try {
      const buf = await createSampleDocument();
      setActivePdfBuffer(buf);
      setActiveFileName('Surat_Perjanjian_Kerjasama_2026.pdf');
      setCurrentMode('editor');
      showToast('Dokumen contoh berhasil dimuat ulang', 'success');
    } catch (e) {
      showToast('Gagal memuat dokumen contoh', 'error');
    }
  };

  // Switch to editor with given buffer and name (e.g. from Merge or Split)
  const handleOpenInEditor = (buffer: Uint8Array, name: string) => {
    setActivePdfBuffer(buffer);
    setActiveFileName(name);
    setCurrentMode('editor');
    showToast(`Dokumen "${name}" dibuka di editor untuk diedit/ditandatangani`, 'success');
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100 text-neutral-900 font-sans">
      
      {/* Universal Top Bar */}
      <Header
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        onOpenPdfFile={handleOpenPdfFile}
        onLoadSampleDocument={handleLoadSampleDocument}
        hasActiveDocument={!!activePdfBuffer}
      />

      {/* Main Workspace Body based on active mode */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentMode === 'editor' && (
          <>
            {isLoadingInitialDoc ? (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
                <div className="w-8 h-8 border-3 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mb-3" />
                <p className="text-xs">Mempersiapkan mesin pemroses PDF...</p>
              </div>
            ) : activePdfBuffer ? (
              <PdfEditorView
                pdfBuffer={activePdfBuffer}
                fileName={activeFileName}
                onBufferChange={setActivePdfBuffer}
                onShowToast={showToast}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-14 h-14 bg-white border border-neutral-200 rounded-2xl flex items-center justify-center text-neutral-500 mb-4 shadow-xs">
                  <FileText className="w-7 h-7" />
                </div>
                <h2 className="text-base font-semibold text-neutral-900">
                  Belum Ada Dokumen yang Dibuka
                </h2>
                <p className="text-xs text-neutral-500 max-w-sm mt-1 mb-5">
                  Buka dokumen PDF dari perangkat Anda atau muat dokumen contoh untuk mencoba fitur tanda tangan dan anotasi.
                </p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors shadow-xs">
                    <Upload className="w-4 h-4" />
                    Pilih File PDF
                    <input type="file" accept="application/pdf" onChange={handleOpenPdfFile} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadSampleDocument}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Muat Contoh Dokumen
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {currentMode === 'organize' && (
          <PdfOrganizeView
            initialBuffer={activePdfBuffer}
            initialFileName={activeFileName}
            onOpenInEditor={handleOpenInEditor}
            onShowToast={showToast}
          />
        )}

        {currentMode === 'compress' && (
          <PdfCompressView
            initialBuffer={activePdfBuffer}
            initialFileName={activeFileName}
            onOpenInEditor={handleOpenInEditor}
            onShowToast={showToast}
          />
        )}

        {currentMode === 'merge' && (
          <PdfMergeView
            onOpenInEditor={handleOpenInEditor}
            onShowToast={showToast}
          />
        )}

        {currentMode === 'split' && (
          <PdfSplitView
            initialBuffer={activePdfBuffer}
            initialFileName={activeFileName}
            onOpenInEditor={handleOpenInEditor}
            onShowToast={showToast}
          />
        )}

        {currentMode === 'image-to-pdf' && (
          <ImageToPdfView
            onOpenInEditor={handleOpenInEditor}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Global Notification Toast */}
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />

    </div>
  );
}
