'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { FileText, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ChatMessage } from '@/lib/ai/types'

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false })

const MARKDOWN_BUFFER_MS = 50

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// three bouncing dots shown while AI is thinking (no tokens yet)
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-2 w-2 rounded-full bg-muted-foreground/50"
          style={{
            animation: 'typing-bounce 1.2s ease-in-out infinite',
            animationDelay: i * 0.2 + 's',
          }}
        />
      ))}
    </div>
  )
}

// blinking cursor shown after last character during streaming
function StreamingCursor() {
  return (
    <span
      className="ml-px inline-block h-[1.1em] w-[2px] align-middle rounded-sm bg-foreground"
      style={{ animation: 'cursor-blink 0.8s step-end infinite' }}
    />
  )
}

interface ChatMessageProps {
  message: ChatMessage
  isStreaming?: boolean
  streamingContent?: string
  isThinking?: boolean
}

export function ChatMessageBubble({
  message,
  isStreaming,
  streamingContent,
  isThinking,
}: ChatMessageProps) {
  const isUser = message.role === 'user'

  // buffered streaming content - only updates every 50ms to prevent markdown flicker
  // when not streaming, displayContent falls through to message.content directly (no extra state)
  const [bufferedStream, setBufferedStream] = useState('')
  const bufferTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isStreaming || !streamingContent) return

    if (bufferTimer.current) clearTimeout(bufferTimer.current)

    bufferTimer.current = setTimeout(() => {
      setBufferedStream(streamingContent)
    }, MARKDOWN_BUFFER_MS)

    return () => {
      if (bufferTimer.current) clearTimeout(bufferTimer.current)
    }
  }, [streamingContent, isStreaming])

  // derive display content (no setState in effect body)
  const content = isStreaming ? bufferedStream : message.content

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}
    >
            {isUser && message.type === 'prompt_trigger' && message.metadata?.promptLabel && (
        <div className="mb-1 flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          <span>✦</span>
          <span>{message.metadata.promptLabel}</span>
          {message.metadata.creditsUsed !== undefined && (
            <span className="opacity-70">· {message.metadata.creditsUsed} credit</span>
          )}
        </div>
      )}

            {isUser && message.type === 'document_ref' && message.metadata?.documentName && (
        <div className="mb-1 flex items-center gap-1 rounded-full bg-amber-100/60 px-2 py-0.5 text-xs text-muted-foreground dark:bg-amber-900/20">
          <FileText className="h-[10px] w-[10px]" />
          <span className="max-w-[180px] truncate">{message.metadata.documentName}</span>
          <span>· PDF analyzed</span>
        </div>
      )}

            {isUser && message.type === 'file_upload' && (
        <div className="mb-1 flex items-center gap-1 rounded-full bg-amber-100/60 px-2 py-0.5 text-xs text-muted-foreground dark:bg-amber-900/20">
          {message.metadata?.fileType?.startsWith('image/') ? (
            <ImageIcon className="h-[10px] w-[10px]" />
          ) : (
            <FileText className="h-[10px] w-[10px]" />
          )}
          <span className="max-w-[180px] truncate">
            {message.metadata?.fileName ?? message.metadata?.documentName ?? 'Uploaded file'}
          </span>
          <span>
            {message.metadata?.fileType?.startsWith('image/') ? '· Image shared' : '· PDF analyzed'}
          </span>
        </div>
      )}

            <div
        className={cn(
          'max-w-[85%] px-4 py-2.5',
          isUser
            ? 'rounded-2xl rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-2xl rounded-bl-sm bg-muted text-foreground',
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap wrap-break-word">{content}</p>
        ) : isThinking ? (
          // thinking state (show dots, no bubble content)
          <TypingIndicator />
        ) : (
          <div className={cn('text-sm prose prose-sm dark:prose-invert max-w-none', isStreaming && 'streaming-content')}>
            {content ? (
              <>
                <ReactMarkdown>{content}</ReactMarkdown>
                {isStreaming && <StreamingCursor />}
              </>
            ) : isStreaming ? (
              // first tokens not rendered yet (show dots)
              <TypingIndicator />
            ) : null}
          </div>
        )}
      </div>

      {!isThinking && (
        <div className={cn('mt-0.5 flex items-center gap-2', isUser ? 'flex-row-reverse' : '')}>
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(message.createdAt)}
          </span>
          {!isUser && message.metadata?.creditsUsed !== undefined && message.metadata.creditsUsed > 0 && (
            <span className="text-[10px] text-muted-foreground/60">
              {message.metadata.creditsUsed} credit{message.metadata.creditsUsed > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}
