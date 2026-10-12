import React from 'react';
import { ToastMessage } from '../types/pdf';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface NotificationToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function NotificationToast({ toasts, onDismiss }: NotificationToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        let icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
        let borderClass = 'border-emerald-200 bg-white text-neutral-900';

        if (toast.type === 'error') {
          icon = <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />;
          borderClass = 'border-rose-200 bg-white text-neutral-900';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
          borderClass = 'border-amber-200 bg-white text-neutral-900';
        } else if (toast.type === 'info') {
          icon = <Info className="w-4 h-4 text-blue-600 shrink-0" />;
          borderClass = 'border-neutral-200 bg-white text-neutral-900';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg border shadow-lg text-xs font-medium animate-in slide-in-from-bottom-2 duration-150 ${borderClass}`}
          >
            <div className="flex items-center gap-2.5">
              {icon}
              <span>{toast.text}</span>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
