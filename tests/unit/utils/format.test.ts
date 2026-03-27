import { describe, it, expect } from 'vitest'
import { formatFileSize, isValidFileType, isValidFileSize } from '@/lib/utils/format'

describe('formatFileSize', () => {
  it('formats zero bytes', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('formats bytes correctly', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('formats kilobytes correctly', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('formats megabytes correctly', () => {
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB')
  })

  it('formats gigabytes correctly', () => {
    expect(formatFileSize(1.5 * 1024 * 1024 * 1024)).toBe('1.50 GB')
  })

  it('formats exactly 1 KB', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
  })

  it('formats exactly 1 MB', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
  })
})

describe('isValidFileType', () => {
  it('accepts PDF', () => {
    expect(isValidFileType('application/pdf')).toBe(true)
  })

  it('accepts JPEG', () => {
    expect(isValidFileType('image/jpeg')).toBe(true)
  })

  it('accepts PNG', () => {
    expect(isValidFileType('image/png')).toBe(true)
  })

  it('accepts WebP', () => {
    expect(isValidFileType('image/webp')).toBe(true)
  })

  it('accepts HEIC', () => {
    expect(isValidFileType('image/heic')).toBe(true)
  })

  it('rejects EXE files', () => {
    expect(isValidFileType('application/exe')).toBe(false)
  })

  it('rejects DOCX files', () => {
    expect(isValidFileType(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )).toBe(false)
  })

  it('rejects ZIP files', () => {
    expect(isValidFileType('application/zip')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidFileType('')).toBe(false)
  })
})

describe('isValidFileSize', () => {
  it('accepts files under 50MB', () => {
    expect(isValidFileSize(1024 * 1024)).toBe(true) // 1 MB
  })

  it('accepts files at exactly 50MB limit', () => {
    expect(isValidFileSize(52_428_800)).toBe(true)
  })

  it('rejects files over 50MB', () => {
    expect(isValidFileSize(52_428_801)).toBe(false)
  })

  it('accepts zero bytes', () => {
    expect(isValidFileSize(0)).toBe(true)
  })
})
