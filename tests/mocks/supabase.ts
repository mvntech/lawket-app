import { vi } from 'vitest'

// builder pattern mock that chains correctly
export function createQueryBuilder(data: unknown = [], error: unknown = null) {
  const resolvedData = Array.isArray(data) ? data : [data]
  const builder: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(
      { data: resolvedData[0] ?? null, error }
    ),
    maybeSingle: vi.fn().mockResolvedValue(
      { data: resolvedData[0] ?? null, error }
    ),
    textSearch: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: resolvedData, error }).then(resolve),
  }
  return builder
}

export function createMockSupabase(
  defaultData: Record<string, unknown[]> = {},
  rpcResults: Record<string, unknown> = {},
) {
  // cache builders per table so tests can spy on the same instance the service used
  const tableBuilders = new Map<string, ReturnType<typeof createQueryBuilder>>()

  const mockFrom = vi.fn((table: string) => {
    if (!tableBuilders.has(table)) {
      tableBuilders.set(table, createQueryBuilder(defaultData[table] ?? []))
    }
    return tableBuilders.get(table)!
  })

  return {
    from: mockFrom,
    rpc: vi.fn((fn: string) =>
      Promise.resolve({ data: rpcResults[fn] ?? null, error: null })
    ),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'user-test-123',
            email: 'sarah@lawfirm.com',
          }
        },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token' } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token' }, user: { id: 'user-test-123' } },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-test-123' }, session: null },
        error: null,
      }),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue(
          { data: { path: 'user-test-123/case-test-123/123_file.pdf' }, error: null }
        ),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://mock-signed-url.supabase.co/file.pdf?token=abc' },
          error: null,
        }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  }
}
