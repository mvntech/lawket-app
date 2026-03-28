'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils/cn'
import { analytics } from '@/lib/analytics/posthog'

type FontSize = 'sm' | 'md' | 'lg'

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; class: string }[] = [
  { value: 'sm', label: 'Small', class: 'text-xs' },
  { value: 'md', label: 'Medium', class: 'text-sm' },
  { value: 'lg', label: 'Large', class: 'text-base' },
]

function applyFontSize(size: FontSize) {
  const map: Record<FontSize, string> = { sm: '14px', md: '16px', lg: '18px' }
  document.documentElement.style.fontSize = map[size]
}

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()

  const [fontSize, setFontSize] = useState<FontSize>(() => {
    if (typeof window === 'undefined') return 'md'
    return (localStorage.getItem('fontSize') as FontSize) ?? 'md'
  })

  useEffect(() => {
    applyFontSize(fontSize)
    localStorage.setItem('fontSize', fontSize)
  }, [fontSize])

  function handleThemeChange(value: string) {
    setTheme(value)
    analytics.themeChanged(value)
  }

  function handleFontSizeChange(value: FontSize) {
    setFontSize(value)
    analytics.fontSizeChanged(value)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Theme</h2>
        <div className="flex gap-3">
          {THEME_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleThemeChange(value)}
              className={cn(
                'flex-1 rounded-md border-2 py-3 text-sm font-medium transition-colors',
                theme === value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-muted-foreground/50',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Text size</h2>
        <div className="flex gap-3">
          {FONT_SIZE_OPTIONS.map(({ value, label, class: cls }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleFontSizeChange(value)}
              className={cn(
                'flex-1 rounded-md border-2 py-3 font-medium transition-colors',
                cls,
                fontSize === value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-muted-foreground/50',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Text size adjusts the base font size across the app.
        </p>
      </div>
    </div>
  )
}
