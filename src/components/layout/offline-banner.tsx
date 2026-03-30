'use client'

import { WifiOff } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useOnline } from '@/hooks/use-online'

export function OfflineBanner() {
  const isOnline = useOnline()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-2 bg-primary/10 border-b border-primary/20 px-4 py-2 text-sm text-foreground">
            <WifiOff className="h-4 w-4 shrink-0 text-primary" />
            <span>You are offline. Changes will sync when connected.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
