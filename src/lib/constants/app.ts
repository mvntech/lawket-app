export const APP_NAME = 'Lawket'
export const APP_TAGLINE = 'Every Case. Always with you.'

// pagination
export const DEFAULT_PAGE_SIZE = 20

// tanstack query (5 minutes before data is considered stale)
export const STALE_TIME_MS = 1000 * 60 * 5

// tanstack query (30 minutes before inactive data is evicted from cache)
// without this, navigating away causes a full refetch on return
export const GC_TIME_MS = 1000 * 60 * 30

// offline sync
export const MAX_SYNC_RETRIES = 5

// supabase storage (signed URL expiry)
export const SIGNED_URL_EXPIRY_SECONDS = 3600

// storage bucket name
export const STORAGE_BUCKET = 'lawket-documents'

// default timezone for lawyers in primary market
export const DEFAULT_TIMEZONE = 'Asia/Karachi'

// file upload limits
export const MAX_FILE_SIZE_BYTES = 52_428_800 // 50 MB
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const
