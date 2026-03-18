import type { LucideIcon } from 'lucide-react'
import { FileText, File, ImageIcon } from 'lucide-react'

// file size
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`
}

// file type helpers
export function getFileIcon(mimeType: string): LucideIcon {
  if (mimeType === 'application/pdf') return FileText
  if (mimeType.startsWith('image/')) return ImageIcon
  return File
}

// mime type helpers
export function getMimeTypeLabel(mimeType: string): string {
  switch (mimeType) {
    case 'application/pdf':
      return 'PDF'
    case 'image/jpeg':
      return 'JPEG'
    case 'image/png':
      return 'PNG'
    case 'image/webp':
      return 'WebP'
    case 'image/heic':
      return 'HEIC'
    default:
      return 'File'
  }
}

// validation
const ALLOWED_MIME_TYPES_SET = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
])

export function isValidFileType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES_SET.has(mimeType)
}

export function isValidFileSize(bytes: number): boolean {
  return bytes <= 52_428_800
}
