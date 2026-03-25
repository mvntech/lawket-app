'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants/query-keys'
import type { ChatMessage, MessageType, PromptType } from '@/lib/ai/types'

interface UseChatOptions {
  caseId: string
  onCreditsInsufficient?: () => void
}

interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  isThinking: boolean
  isStreaming: boolean
  streamingContent: string
  conversationId: string | null
  error: string | null
}

export interface SendParams {
  message: string
  messageType?: MessageType
  promptType?: PromptType
  promptLabel?: string
  documentContext?: string
  documentName?: string
  imageBase64?: string
  imageMediaType?: string
}

export function useAIChat({ caseId, onCreditsInsufficient }: UseChatOptions) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    isThinking: false,
    isStreaming: false,
    streamingContent: '',
    conversationId: null,
    error: null,
  })

  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    void loadConversation()
  }, [caseId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages, state.streamingContent])

  async function loadConversation() {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      const res = await fetch('/api/ai/chat/history?caseId=' + caseId)
      if (res.ok) {
        const data = (await res.json()) as { conversationId: string; messages: ChatMessage[] }
        setState((prev) => ({
          ...prev,
          messages: data.messages,
          conversationId: data.conversationId,
          isLoading: false,
        }))
      } else {
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  async function sendMessage(params: SendParams) {
    const {
      message,
      messageType = 'text',
      promptType,
      promptLabel,
      documentContext,
      documentName,
      imageBase64,
      imageMediaType,
    } = params

    const tempUserMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      conversationId: state.conversationId ?? '',
      role: 'user',
      content: message,
      type: messageType,
      metadata: {
        promptLabel,
        documentName,
        fileName: imageBase64 ? documentName : undefined,
        fileType: imageMediaType,
      },
      createdAt: new Date().toISOString(),
    }

    // isThinking = true immediately (waiting for first token)
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, tempUserMsg],
      isThinking: true,
      isStreaming: false,
      streamingContent: '',
      error: null,
    }))

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          caseId,
          message,
          messageType,
          promptType,
          documentContext,
          documentName,
          imageBase64,
          imageMediaType,
        }),
      })

      if (response.status === 402) {
        setState((prev) => ({
          ...prev,
          messages: prev.messages.filter((m) => m.id !== tempUserMsg.id),
          isThinking: false,
          isStreaming: false,
        }))
        onCreditsInsufficient?.()
        return
      }

      if (!response.ok) throw new Error('Chat request failed')

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ''
      let firstTokenReceived = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data) as { text?: string }
            if (parsed.text) {
              if (parsed.text.includes('[META]')) {
                const metaStr = parsed.text.split('[META]')[1]
                try {
                  const meta = JSON.parse(metaStr ?? '{}') as {
                    conversationId?: string
                    creditsUsed?: number
                  }
                  if (meta.conversationId) {
                    setState((prev) => ({
                      ...prev,
                      conversationId: meta.conversationId ?? prev.conversationId,
                    }))
                  }
                  void queryClient.invalidateQueries({ queryKey: queryKeys.credits.balance() })
                  void queryClient.invalidateQueries({ queryKey: queryKeys.ai.usage() })
                } catch {
                  // ignore meta parse errors
                }
              } else {
                if (!firstTokenReceived) {
                  // first token arrived (switch from thinking to streaming)
                  firstTokenReceived = true
                  setState((prev) => ({
                    ...prev,
                    isThinking: false,
                    isStreaming: true,
                  }))
                }
                accumulatedContent += parsed.text
                setState((prev) => ({ ...prev, streamingContent: accumulatedContent }))
              }
            }
          } catch {
            // ignore chunk parse errors
          }
        }
      }

      const assistantMsg: ChatMessage = {
        id: 'assistant-' + Date.now(),
        conversationId: state.conversationId ?? '',
        role: 'assistant',
        content: accumulatedContent,
        type: 'text',
        createdAt: new Date().toISOString(),
      }

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
        isThinking: false,
        isStreaming: false,
        streamingContent: '',
      }))
    } catch (err) {
      const isAbort =
        err instanceof Error && (err.name === 'AbortError' || err.message.includes('abort'))

      if (isAbort) {
        // stream was stopped by user (keep partial content as a message)
        setState((prev) => {
          const partial = prev.streamingContent
          const partialMsg: ChatMessage | null =
            partial.trim()
              ? {
                id: 'assistant-' + Date.now(),
                conversationId: prev.conversationId ?? '',
                role: 'assistant',
                content: partial + '\n\n*— Generation stopped*',
                type: 'text',
                createdAt: new Date().toISOString(),
              }
              : null

          return {
            ...prev,
            messages: partialMsg ? [...prev.messages, partialMsg] : prev.messages,
            isThinking: false,
            isStreaming: false,
            streamingContent: '',
          }
        })
      } else {
        setState((prev) => ({
          ...prev,
          messages: prev.messages.filter((m) => m.id !== tempUserMsg.id),
          isThinking: false,
          isStreaming: false,
          error: err instanceof Error ? err.message : 'Failed to send message',
        }))
      }
    } finally {
      abortControllerRef.current = null
    }
  }

  async function clearHistory() {
    if (!state.conversationId) return
    await fetch('/api/ai/chat/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: state.conversationId }),
    })
    setState((prev) => ({ ...prev, messages: [] }))
  }

  return {
    ...state,
    sendMessage,
    clearHistory,
    stopGeneration,
    messagesEndRef,
    loadConversation,
  }
}
