'use client'

import dynamic from 'next/dynamic'
import { Sparkles, Copy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false })

interface AIResponseCardProps {
  isStreaming: boolean
  content: string
  onSave: (text: string) => void
  onDiscard: () => void
  onCopy?: () => void
  title?: string
  isLoading?: boolean
}

export function AIResponseCard({
  isStreaming,
  content,
  onSave,
  onDiscard,
  onCopy,
  title = 'AI suggestion',
  isLoading = false,
}: AIResponseCardProps) {
  const isDone = !isLoading && !isStreaming && content.length > 0

  const handleCopy = () => {
    if (content) {
      void navigator.clipboard.writeText(content)
      onCopy?.()
    }
  }

  return (
    <div className="rounded-lg border border-l-4 border-l-amber-500 bg-card shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Sparkles className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium flex-1">{title}</span>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!content}
          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
          aria-label="Copy AI response"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Discard AI response"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

            <div
        className={cn(
          'px-4 py-3 overflow-y-auto',
          'min-h-[120px] max-h-[400px]',
          'bg-muted/30',
        )}
      >
        {isLoading && !content && (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-5/6" />
            <div className="h-3 bg-muted rounded w-2/3" />
            <p className="text-xs text-muted-foreground mt-3">AI is thinking...</p>
          </div>
        )}

        {content && (
          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
            <ReactMarkdown>{content}</ReactMarkdown>
            {isStreaming && (
              <span
                className="inline-block w-0.5 h-4 bg-foreground ml-0.5 animate-pulse align-middle"
                aria-hidden="true"
              />
            )}
          </div>
        )}
      </div>

            {isDone && (
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t">
          <Button variant="ghost" size="sm" onClick={onDiscard}>
            Discard
          </Button>
          <Button size="sm" onClick={() => onSave(content)}>
            Save to case
          </Button>
        </div>
      )}
    </div>
  )
}
