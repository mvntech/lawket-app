'use client'

import * as React from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch by waiting for mount
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
        <Monitor className="h-5 w-5" />
      </Button>
    )
  }

  const ThemeIcon = theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun

  const cycleTheme = () => {
    const order = ['light', 'dark', 'system'] as const
    const current = (theme ?? 'system') as typeof order[number]
    setTheme(order[(order.indexOf(current) + 1) % order.length])
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 text-muted-foreground hover:text-foreground"
      onClick={cycleTheme}
      aria-label={`Theme: ${theme}. Click to cycle.`}
    >
      <ThemeIcon className="h-5 w-5" />
    </Button>
  )
}
