export const DB_TABLES = {
  profiles: 'profiles',
  cases: 'cases',
  hearings: 'hearings',
  deadlines: 'deadlines',
  documents: 'documents',
  contacts: 'contacts',
  caseContacts: 'case_contacts',
  notificationLogs: 'notification_logs',
  auditLogs: 'audit_logs',
} as const

export type DbTable = (typeof DB_TABLES)[keyof typeof DB_TABLES]
