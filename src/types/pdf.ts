/**
 * Types for PDFCraft Pro
 */
import { AnnotationItem } from '../services/pdfLibService';

export type AppMode = 'editor' | 'organize' | 'compress' | 'merge' | 'split' | 'image-to-pdf';

export interface PDFDocumentState {
  file: File | null;
  name: string;
  buffer: Uint8Array | null;
  pageCount: number;
  currentPage: number;
  zoom: number; // e.g. 1.0 = 100%
  rotation: number;
}

export interface MergeItem {
  id: string;
  file: File;
  name: string;
  size: number;
  buffer: Uint8Array;
  pageCount: number;
  pageRangeStr: string; // e.g. "Semua" or "1-3, 5"
  thumbnailUrl?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  text: string;
}

export type { AnnotationItem };
