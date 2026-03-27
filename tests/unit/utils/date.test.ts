import { describe, it, expect } from 'vitest'
import { isToday, isTomorrow, isOverdue, formatDate, formatTime, daysUntil } from '@/lib/utils/date'

describe('isToday', () => {
  it('returns true for the current date', () => {
    expect(isToday(new Date())).toBe(true)
  })

  it('returns false for yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(isToday(yesterday)).toBe(false)
  })

  it('returns false for tomorrow', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(isToday(tomorrow)).toBe(false)
  })
})

describe('isTomorrow', () => {
  it('returns true for tomorrow', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(isTomorrow(tomorrow)).toBe(true)
  })

  it('returns false for today', () => {
    expect(isTomorrow(new Date())).toBe(false)
  })

  it('returns false for day after tomorrow', () => {
    const dayAfter = new Date()
    dayAfter.setDate(dayAfter.getDate() + 2)
    expect(isTomorrow(dayAfter)).toBe(false)
  })
})

describe('isOverdue', () => {
  it('returns true for yesterday (past date)', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(isOverdue(yesterday)).toBe(true)
  })

  it('returns false for today', () => {
    expect(isOverdue(new Date())).toBe(false)
  })

  it('returns false for tomorrow (future date)', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(isOverdue(tomorrow)).toBe(false)
  })

  it('returns true for a date far in the past', () => {
    const oldDate = new Date('2020-01-01')
    expect(isOverdue(oldDate)).toBe(true)
  })
})

describe('formatDate', () => {
  it('returns a formatted date string', () => {
    const result = formatDate('2026-03-19')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('formatTime', () => {
  it('formats 09:00 as 9:00 AM', () => {
    expect(formatTime('09:00')).toBe('9:00 AM')
  })

  it('formats 14:30 as 2:30 PM', () => {
    expect(formatTime('14:30')).toBe('2:30 PM')
  })

  it('formats 00:00 as 12:00 AM', () => {
    expect(formatTime('00:00')).toBe('12:00 AM')
  })

  it('formats 12:00 as 12:00 PM', () => {
    expect(formatTime('12:00')).toBe('12:00 PM')
  })

  it('returns empty string for null', () => {
    expect(formatTime(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatTime(undefined)).toBe('')
  })
})

describe('daysUntil', () => {
  it('returns 0 for today', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(daysUntil(today)).toBe(0)
  })

  it('returns 1 for tomorrow', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(daysUntil(tomorrow.toISOString().split('T')[0])).toBe(1)
  })

  it('returns 7 for a week from now', () => {
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    expect(daysUntil(nextWeek.toISOString().split('T')[0])).toBe(7)
  })

  it('returns negative for past dates', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(daysUntil(yesterday.toISOString().split('T')[0])).toBe(-1)
  })
})
