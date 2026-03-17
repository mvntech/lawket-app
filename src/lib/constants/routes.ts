export const ROUTES = {
  home: '/',
  auth: {
    login: '/login',
    register: '/register',
    forgotPassword: '/forgot-password',
  },
  dashboard: '/dashboard',
  cases: {
    list: '/cases',
    create: '/cases/create',
    detail: (id: string) => `/cases/${id}` as const,
    edit: (id: string) => `/cases/${id}/edit` as const,
  },
  calendar: '/calendar',
  documents: '/documents',
  contacts: {
    list: '/contacts',
    detail: (id: string) => `/contacts/${id}` as const,
  },
  notifications: '/notifications',
  settings: {
    root: '/settings',
    security: '/settings/security',
    notifications: '/settings/notifications',
  },
} as const
