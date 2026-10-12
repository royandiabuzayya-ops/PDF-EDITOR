import React, { useState } from 'react';
import { Search, Replace, Check, X, ArrowRight } from 'lucide-react';
import { ExtractedTextItem } from '../services/pdfRenderer';

interface FindAndReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  extractedItems: ExtractedTextItem[];
  onBatchReplace: (
    matches: ExtractedTextItem[],
    replacementText: string,
    options: {
      color?: string;
      whiteoutColor?: string;
    }
  ) => void;
}

export function FindAndReplaceModal({
  isOpen,
  onClose,
  extractedItems,
  onBatchReplace,
}: FindAndReplaceModalProps) {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  if (!isOpen) return null;

  const trimmedSearch = searchText.trim().toLowerCase();
  const matchingItems = trimmedSearch
    ? extractedItems.filter((item) => item.text.toLowerCase().includes(trimmedSearch))
    : [];

  const handleExecuteReplace = () => {
    if (matchingItems.length === 0) return;
    onBatchReplace(matchingItems, replaceText, {
      color: '#0f172a',
      whiteoutColor: '#ffffff',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/50">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
              <Replace className="w-4 h-4 text-neutral-700" />
              Cari & Ganti Teks Otomatis (Find & Replace)
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Temukan kata/kalimat di halaman ini dan ganti sekaligus secara rapi
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Kata / Teks yang Ingin Dicari:
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Contoh: PT Kreasi Teknologi atau 2026..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
                autoFocus
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Ganti Menjadi:
            </label>
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Ketik teks baru..."
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
            />
          </div>

          {/* Results preview */}
          {trimmedSearch && (
            <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-800">
                  Hasil Pencarian:
                </span>
                <span className="text-[11px] font-mono text-neutral-500">
                  {matchingItems.length} kecocokan ditemukan
                </span>
              </div>

              {matchingItems.length > 0 ? (
                <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs">
                  {matchingItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 bg-white rounded border border-neutral-200 text-[11px] text-neutral-700 flex items-center justify-between gap-2"
                    >
                      <span className="truncate max-w-[200px] font-mono">{item.text}</span>
                      <ArrowRight className="w-3 h-3 text-neutral-400 shrink-0" />
                      <span className="truncate max-w-[160px] text-emerald-700 font-semibold">
                        {replaceText || '(dihapus)'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-neutral-400 italic text-center py-2">
                  Tidak ada teks yang cocok pada halaman ini.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExecuteReplace}
            disabled={matchingItems.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 rounded-lg transition-colors shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>Ganti Semua ({matchingItems.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
