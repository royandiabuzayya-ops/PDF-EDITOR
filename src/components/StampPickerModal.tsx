import React from 'react';
import { Award, CheckCircle2, X } from 'lucide-react';

interface StampPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStamp: (stampDataUrl: string, title: string) => void;
}

export function StampPickerModal({ isOpen, onClose, onSelectStamp }: StampPickerModalProps) {
  if (!isOpen) return null;

  // Generate crisp SVG/Canvas stamp as PNG data URL
  const createStampDataUrl = (
    text: string,
    subtext: string,
    color: string,
    type: 'box' | 'badge' | 'seal'
  ): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (type === 'box') {
      // Rotate stamp slightly for realistic authentic ink look
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-0.06);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      // Outer thick double border
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      const x = 12, y = 14, w = 336, h = 112;
      ctx.strokeRect(x, y, w, h);

      // Inner thin border
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);

      // Main text
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 28px sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 8);

      // Subtext
      if (subtext) {
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(subtext, canvas.width / 2, canvas.height / 2 + 24);
      }
    } else if (type === 'seal') {
      // Meterai Elektronik / Official seal simulation
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

      // Corner decors
      ctx.fillStyle = color;
      ctx.font = 'bold 9px monospace';
      ctx.fillText('REPUBLIK INDONESIA', cx, 28);
      ctx.textAlign = 'center';
      
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(text, cx, 68);

      ctx.font = 'bold 10px monospace';
      ctx.fillText(subtext || 'TGL: ' + new Date().toLocaleDateString('id-ID'), cx, 102);
    }

    return canvas.toDataURL('image/png');
  };

  const stamps = [
    {
      id: 'approved',
      title: 'DISETUJUI',
      subtitle: 'VERIFIED & APPROVED',
      color: '#15803d',
      bgClass: 'border-emerald-700 text-emerald-800 bg-emerald-50/50',
      type: 'box' as const,
    },
    {
      id: 'paid',
      title: 'LUNAS / PAID',
      subtitle: 'PEMBAYARAN DITERIMA',
      color: '#1d4ed8',
      bgClass: 'border-blue-700 text-blue-800 bg-blue-50/50',
      type: 'box' as const,
    },
    {
      id: 'confidential',
      title: 'RAHASIA',
      subtitle: 'CONFIDENTIAL DOCUMENT',
      color: '#b91c1c',
      bgClass: 'border-rose-700 text-rose-800 bg-rose-50/50',
      type: 'box' as const,
    },
    {
      id: 'draft',
      title: 'DRAF / DRAFT',
      subtitle: 'BELUM FINAL',
      color: '#475569',
      bgClass: 'border-slate-600 text-slate-700 bg-slate-50/50',
      type: 'box' as const,
    },
    {
      id: 'certified',
      title: 'SALINAN SAH',
      subtitle: 'SESUAI DOKUMEN ASLI',
      color: '#0369a1',
      bgClass: 'border-sky-700 text-sky-800 bg-sky-50/50',
      type: 'box' as const,
    },
    {
      id: 'emeterai',
      title: 'METERAI ELEKTRONIK',
      subtitle: 'SEPULUH RIBU RUPIAH (10000)',
      color: '#854d0e',
      bgClass: 'border-amber-700 text-amber-800 bg-amber-50/50',
      type: 'seal' as const,
    },
    {
      id: 'urgent',
      title: 'PENTING / URGENT',
      subtitle: 'SEGERA DITINDAKLANJUTI',
      color: '#c2410c',
      bgClass: 'border-orange-700 text-orange-800 bg-orange-50/50',
      type: 'box' as const,
    },
    {
      id: 'rejected',
      title: 'DITOLAK / VOID',
      subtitle: 'TIDAK BERLAKU',
      color: '#991b1b',
      bgClass: 'border-red-800 text-red-900 bg-red-50/50',
      type: 'box' as const,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/50">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-neutral-700" />
              Pilih Stempel Dokumen
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Tambahkan cap resmi cepat untuk status dokumen, verifikasi, atau legalisasi
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stamps Grid */}
        <div className="p-6 grid grid-cols-2 gap-3.5 max-h-[65vh] overflow-y-auto">
          {stamps.map((stamp) => (
            <button
              key={stamp.id}
              onClick={() => {
                const url = createStampDataUrl(stamp.title, stamp.subtitle, stamp.color, stamp.type);
                onSelectStamp(url, stamp.title);
                onClose();
              }}
              className={`p-4 rounded-lg border-2 text-center transition-all hover:scale-[1.02] active:scale-[0.99] flex flex-col items-center justify-center min-h-[96px] ${stamp.bgClass}`}
            >
              <div className="font-bold text-sm tracking-wide">{stamp.title}</div>
              <div className="text-[10px] opacity-75 mt-0.5 uppercase tracking-wider">{stamp.subtitle}</div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-neutral-200 bg-neutral-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-white border border-neutral-300 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
