'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles, Trash2, ChevronDown, ChevronUp, Coins } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { FormPanel } from '@/components/shared/form-panel'
import { ChatMessageBubble, TypingIndicator } from '@/components/ai/chat-message'
import { PromptChips } from '@/components/ai/prompt-chips'
import { ChatInput } from '@/components/ai/chat-input'
import { CreditBalance } from '@/components/credits/credit-balance'
import { useAIChat } from '@/hooks/use-ai-chat'
import { useCredits } from '@/hooks/use-credits'
import { useUiStore } from '@/stores/ui.store'
import { analytics } from '@/lib/analytics'
import { cn } from '@/lib/utils/cn'
import type { PromptChip } from '@/lib/ai/types'

interface CaseAIPanelProps {
  isOpen: boolean
  onClose: () => void
  caseId: string
  caseTitle: string
  hasHearings: boolean
  hasDocuments: boolean
}

export function CaseAIPanel({
  isOpen,
  onClose,
  caseId,
  caseTitle,
  hasHearings,
  hasDocuments,
}: CaseAIPanelProps) {
  const [showChips, setShowChips] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)

  const { data: creditsData } = useCredits()
  const openPurchaseModal = useUiStore((s) => s.openPurchaseModal)
  const balance = creditsData?.balance ?? 0

  const {
    messages,
    isLoading,
    isThinking,
    isStreaming,
    streamingContent,
    sendMessage,
    clearHistory,
    stopGeneration,
  } = useAIChat({
    caseId,
    onCreditsInsufficient: () => {
      openPurchaseModal()
    },
  })

  function handlePromptSelect(chip: PromptChip) {
    if (chip.requiresDocument && !hasDocuments) {
      toast.error('Upload a document to this case first')
      return
    }
    if (chip.requiresHearing && !hasHearings) {
      toast.error('Add a hearing to this case first')
      return
    }
    analytics.aiPromptChipUsed(chip.type, caseId)
    void sendMessage({
      message: chip.label,
      messageType: 'prompt_trigger',
      promptType: chip.type,
      promptLabel: chip.label,
    })
  }

  async function handleClearHistory() {
    if (!clearConfirm) {
      setClearConfirm(true)
      setTimeout(() => setClearConfirm(false), 4000)
      return
    }
    await clearHistory()
    setClearConfirm(false)
    analytics.aiHistoryCleared()
  }

  const scrollAnchorRef = useRef<HTMLDivElement>(null)

  const hasMessages = messages.length > 0
  const isActive = isThinking || isStreaming
  const chipsDisabled = isActive || isLoading
  const truncatedTitle = caseTitle.length > 30 ? caseTitle.slice(0, 30) + '...' : caseTitle

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, isThinking, isStreaming])

  return (
    <FormPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Lawket AI Assistant"
      subtitle={truncatedTitle}
      size="lg"
      isLoading={isStreaming}
      footer={
        <ChatInput
          onSend={(params) => {
            analytics.aiChatOpened(caseId)
            void sendMessage(params)
          }}
          isLoading={isLoading}
          creditBalance={balance}
          caseId={caseId}
          isThinking={isThinking}
          isStreaming={isStreaming}
          onStop={stopGeneration}
        />
      }
      headerExtra={
        <div className="flex items-center gap-2">
          <CreditBalance size="xs" onClick={openPurchaseModal} />
          <button
            type="button"
            title={clearConfirm ? 'Click again to confirm' : 'Clear conversation'}
            onClick={() => void handleClearHistory()}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
              clearConfirm
                ? 'bg-destructive/10 text-destructive'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {balance > 0 && balance < 5 && (
          <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
            <Coins className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />
            <span className="text-amber-700 dark:text-amber-400">
              Only {balance} credit{balance === 1 ? '' : 's'} left
            </span>
            <span className="text-muted-foreground"> &middot; </span>
            <button
              type="button"
              className="underline font-medium text-foreground"
              onClick={openPurchaseModal}
            >
              Get more
            </button>
          </div>
        )}

        {balance === 0 && (
          <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-3">
            <p className="text-sm font-medium text-destructive">No credits remaining</p>
            <p className="text-xs text-muted-foreground">
              Purchase credits to continue using AI.
            </p>
            <button
              type="button"
              onClick={openPurchaseModal}
              className="self-start rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 transition-opacity"
            >
              Get credits
            </button>
          </div>
        )}

        {!hasMessages && !isLoading && !isThinking && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="flex flex-col items-center gap-2 text-center">
              <Sparkles className="h-8 w-8 text-amber-500" />
              <p className="font-medium text-foreground">Lawket AI Assistant</p>
              <p className="text-sm text-muted-foreground">
                Ask anything about this case or use a quick prompt below.
              </p>
            </div>
            <PromptChips
              onSelect={handlePromptSelect}
              creditBalance={balance}
              hasHearing={hasHearings}
              hasDocuments={hasDocuments}
              isLoading={chipsDisabled}
            />
          </div>
        )}

        {(hasMessages || isLoading || isThinking) && (
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <ChatMessageBubble key={msg.id} message={msg} />
            ))}

            <AnimatePresence>
              {isThinking && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="flex items-start"
                >
                  <div className="rounded-2xl rounded-bl-sm bg-muted">
                    <TypingIndicator />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isStreaming && (
              <ChatMessageBubble
                message={{
                  id: 'streaming',
                  conversationId: '',
                  role: 'assistant',
                  content: streamingContent,
                  type: 'text',
                  createdAt: new Date().toISOString(),
                }}
                isStreaming
                streamingContent={streamingContent}
              />
            )}

            <div ref={scrollAnchorRef} />
          </div>
        )}

        {hasMessages && (
          <div className="-mx-6 border-t border-border px-4 md:px-6 pt-3">
            <button
              type="button"
              onClick={() => setShowChips((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showChips ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Suggestions
            </button>
            {showChips && (
              <div className={cn('mt-2', chipsDisabled && 'pointer-events-none opacity-50')}>
                <PromptChips
                  onSelect={handlePromptSelect}
                  creditBalance={balance}
                  hasHearing={hasHearings}
                  hasDocuments={hasDocuments}
                  isLoading={chipsDisabled}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </FormPanel>
  )
}
