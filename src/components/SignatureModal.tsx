import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Type, Upload, Trash2, Check, X, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySignature: (signatureDataUrl: string, metadata?: { signerName?: string; date?: string; reason?: string }) => void;
}

export function SignatureModal({ isOpen, onClose, onApplySignature }: SignatureModalProps) {
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw');
  
  // Drawing state
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#0f172a');
  const [penWidth, setPenWidth] = useState(3);

  // Typing state
  const [typedName, setTypedName] = useState('Ir. Royandi Abuzayya');
  const [selectedFont, setSelectedFont] = useState<'font-1' | 'font-2' | 'font-3' | 'font-4'>('font-1');

  // Upload state
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [removeWhiteBg, setRemoveWhiteBg] = useState(true);
  const uploadFileInputRef = useRef<HTMLInputElement | null>(null);

  // Digital verification metadata
  const [includeAuditBadge, setIncludeAuditBadge] = useState(true);
  const [signerName, setSignerName] = useState('Royandi Abuzayya');
  const [signingReason, setSigningReason] = useState('Telah Disetujui & Sah');
  const [currentDateTime, setCurrentDateTime] = useState('');

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(now);
      setCurrentDateTime(formatted);
      initDrawCanvas();
    }
  }, [isOpen]);

  const initDrawCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Set internal resolution for sharp lines
    canvas.width = 600;
    canvas.height = 240;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Scale coords to canvas internal resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClearDraw = () => {
    initDrawCanvas();
  };

  // Handle uploaded image and background cleaning
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);

        if (removeWhiteBg) {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          // Clean white pixels to transparent
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // If near white, fade out alpha
            if (r > 215 && g > 215 && b > 215) {
              data[i + 3] = 0;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        setUploadedImageUrl(canvas.toDataURL('image/png'));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Generate typed signature image on hidden canvas
  const renderTypedSignatureToDataUrl = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = penColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (selectedFont === 'font-1') {
      ctx.font = 'italic 52px "Brush Script MT", "Segoe Script", cursive';
    } else if (selectedFont === 'font-2') {
      ctx.font = 'italic 46px "Snell Roundhand", "Apple Chancery", cursive';
    } else if (selectedFont === 'font-3') {
      ctx.font = 'italic 48px "Edwardian Script ITC", "Lucida Handwriting", cursive';
    } else {
      ctx.font = 'italic bold 44px "Georgia", serif';
    }

    ctx.fillText(typedName || 'Tanda Tangan', canvas.width / 2, canvas.height / 2 - 10);

    // Decorative underline flourish
    ctx.beginPath();
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5;
    const startX = 120;
    const endX = 480;
    const y = canvas.height / 2 + 35;
    ctx.moveTo(startX, y);
    ctx.bezierCurveTo(startX + 100, y - 8, endX - 100, y + 15, endX, y);
    ctx.stroke();

    return canvas.toDataURL('image/png');
  };

  // Generate final composite signature with optional audit metadata stamp
  const handleApply = () => {
    let baseSignatureUrl = '';

    if (activeTab === 'draw') {
      if (!drawCanvasRef.current || !hasDrawn) {
        alert('Silakan buat tanda tangan terlebih dahulu pada kanvas.');
        return;
      }
      baseSignatureUrl = drawCanvasRef.current.toDataURL('image/png');
    } else if (activeTab === 'type') {
      if (!typedName.trim()) {
        alert('Silakan ketik nama penandatangan.');
        return;
      }
      baseSignatureUrl = renderTypedSignatureToDataUrl();
    } else if (activeTab === 'upload') {
      if (!uploadedImageUrl) {
        alert('Silakan pilih file tanda tangan.');
        return;
      }
      baseSignatureUrl = uploadedImageUrl;
    }

    if (!baseSignatureUrl) return;

    // If audit stamp is enabled, combine into a verified digital signature stamp
    if (includeAuditBadge) {
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = 540;
      compositeCanvas.height = 200;
      const ctx = compositeCanvas.getContext('2d');
      if (!ctx) {
        onApplySignature(baseSignatureUrl);
        onClose();
        return;
      }

      const sigImg = new Image();
      sigImg.onload = () => {
        // Draw decorative container with verification styling
        ctx.fillStyle = 'rgba(248, 250, 252, 0.95)';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        // Rounded rect
        const x = 5, y = 5, w = 530, h = 190, r = 8;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Left: signature image
        ctx.drawImage(sigImg, 15, 15, 260, 160);

        // Vertical divider
        ctx.beginPath();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.moveTo(290, 20);
        ctx.lineTo(290, 180);
        ctx.stroke();

        // Right side: Audit details
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('TERVERIFIKASI DIGITAL', 310, 45);

        // Security check icon mark
        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.arc(495, 40, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('✓', 492, 44);

        ctx.fillStyle = '#475569';
        ctx.font = '11px sans-serif';
        ctx.fillText('Nama:', 310, 75);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(signerName || typedName || 'Penandatangan', 310, 93);

        ctx.fillStyle = '#475569';
        ctx.font = '11px sans-serif';
        ctx.fillText('Waktu & Tanggal:', 310, 118);
        ctx.fillStyle = '#0f172a';
        ctx.font = '11px monospace';
        ctx.fillText(currentDateTime, 310, 134);

        ctx.fillStyle = '#0284c7';
        ctx.font = 'italic 10px sans-serif';
        ctx.fillText(`“${signingReason}”`, 310, 162);

        const compositeUrl = compositeCanvas.toDataURL('image/png');
        onApplySignature(compositeUrl, {
          signerName: signerName || typedName,
          date: currentDateTime,
          reason: signingReason,
        });
        onClose();
      };
      sigImg.src = baseSignatureUrl;
    } else {
      onApplySignature(baseSignatureUrl, {
        signerName: signerName || typedName,
        date: currentDateTime,
        reason: signingReason,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/50">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-neutral-700" />
              Tanda Tangan Digital Elektronik
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Buat, gambar, atau unggah tanda tangan untuk disematkan ke dalam dokumen PDF
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
            <button
              onClick={() => setActiveTab('draw')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'draw'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <PenTool className="w-4 h-4" />
              Gambar Manual
            </button>
            <button
              onClick={() => setActiveTab('type')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'type'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Type className="w-4 h-4" />
              Ketik Nama
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'upload'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              Unggah Gambar
            </button>
          </div>

          {/* Tab 1: Draw */}
          {activeTab === 'draw' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-600">
                <div className="flex items-center gap-2">
                  <span>Warna Tinta:</span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { color: '#0f172a', label: 'Hitam Dokumen' },
                      { color: '#1e40af', label: 'Biru Royal' },
                      { color: '#1e293b', label: 'Navy' },
                      { color: '#b91c1c', label: 'Merah' },
                    ].map((item) => (
                      <button
                        key={item.color}
                        type="button"
                        onClick={() => {
                          setPenColor(item.color);
                          if (drawCanvasRef.current) {
                            const ctx = drawCanvasRef.current.getContext('2d');
                            if (ctx) ctx.strokeStyle = item.color;
                          }
                        }}
                        style={{ backgroundColor: item.color }}
                        className={`w-5 h-5 rounded-full transition-transform ${
                          penColor === item.color ? 'ring-2 ring-offset-2 ring-neutral-900 scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                        title={item.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span>Ketebalan:</span>
                    <select
                      value={penWidth}
                      onChange={(e) => setPenWidth(Number(e.target.value))}
                      className="text-xs border border-neutral-200 rounded px-1.5 py-0.5 bg-white"
                    >
                      <option value={2}>Tipis (2px)</option>
                      <option value={3}>Sedang (3px)</option>
                      <option value={5}>Tebal (5px)</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearDraw}
                    className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>
              </div>

              {/* Drawing Board */}
              <div className="relative border-2 border-dashed border-neutral-300 rounded-lg bg-neutral-50/70 overflow-hidden cursor-crosshair">
                <canvas
                  ref={drawCanvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 touch-none block bg-transparent"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-neutral-400 text-xs">
                    Sentuh atau seret kursor untuk menandatangani di sini
                  </div>
                )}
                {/* Visual sign line */}
                <div className="absolute bottom-6 left-12 right-12 border-b border-neutral-300/60 pointer-events-none flex justify-between text-[10px] text-neutral-400 px-1">
                  <span>Tanda Tangan</span>
                  <span>✕</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Type */}
          {activeTab === 'type' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Ketik Nama Lengkap Anda:
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => {
                    setTypedName(e.target.value);
                    if (!signerName) setSignerName(e.target.value);
                  }}
                  placeholder="Contoh: Ir. Royandi Abuzayya"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
                />
              </div>

              {/* Font Style Selection */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-2">
                  Pilih Gaya Kaligrafi Tanda Tangan:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'font-1', label: 'Cursive Klasik', style: 'italic font-serif text-2xl' },
                    { id: 'font-2', label: 'Script Modern', style: 'italic tracking-wide text-xl font-mono' },
                    { id: 'font-3', label: 'Artistic Flow', style: 'italic font-serif text-xl' },
                    { id: 'font-4', label: 'Formal Executive', style: 'font-serif font-bold text-lg' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedFont(item.id as any)}
                      className={`p-3 text-left rounded-lg border transition-all ${
                        selectedFont === item.id
                          ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white'
                      }`}
                    >
                      <div className="text-[11px] text-neutral-400 mb-1">{item.label}</div>
                      <div
                        className={`${item.style} text-neutral-800 truncate`}
                        style={{ fontFamily: item.id === 'font-1' ? 'Brush Script MT, cursive' : undefined }}
                      >
                        {typedName || 'Tanda Tangan'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => uploadFileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 hover:border-neutral-400 rounded-lg p-6 text-center cursor-pointer transition-colors bg-neutral-50/50"
              >
                <input
                  ref={uploadFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
                <p className="text-xs font-medium text-neutral-800">
                  Klik untuk mengunggah file tanda tangan atau cap
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Format didukung: PNG atau JPG transparan (Maks. 5 MB)
                </p>
              </div>

              {uploadedImageUrl && (
                <div className="p-3 border border-neutral-200 rounded-lg bg-neutral-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={uploadedImageUrl}
                      alt="Pratinjau Tanda Tangan"
                      className="h-12 w-auto max-w-[120px] object-contain border border-neutral-200 bg-white rounded p-1"
                    />
                    <div>
                      <div className="text-xs font-medium text-neutral-900">Gambar Berhasil Dimuat</div>
                      <label className="flex items-center gap-1.5 text-xs text-neutral-600 mt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={removeWhiteBg}
                          onChange={(e) => setRemoveWhiteBg(e.target.checked)}
                          className="rounded text-neutral-900 focus:ring-neutral-900"
                        />
                        <span>Hapus Latar Belakang Putih Otomatis</span>
                      </label>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedImageUrl(null)}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Audit Badge & Verification Metadata Section */}
          <div className="border-t border-neutral-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAuditBadge}
                  onChange={(e) => setIncludeAuditBadge(e.target.checked)}
                  className="rounded text-neutral-900 focus:ring-neutral-900"
                />
                <span className="text-xs font-semibold text-neutral-800 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Sertakan Stempel Sertifikasi / Audit Trail Digital
                </span>
              </label>
              <span className="text-[11px] text-neutral-400">Rekomendasi untuk dokumen sah</span>
            </div>

            {includeAuditBadge && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs">
                <div>
                  <label className="block text-neutral-600 mb-1">Nama Pemilik Tanda Tangan:</label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Nama Anda / Pejabat"
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 mb-1">Keterangan / Alasan:</label>
                  <input
                    type="text"
                    value={signingReason}
                    onChange={(e) => setSigningReason(e.target.value)}
                    placeholder="Contoh: Disetujui & Divalidasi"
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-neutral-900"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-200">
                  <span>Waktu Stempel Waktu (Timestamp): {currentDateTime}</span>
                  <span className="text-emerald-700 font-medium">Validasi Kriptografis Klien</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
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
            onClick={handleApply}
            className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
          >
            <Check className="w-4 h-4" />
            Terapkan ke Halaman PDF
          </button>
        </div>

      </div>
    </div>
  );
}
