'use client'

import { useState } from 'react'

interface AIState {
  isLoading: boolean
  isStreaming: boolean
  content: string
  error: string | null
  isDone: boolean
}

function useAIStream(endpoint: string) {
  const [state, setState] = useState<AIState>({
    isLoading: false,
    isStreaming: false,
    content: '',
    error: null,
    isDone: false,
  })

  async function request(body: Record<string, unknown>) {
    setState({
      isLoading: true,
      isStreaming: false,
      content: '',
      error: null,
      isDone: false,
    })

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error((err as { error?: string }).error ?? 'AI request failed')
      }

      setState((prev) => ({ ...prev, isLoading: false, isStreaming: true }))

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            setState((prev) => ({ ...prev, isStreaming: false, isDone: true }))
            break
          }
          try {
            const parsed = JSON.parse(data) as { error?: string; text?: string }
            if (parsed.error) {
              throw new Error(parsed.error)
            }
            if (parsed.text) {
              setState((prev) => ({ ...prev, content: prev.content + parsed.text }))
            }
          } catch {
            // ignore parse errors for individual chunks
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI assistant unavailable'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        error: message,
        isDone: false,
      }))
    }
  }

  function reset() {
    setState({
      isLoading: false,
      isStreaming: false,
      content: '',
      error: null,
      isDone: false,
    })
  }

  return { ...state, request, reset }
}

export function useCaseSummaryAI() {
  return useAIStream('/api/ai/case-summary')
}

export function useHearingPrepAI() {
  return useAIStream('/api/ai/hearing-prep')
}

export function useCleanNotesAI() {
  return useAIStream('/api/ai/clean-notes')
}

export function useAnalyzeDocumentAI() {
  return useAIStream('/api/ai/analyze-document')
}

export function useDraftSectionAI() {
  return useAIStream('/api/ai/draft-section')
}

// non-streaming for deadline suggestions

interface DeadlineSuggestion {
  title: string
  due_date: string
  priority: string
  description: string
}

export function useSuggestDeadlines() {
  const [isLoading, setIsLoading] = useState(false)
  const [deadlines, setDeadlines] = useState<DeadlineSuggestion[]>([])
  const [error, setError] = useState<string | null>(null)

  async function suggest(body: { caseType: string; hearingDate: string; caseTitle: string }) {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/suggest-deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get suggestions')
      }
      setDeadlines(data.deadlines || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI unavailable')
    } finally {
      setIsLoading(false)
    }
  }

  function reset() {
    setDeadlines([])
    setError(null)
  }

  return { isLoading, deadlines, error, suggest, reset }
}
