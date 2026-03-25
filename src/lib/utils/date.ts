function todayStr(): string {
  return new Date().toISOString().split('T')[0]!
}

function tomorrowStr(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().split('T')[0]!
}

// returns true if the given date is today (calendar day).
export function isToday(date: Date): boolean {
  return date.toISOString().split('T')[0] === todayStr()
}

// returns true if the given date is tomorrow (calendar day).
export function isTomorrow(date: Date): boolean {
  return date.toISOString().split('T')[0] === tomorrowStr()
}

// returns true if the given date is strictly before today (overdue).
export function isOverdue(date: Date): boolean {
  return date.toISOString().split('T')[0] < todayStr()
}

// format a date string (YYYY-MM-DD) into a human-readable string.
export function formatDate(dateStr: string, locale = 'en-PK'): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// format a time string (HH:MM) into 12-hour format.
export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return ''
  const [hourStr, minuteStr] = timeStr.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = minuteStr ?? '00'
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minute} ${period}`
}

// returns the number of days between today and a future date string.
export function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
