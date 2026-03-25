export const queryKeys = {
  auth: {
    session: () => ['auth', 'session'] as const,
    user: () => ['auth', 'user'] as const,
  },
  cases: {
    all: () => ['cases'] as const,
    list: (filters?: Record<string, unknown>) => ['cases', 'list', filters] as const,
    detail: (id: string) => ['cases', id] as const,
    stats: () => ['cases', 'stats'] as const,
  },
  hearings: {
    all: () => ['hearings'] as const,
    byCase: (caseId: string) => ['hearings', 'case', caseId] as const,
    upcoming: (days?: number) => ['hearings', 'upcoming', days] as const,
    range: (from: Date, to: Date) =>
      ['hearings', 'range', from.toISOString(), to.toISOString()] as const,
  },
  deadlines: {
    all: () => ['deadlines'] as const,
    byCase: (caseId: string) => ['deadlines', 'case', caseId] as const,
    upcoming: (days?: number) => ['deadlines', 'upcoming', days] as const,
    overdue: () => ['deadlines', 'overdue'] as const,
  },
  documents: {
    all: () => ['documents'] as const,
    byCase: (caseId: string) => ['documents', 'case', caseId] as const,
    detail: (id: string) => ['documents', id] as const,
    signedUrl: (filePath: string | null) => ['documents', 'signed-url', filePath] as const,
  },
  contacts: {
    all: (options?: object) => ['contacts', options] as const,
    detail: (id: string) => ['contacts', id] as const,
    byCase: (caseId: string) => ['contacts', 'case', caseId] as const,
    casesByContact: (contactId: string) => ['contacts', 'linked-cases', contactId] as const,
  },
  notifications: {
    all: (filters?: object) => ['notifications', filters] as const,
    unread: () => ['notifications', 'unread'] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },
  dashboard: {
    stats: () => ['dashboard', 'stats'] as const,
    summary: (userId: string) => ['dashboard', 'summary', userId] as const,
    activity: (userId: string) => ['dashboard', 'activity', userId] as const,
  },
  profile: {
    me: () => ['profile', 'me'] as const,
  },
  credits: {
    balance: () => ['credits', 'balance'] as const,
    transactions: () => ['credits', 'transactions'] as const,
  },
  ai: {
    usage: () => ['ai', 'usage'] as const,
    cache: (key: string) => ['ai', 'cache', key] as const,
  },
}
