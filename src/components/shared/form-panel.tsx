'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { X } from 'lucide-react'
import { useMediaQuery } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils/cn'

// constants

const PANEL_SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-xl',
} as const

const PANEL_TRANSITION = {
  type: 'tween' as const,
  duration: 0.28,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
}

// types

export interface FormPanelProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  size?: keyof typeof PANEL_SIZES
  footer?: React.ReactNode
  isLoading?: boolean
  headerExtra?: React.ReactNode
}

interface PanelContentProps {
  title: string
  subtitle?: string
  onClose: () => void
  isLoading?: boolean
  footer?: React.ReactNode
  headerExtra?: React.ReactNode
  children: React.ReactNode
  isMobile?: boolean
}

// internal content

function PanelContent({
  title,
  subtitle,
  onClose,
  isLoading,
  footer,
  headerExtra,
  children,
  isMobile = false,
}: PanelContentProps) {
  return (
    <>
            <div className="flex items-start justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h2 className="text-base font-semibold text-foreground leading-tight">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="ml-4 flex items-center gap-1 shrink-0">
          {headerExtra}
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
        {children}
      </div>

            {footer && (
        <div
          className="shrink-0 px-6 py-4 border-t border-border"
          style={
            isMobile
              ? { paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }
              : undefined
          }
        >
          {footer}
        </div>
      )}
    </>
  )
}

// form panel

export function FormPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  footer,
  isLoading,
  headerExtra,
}: FormPanelProps) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const dragControls = useDragControls()

  // body scroll lock
  useEffect(() => {
    if (!isOpen) return
    try {
      document.body.style.overflow = 'hidden'
    } catch {
      // ignore
    }
    return () => {
      try {
        document.body.style.overflow = ''
      } catch {
        // ignore
      }
    }
  }, [isOpen])

  // escape key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose, isLoading])

  if (typeof window === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
                    <motion.div
            data-form-panel-backdrop=""
            className="fixed inset-0 bg-black/40 z-51"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={isLoading ? undefined : onClose}
          />

                    {!isMobile && (
            <motion.div
              className={cn(
                'fixed top-0 right-0 h-full bg-card border-l border-border',
                'flex flex-col z-51 w-full shadow-2xl',
                PANEL_SIZES[size],
              )}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={PANEL_TRANSITION}
            >
              <PanelContent
                title={title}
                subtitle={subtitle}
                onClose={onClose}
                isLoading={isLoading}
                footer={footer}
                headerExtra={headerExtra}
              >
                {children}
              </PanelContent>
            </motion.div>
          )}

                    {isMobile && (
            <motion.div
              data-form-panel-mobile=""
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-2xl flex flex-col z-51 max-h-[92vh] shadow-2xl"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={PANEL_TRANSITION}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.35 }}
              onDragEnd={(_, info) => {
                if (!isLoading && (info.offset.y > 80 || info.velocity.y > 500)) {
                  onClose()
                }
              }}
            >
              <div
                className="flex justify-center pt-2.5 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
                style={{ touchAction: 'none' }}
              >
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              <PanelContent
                title={title}
                subtitle={subtitle}
                onClose={onClose}
                isLoading={isLoading}
                footer={footer}
                headerExtra={headerExtra}
                isMobile
              >
                {children}
              </PanelContent>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
