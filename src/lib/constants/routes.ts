export const ROUTES = {
  home: '/',
  auth: {
    login: '/login',
    register: '/register',
    forgotPassword: '/forgot-password',
    callback: '/auth/callback',
  },
  dashboard: '/dashboard',
  cases: {
    list: '/cases',
    new: '/cases/new',
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
    profile: '/settings/profile',
    security: '/settings/security',
    notifications: '/settings/notifications',
    appearance: '/settings/appearance',
    credits: '/settings/credits',
    account: '/settings/account',
  },
} as const
