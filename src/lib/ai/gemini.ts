import { GoogleGenerativeAI } from '@google/generative-ai'

// server-side only
// never import this in any client component
// never import in files with 'use client'

if (typeof window !== 'undefined') {
  throw new Error(
    'gemini.ts must only be imported server-side. Never import in client components.',
  )
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export const AI_MODEL = 'gemini-2.5-flash-lite'

export const TOKEN_LIMITS = {
  caseSummary: 800,
  hearingPrep: 1200,
  suggestDeadlines: 600,
  analyzeDocument: 1000,
  cleanNotes: 600,
  draftSection: 1500,
} as const
