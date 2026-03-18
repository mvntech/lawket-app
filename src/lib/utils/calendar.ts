import type { HearingModel } from '@/services/hearings.service'
import type { DeadlineModel } from '@/services/deadlines.service'
import type { CaseModel } from '@/services/cases.service'
import type { CaseStatus } from '@/types/common.types'

export interface CaseGroup {
  caseId: string
  caseTitle: string
  caseNumber: string
  caseStatus: CaseStatus
  hearings: HearingModel[]
  deadlines: DeadlineModel[]
}

export function groupByCase(
  hearings: HearingModel[],
  deadlines: DeadlineModel[],
  cases: CaseModel[],
): CaseGroup[] {
  const caseMap = new Map<string, CaseModel>()
  for (const c of cases) {
    caseMap.set(c.id, c)
  }

  const groups = new Map<string, CaseGroup>()

  function getOrCreate(
    caseId: string,
    caseTitle?: string,
    caseNumber?: string,
    caseStatus?: CaseStatus,
  ): CaseGroup {
    const existing = groups.get(caseId)
    if (existing) return existing

    const fallback = caseMap.get(caseId)
    const group: CaseGroup = {
      caseId,
      caseTitle: caseTitle ?? fallback?.title ?? 'Unknown case',
      caseNumber: caseNumber ?? fallback?.case_number ?? '',
      caseStatus: caseStatus ?? fallback?.status ?? 'active',
      hearings: [],
      deadlines: [],
    }
    groups.set(caseId, group)
    return group
  }

  for (const h of hearings) {
    getOrCreate(h.case_id, h.case_title, h.case_number, h.case_status).hearings.push(h)
  }

  for (const d of deadlines) {
    getOrCreate(d.case_id, d.case_title, d.case_number, d.case_status).deadlines.push(d)
  }

  return [...groups.values()].sort(
    (a, b) =>
      b.hearings.length + b.deadlines.length - (a.hearings.length + a.deadlines.length),
  )
}
