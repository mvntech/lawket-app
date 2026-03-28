'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles,
  Trash2,
  ChevronDown,
  ChevronUp,
  Coins,
  Briefcase,
  ChevronsUpDown,
  Check,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatMessageBubble, TypingIndicator } from '@/components/ai/chat-message'
import { PromptChips } from '@/components/ai/prompt-chips'
import { ChatInput } from '@/components/ai/chat-input'
import { CreditBalance } from '@/components/credits/credit-balance'
import { useAIChat, type SendParams } from '@/hooks/use-ai-chat'
import { useCredits } from '@/hooks/use-credits'
import { useCases } from '@/hooks/use-cases'
import { useUiStore } from '@/stores/ui.store'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils/cn'
import type { ChatMessage } from '@/lib/ai/types'

const GENERAL_CASE_ID = 'general'

function CaseSelector({
  selectedCaseId,
  onSelect,
}: {
  selectedCaseId: string
  onSelect: (id: string, title: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { data: cases = [] } = useCases({ status: 'active' })

  const filtered = cases.filter((c) =>
    `${c.title} ${c.case_number} ${c.client_name}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )

  const selectedCase = cases.find((c) => c.id === selectedCaseId)
  const label = selectedCase
    ? selectedCase.title
    : 'General - No case selected'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className="h-8 max-w-[240px] justify-between gap-2 text-xs font-normal truncate"
        >
          <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-left truncate">{label}</span>
          <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b">
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search cases…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          <button
            type="button"
            onClick={() => { onSelect(GENERAL_CASE_ID, null); setOpen(false); setSearch('') }}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors',
              selectedCaseId === GENERAL_CASE_ID && 'text-primary',
            )}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="flex-1 text-left">General - No case selected</span>
            {selectedCaseId === GENERAL_CASE_ID && (
              <Check className="h-3.5 w-3.5 shrink-0" />
            )}
          </button>

          {filtered.length > 0 && (
            <div className="px-3 py-1">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
                Cases
              </p>
            </div>
          )}

          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onSelect(c.id, c.title); setOpen(false); setSearch('') }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors',
                selectedCaseId === c.id && 'text-primary',
              )}
            >
              <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0 text-left">
                <p className="truncate">{c.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {c.case_number} · {c.client_name}
                </p>
              </div>
              {selectedCaseId === c.id && (
                <Check className="h-3.5 w-3.5 shrink-0" />
              )}
            </button>
          ))}

          {filtered.length === 0 && search && (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">
              No cases found.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function AIChatView({
  caseId,
  hasHearings,
  hasDocuments,
  messages,
  isLoading,
  isThinking,
  isStreaming,
  streamingContent,
  sendMessage,
  stopGeneration,
  balance,
  openPurchaseModal,
}: {
  caseId: string
  hasHearings: boolean
  hasDocuments: boolean
  messages: ChatMessage[]
  isLoading: boolean
  isThinking: boolean
  isStreaming: boolean
  streamingContent: string
  sendMessage: (params: SendParams) => Promise<void>
  stopGeneration: () => void
  balance: number
  openPurchaseModal: () => void
}) {
  const [showChips, setShowChips] = useState(false)

  useEffect(() => {
    setShowChips(false)
  }, [caseId])

  const hasMessages = messages.length > 0
  const isActive = isThinking || isStreaming
  const chipsDisabled = isActive || isLoading

  return (
    // Root has NO horizontal padding — each section handles its own px so the
    // message scroll container spans full-width and its scrollbar sits at the edge.
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">

      {/* ── credit alerts ── */}
      {balance > 0 && balance < 5 && (
        <div className="shrink-0 px-4 md:px-6 pt-3 pb-1">
          <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
            <Coins className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />
            <span className="text-amber-700 dark:text-amber-400">
              Only {balance} credit{balance === 1 ? '' : 's'} left
            </span>
            <span className="text-muted-foreground"> &middot; </span>
            <button type="button" className="underline font-medium text-foreground" onClick={openPurchaseModal}>
              Get more
            </button>
          </div>
        </div>
      )}

      {balance === 0 && (
        <div className="shrink-0 px-4 md:px-6 pt-3 pb-1">
          <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-3">
            <p className="text-sm font-medium text-destructive">No credits remaining</p>
            <p className="text-xs text-muted-foreground">Purchase credits to continue using AI.</p>
            <button
              type="button"
              onClick={openPurchaseModal}
              className="self-start rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 transition-opacity"
            >
              Get credits
            </button>
          </div>
        </div>
      )}

      {/* ── empty state ── */}
      {!hasMessages && !isLoading && !isThinking && (
        <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-4 px-4 md:px-6 py-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <Sparkles className="h-10 w-10 text-amber-500" />
            <p className="text-lg font-semibold text-foreground">
              Lawket AI Assistant
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              {caseId === GENERAL_CASE_ID
                ? 'Ask any legal question, research a topic, or select a case above for context-aware answers.'
                : 'Ask anything about this case, get summaries, hearing prep, and more.'}
            </p>
          </div>
          {caseId !== GENERAL_CASE_ID && (
            <PromptChips
              onSelect={(chip) => {
                void sendMessage({
                  message: chip.label,
                  messageType: 'prompt_trigger',
                  promptType: chip.type,
                  promptLabel: chip.label,
                })
              }}
              creditBalance={balance}
              hasHearing={hasHearings}
              hasDocuments={hasDocuments}
              isLoading={chipsDisabled}
            />
          )}
        </div>
      )}

      {/* ── history loading skeleton ── */}
      {isLoading && !hasMessages && !isThinking && (
        <div className="flex flex-1 min-h-0 flex-col gap-4 px-4 md:px-6 py-4">
          {[80, 55, 70].map((w, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div
                className="h-9 rounded-2xl bg-muted animate-pulse"
                style={{ width: `${w}%`, maxWidth: 340 }}
              />
            </div>
          ))}
          {[60, 90].map((w, i) => (
            <div key={i + 3} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div
                className="h-9 rounded-2xl bg-muted animate-pulse"
                style={{ width: `${w}%`, maxWidth: 340 }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── message list — full width so scrollbar sits at the outer edge ── */}
      {(hasMessages || isThinking || isStreaming) && (
        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
          <div className="flex flex-col gap-4 px-4 md:px-6 py-4">
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
          </div>
        </div>
      )}

      {/* ── suggestions toggle (case-scoped only) ── */}
      {hasMessages && caseId !== GENERAL_CASE_ID && (
        <div className="shrink-0 border-t border-border px-4 md:px-6 pt-2 pb-1">
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
                onSelect={(chip) => {
                  void sendMessage({
                    message: chip.label,
                    messageType: 'prompt_trigger',
                    promptType: chip.type,
                    promptLabel: chip.label,
                  })
                }}
                creditBalance={balance}
                hasHearing={hasHearings}
                hasDocuments={hasDocuments}
                isLoading={chipsDisabled}
              />
            </div>
          )}
        </div>
      )}

      {/* ── chat input ── */}
      <div className="shrink-0 border-t border-border px-4 md:px-6 py-3">
        <ChatInput
          onSend={(params) => void sendMessage(params)}
          isLoading={isLoading}
          creditBalance={balance}
          caseId={caseId}
          isThinking={isThinking}
          isStreaming={isStreaming}
          onStop={stopGeneration}
        />
      </div>
    </div>
  )
}

export default function AIAssistantPage() {
  const [selectedCaseId, setSelectedCaseId] = useState(GENERAL_CASE_ID)
  const [clearConfirm, setClearConfirm] = useState(false)
  const openPurchaseModal = useUiStore((s) => s.openPurchaseModal)
  const { data: cases } = useCases({ status: 'active' })
  const { data: creditsData } = useCredits()
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
    caseId: selectedCaseId,
    onCreditsInsufficient: () => openPurchaseModal(),
  })

  // Auto-select the most recently updated active case on first load
  useEffect(() => {
    if (selectedCaseId === GENERAL_CASE_ID && cases && cases.length > 0) {
      setSelectedCaseId(cases[0].id)
    }
  }, [cases])

  // Reset confirm state when the selected case changes
  useEffect(() => {
    setClearConfirm(false)
  }, [selectedCaseId])

  async function handleClearHistory() {
    if (!clearConfirm) {
      setClearConfirm(true)
      setTimeout(() => setClearConfirm(false), 4000)
      return
    }
    await clearHistory()
    setClearConfirm(false)
  }

  return (
    // flex-1 min-h-0 overflow-hidden: fills <main> exactly, prevents outer scroll
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b bg-background gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
          <CaseSelector
            selectedCaseId={selectedCaseId}
            onSelect={(id) => setSelectedCaseId(id)}
          />
        </div>
        <div className="flex items-center gap-1.5">
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
      </div>

      <AIChatView
        caseId={selectedCaseId}
        hasHearings={false}
        hasDocuments={false}
        messages={messages}
        isLoading={isLoading}
        isThinking={isThinking}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        sendMessage={sendMessage}
        stopGeneration={stopGeneration}
        balance={balance}
        openPurchaseModal={openPurchaseModal}
      />
    </div>
  )
}
