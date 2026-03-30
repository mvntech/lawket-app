import { describe, it, expect } from 'vitest'
import {
  chatSchema,
  caseSummarySchema,
  analyzeDocumentSchema,
  hearingPrepSchema,
  cleanNotesSchema,
  draftSectionSchema,
  suggestDeadlinesSchema,
  deadlineSuggestionsSchema,
} from '@/lib/validations/ai.schema'

// chatSchema

describe('chatSchema', () => {
  it('accepts valid chat message', () => {
    const result = chatSchema.safeParse({ caseId: 'general', message: 'Hello' })
    expect(result.success).toBe(true)
  })

  it('accepts caseId as UUID or "general"', () => {
    expect(chatSchema.safeParse({ caseId: 'general', message: 'Hi' }).success).toBe(true)
    expect(chatSchema.safeParse({
      caseId: '550e8400-e29b-41d4-a716-446655440000',
      message: 'Hi',
    }).success).toBe(true)
  })

  it('rejects empty message', () => {
    const result = chatSchema.safeParse({ caseId: 'general', message: '' })
    expect(result.success).toBe(false)
  })

  it('rejects message exceeding 4000 chars', () => {
    const result = chatSchema.safeParse({
      caseId: 'general',
      message: 'A'.repeat(4001),
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing caseId', () => {
    const result = chatSchema.safeParse({ message: 'Hello' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid imageMediaType not in allowlist', () => {
    const result = chatSchema.safeParse({
      caseId: 'general',
      message: 'Look at this',
      imageBase64: 'abc123',
      imageMediaType: 'image/svg+xml',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid imageMediaType', () => {
    const result = chatSchema.safeParse({
      caseId: 'general',
      message: 'Look at this',
      imageBase64: 'abc123',
      imageMediaType: 'image/jpeg',
    })
    expect(result.success).toBe(true)
  })

  it('rejects documentContext exceeding 15000 chars', () => {
    const result = chatSchema.safeParse({
      caseId: 'general',
      message: 'Analyze this',
      documentContext: 'X'.repeat(15001),
    })
    expect(result.success).toBe(false)
  })
})

// caseSummarySchema

describe('caseSummarySchema', () => {
  it('accepts minimal valid input', () => {
    const result = caseSummarySchema.safeParse({
      title: 'Ahmad v. State',
      clientName: 'Tariq Ahmad',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing title', () => {
    const result = caseSummarySchema.safeParse({ clientName: 'Ahmad' })
    expect(result.success).toBe(false)
  })

  it('rejects missing clientName', () => {
    const result = caseSummarySchema.safeParse({ title: 'Ahmad v. State' })
    expect(result.success).toBe(false)
  })

  it('rejects title exceeding 200 chars', () => {
    const result = caseSummarySchema.safeParse({
      title: 'A'.repeat(201),
      clientName: 'Ahmad',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid caseType', () => {
    const result = caseSummarySchema.safeParse({
      title: 'Test',
      clientName: 'Ahmad',
      caseType: 'invalid_type',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid caseType values', () => {
    const types = ['civil', 'criminal', 'family', 'corporate', 'property', 'constitutional', 'tax', 'labour', 'other']
    for (const caseType of types) {
      expect(caseSummarySchema.safeParse({ title: 'T', clientName: 'A', caseType }).success).toBe(true)
    }
  })

  it('rejects notes exceeding 5000 chars', () => {
    const result = caseSummarySchema.safeParse({
      title: 'Test',
      clientName: 'Ahmad',
      notes: 'N'.repeat(5001),
    })
    expect(result.success).toBe(false)
  })
})

// analyzeDocumentSchema

describe('analyzeDocumentSchema', () => {
  const validText = 'A'.repeat(100)

  it('accepts valid document text', () => {
    const result = analyzeDocumentSchema.safeParse({ documentText: validText })
    expect(result.success).toBe(true)
  })

  it('rejects documentText under 50 chars', () => {
    const result = analyzeDocumentSchema.safeParse({ documentText: 'short' })
    expect(result.success).toBe(false)
  })

  it('rejects documentText over 12000 chars', () => {
    const result = analyzeDocumentSchema.safeParse({ documentText: 'A'.repeat(12001) })
    expect(result.success).toBe(false)
  })

  it('rejects missing documentText', () => {
    const result = analyzeDocumentSchema.safeParse({ documentName: 'doc.pdf' })
    expect(result.success).toBe(false)
  })

  it('rejects documentName exceeding 200 chars', () => {
    const result = analyzeDocumentSchema.safeParse({
      documentText: validText,
      documentName: 'D'.repeat(201),
    })
    expect(result.success).toBe(false)
  })
})

// hearingPrepSchema

describe('hearingPrepSchema', () => {
  it('accepts valid minimal input', () => {
    const result = hearingPrepSchema.safeParse({
      hearingTitle: 'Bail Hearing',
      hearingDate: '2026-06-01',
      caseTitle: 'Ahmad v. State',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing hearingTitle', () => {
    const result = hearingPrepSchema.safeParse({
      hearingDate: '2026-06-01',
      caseTitle: 'Ahmad v. State',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing hearingDate', () => {
    const result = hearingPrepSchema.safeParse({
      hearingTitle: 'Bail Hearing',
      caseTitle: 'Ahmad v. State',
    })
    expect(result.success).toBe(false)
  })

  it('rejects previousHearings array exceeding 10 items', () => {
    const result = hearingPrepSchema.safeParse({
      hearingTitle: 'Hearing',
      hearingDate: '2026-06-01',
      caseTitle: 'Test',
      previousHearings: Array(11).fill('hearing'),
    })
    expect(result.success).toBe(false)
  })

  it('accepts previousHearings with up to 10 items', () => {
    const result = hearingPrepSchema.safeParse({
      hearingTitle: 'Hearing',
      hearingDate: '2026-06-01',
      caseTitle: 'Test',
      previousHearings: Array(10).fill('hearing'),
    })
    expect(result.success).toBe(true)
  })
})

// cleanNotesSchema

describe('cleanNotesSchema', () => {
  it('accepts valid notes', () => {
    const result = cleanNotesSchema.safeParse({ rawNotes: 'These are my case notes.' })
    expect(result.success).toBe(true)
  })

  it('rejects notes under 10 chars', () => {
    const result = cleanNotesSchema.safeParse({ rawNotes: 'short' })
    expect(result.success).toBe(false)
  })

  it('rejects notes over 5000 chars', () => {
    const result = cleanNotesSchema.safeParse({ rawNotes: 'N'.repeat(5001) })
    expect(result.success).toBe(false)
  })

  it('rejects missing rawNotes', () => {
    const result = cleanNotesSchema.safeParse({ caseTitle: 'Test' })
    expect(result.success).toBe(false)
  })
})

// draftSectionSchema

describe('draftSectionSchema', () => {
  it('accepts valid sectionType and caseContext', () => {
    const result = draftSectionSchema.safeParse({
      sectionType: 'petition_intro',
      caseContext: 'This is the case context.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid sectionType', () => {
    const result = draftSectionSchema.safeParse({
      sectionType: 'introduction',
      caseContext: 'Context here.',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid sectionType values', () => {
    const types = ['petition_intro', 'relief_sought', 'facts', 'legal_arguments', 'application', 'cover_letter']
    for (const sectionType of types) {
      expect(draftSectionSchema.safeParse({ sectionType, caseContext: 'Context' }).success).toBe(true)
    }
  })

  it('rejects missing caseContext', () => {
    const result = draftSectionSchema.safeParse({ sectionType: 'facts' })
    expect(result.success).toBe(false)
  })

  it('rejects caseContext exceeding 10000 chars', () => {
    const result = draftSectionSchema.safeParse({
      sectionType: 'facts',
      caseContext: 'C'.repeat(10001),
    })
    expect(result.success).toBe(false)
  })
})

// suggestDeadlinesSchema

describe('suggestDeadlinesSchema', () => {
  it('accepts valid input', () => {
    const result = suggestDeadlinesSchema.safeParse({
      caseType: 'criminal',
      hearingDate: '2026-06-01',
      caseTitle: 'Ahmad v. State',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing caseType', () => {
    const result = suggestDeadlinesSchema.safeParse({
      hearingDate: '2026-06-01',
      caseTitle: 'Ahmad v. State',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing hearingDate', () => {
    const result = suggestDeadlinesSchema.safeParse({
      caseType: 'civil',
      caseTitle: 'Ahmad v. State',
    })
    expect(result.success).toBe(false)
  })

  it('rejects caseTitle exceeding 200 chars', () => {
    const result = suggestDeadlinesSchema.safeParse({
      caseType: 'civil',
      hearingDate: '2026-06-01',
      caseTitle: 'T'.repeat(201),
    })
    expect(result.success).toBe(false)
  })
})

// deadlineSuggestionsSchema (AI response validation)

describe('deadlineSuggestionsSchema', () => {
  it('accepts valid AI response array', () => {
    const result = deadlineSuggestionsSchema.safeParse([
      {
        title: 'File brief',
        days_before_hearing: 7,
        priority: 'high',
        description: 'File the written brief.',
      },
    ])
    expect(result.success).toBe(true)
  })

  it('rejects invalid priority value from AI', () => {
    const result = deadlineSuggestionsSchema.safeParse([
      {
        title: 'File brief',
        days_before_hearing: 7,
        priority: 'urgent',
        description: 'File the written brief.',
      },
    ])
    expect(result.success).toBe(false)
  })

  it('rejects days_before_hearing over 365', () => {
    const result = deadlineSuggestionsSchema.safeParse([
      {
        title: 'File brief',
        days_before_hearing: 400,
        priority: 'medium',
        description: 'Too far out.',
      },
    ])
    expect(result.success).toBe(false)
  })

  it('rejects negative days_before_hearing', () => {
    const result = deadlineSuggestionsSchema.safeParse([
      {
        title: 'File brief',
        days_before_hearing: -1,
        priority: 'medium',
        description: 'Invalid.',
      },
    ])
    expect(result.success).toBe(false)
  })

  it('rejects non-integer days_before_hearing', () => {
    const result = deadlineSuggestionsSchema.safeParse([
      {
        title: 'File brief',
        days_before_hearing: 7.5,
        priority: 'low',
        description: 'Invalid.',
      },
    ])
    expect(result.success).toBe(false)
  })

  it('accepts empty array (AI returned no suggestions)', () => {
    const result = deadlineSuggestionsSchema.safeParse([])
    expect(result.success).toBe(true)
  })
})
