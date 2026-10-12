import React from 'react';
import { AppMode } from '../types/pdf';
import { Upload, FilePlus, Sparkles } from 'lucide-react';

interface HeaderProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  onOpenPdfFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadSampleDocument: () => void;
  hasActiveDocument: boolean;
}

export function Header({
  currentMode,
  onSelectMode,
  onOpenPdfFile,
  onLoadSampleDocument,
  hasActiveDocument,
}: HeaderProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-neutral-200 shrink-0 z-30">
      {/* Zone 1: Single text element wordmark in display face */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onSelectMode('editor');
          }}
          className="text-lg font-bold tracking-tight text-neutral-900 whitespace-nowrap shrink-0 flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <span className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-xs font-mono font-bold">
            P
          </span>
          <span>PDFCraft Pro</span>
        </a>
      </div>

      {/* Zone 2: clean single-line text navigation links */}
      <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-neutral-600">
        <button
          type="button"
          onClick={() => onSelectMode('editor')}
          className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
            currentMode === 'editor'
              ? 'text-neutral-900 font-semibold border-b-2 border-neutral-900'
              : 'hover:text-neutral-900'
          }`}
        >
          Editor & Tanda Tangan
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('organize')}
          className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
            currentMode === 'organize'
              ? 'text-neutral-900 font-semibold border-b-2 border-neutral-900'
              : 'hover:text-neutral-900'
          }`}
        >
          Atur Halaman
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('compress')}
          className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
            currentMode === 'compress'
              ? 'text-neutral-900 font-semibold border-b-2 border-neutral-900'
              : 'hover:text-neutral-900'
          }`}
        >
          Kompres PDF
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('merge')}
          className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
            currentMode === 'merge'
              ? 'text-neutral-900 font-semibold border-b-2 border-neutral-900'
              : 'hover:text-neutral-900'
          }`}
        >
          Gabung PDF
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('split')}
          className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
            currentMode === 'split'
              ? 'text-neutral-900 font-semibold border-b-2 border-neutral-900'
              : 'hover:text-neutral-900'
          }`}
        >
          Bagi & Ekstrak
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('image-to-pdf')}
          className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
            currentMode === 'image-to-pdf'
              ? 'text-neutral-900 font-semibold border-b-2 border-neutral-900'
              : 'hover:text-neutral-900'
          }`}
        >
          Gambar ke PDF
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-2.5 shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={onOpenPdfFile}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 shadow-xs"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Buka Berkas PDF</span>
        </button>
      </div>
    </header>
  );
}
