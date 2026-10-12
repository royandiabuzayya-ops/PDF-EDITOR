import React, { useState, useEffect } from 'react';
import { Type, Check, X, Eraser, Sparkles } from 'lucide-react';
import { ExtractedTextItem } from '../services/pdfRenderer';

interface EditExistingTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTextItem: ExtractedTextItem | null;
  onApplyReplacement: (
    item: ExtractedTextItem,
    newText: string,
    options: {
      fontSize: number;
      fontFamily: 'Helvetica' | 'TimesRoman' | 'Courier';
      color: string;
      whiteoutColor: string;
      isDeleteOnly?: boolean;
    }
  ) => void;
}

export function EditExistingTextModal({
  isOpen,
  onClose,
  targetTextItem,
  onApplyReplacement,
}: EditExistingTextModalProps) {
  const [newText, setNewText] = useState('');
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState<'Helvetica' | 'TimesRoman' | 'Courier'>('Helvetica');
  const [textColor, setTextColor] = useState('#0f172a');
  const [whiteoutColor, setWhiteoutColor] = useState('#ffffff');

  useEffect(() => {
    if (targetTextItem) {
      setNewText(targetTextItem.text);
      setFontSize(Math.max(9, Math.round(targetTextItem.fontSize)));
      // Detect serif vs sans font
      if (targetTextItem.fontName?.toLowerCase().includes('times') || targetTextItem.fontName?.toLowerCase().includes('serif')) {
        setFontFamily('TimesRoman');
      } else if (targetTextItem.fontName?.toLowerCase().includes('courier') || targetTextItem.fontName?.toLowerCase().includes('mono')) {
        setFontFamily('Courier');
      } else {
        setFontFamily('Helvetica');
      }
    }
  }, [targetTextItem]);

  if (!isOpen || !targetTextItem) return null;

  const handleSave = () => {
    onApplyReplacement(targetTextItem, newText, {
      fontSize,
      fontFamily,
      color: textColor,
      whiteoutColor,
      isDeleteOnly: false,
    });
    onClose();
  };

  const handleDeleteText = () => {
    onApplyReplacement(targetTextItem, '', {
      fontSize,
      fontFamily,
      color: textColor,
      whiteoutColor,
      isDeleteOnly: true,
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
              <Type className="w-4 h-4 text-neutral-700" />
              Edit Teks Asli Dokumen PDF
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Ganti atau perbarui teks yang ada di dalam dokumen secara langsung
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
          {/* Original Text Reference */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Teks Asli di PDF:
            </label>
            <div className="p-2.5 bg-neutral-100 text-neutral-600 rounded-lg text-xs font-mono break-words border border-neutral-200 select-all">
              {targetTextItem.text}
            </div>
          </div>

          {/* Replacement Text Input */}
          <div>
            <label className="block text-xs font-medium text-neutral-800 mb-1.5">
              Teks Pengganti yang Diinginkan:
            </label>
            <textarea
              rows={3}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Ketik teks baru untuk menggantikan teks asli..."
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 bg-white leading-relaxed"
              autoFocus
            />
          </div>

          {/* Styling Options */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                Ukuran Font (pt):
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={6}
                  max={72}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-20 px-2 py-1 text-xs border border-neutral-300 rounded bg-white text-center font-mono"
                />
                <span className="text-[11px] text-neutral-400">pt</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                Gaya Huruf:
              </label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value as any)}
                className="w-full px-2 py-1 text-xs border border-neutral-300 rounded bg-white"
              >
                <option value="Helvetica">Helvetica (Sans-Serif)</option>
                <option value="TimesRoman">Times Roman (Serif)</option>
                <option value="Courier">Courier (Monospace)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                Warna Teks Baru:
              </label>
              <div className="flex items-center gap-1.5">
                {['#0f172a', '#1e40af', '#b91c1c', '#15803d'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTextColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      textColor === c ? 'ring-2 ring-neutral-900 ring-offset-1 scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                Warna Tip-Ex Penutup:
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWhiteoutColor('#ffffff')}
                  className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                    whiteoutColor === '#ffffff'
                      ? 'border-neutral-900 bg-neutral-100 font-semibold'
                      : 'border-neutral-200 text-neutral-600'
                  }`}
                >
                  Putih (#fff)
                </button>
                <button
                  type="button"
                  onClick={() => setWhiteoutColor('#f8fafc')}
                  className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                    whiteoutColor === '#f8fafc'
                      ? 'border-neutral-900 bg-neutral-100 font-semibold'
                      : 'border-neutral-200 text-neutral-600'
                  }`}
                >
                  Krem Tipis
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          <button
            type="button"
            onClick={handleDeleteText}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
            title="Tutup dan hapus teks ini tanpa menuliskan pengganti"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Hapus Teks Saja (Tip-Ex)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Perubahan Teks</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
