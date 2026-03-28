'use client'

import { useState, useCallback } from 'react'

// encapsulates the open/close boolean state that every modal, panel, sheet, and dialog needs.

export interface DisclosureState {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  set: (value: boolean) => void
}

export function useDisclosure(defaultOpen = false): DisclosureState {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])

  return { isOpen, open, close, toggle, set: setIsOpen }
}
