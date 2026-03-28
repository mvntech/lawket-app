import type { Metadata } from 'next'
import { AIAssistantClient } from './_components/ai-assistant-client'

export const metadata: Metadata = { title: 'Lawket AI Assistant' }


export default function AIAssistantPage() {
  return <AIAssistantClient />
}
