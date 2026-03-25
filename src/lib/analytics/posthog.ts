import posthog from 'posthog-js'

export { posthog }

export function initPostHog(): void {
  if (typeof window === 'undefined') return

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

  // disabled in development (only active in staging/production)
  if (!key || !host || process.env.NEXT_PUBLIC_APP_ENV === 'development') return

  posthog.init(key, {
    api_host: host,
    capture_pageview: false, // manual pageview tracking via providers.tsx
    capture_pageleave: true,
  })
}

export function capturePageview(url: string): void {
  posthog.capture('$pageview', { $current_url: url })
}

// analytics event helpers

export const analytics = {
  // cases
  caseCreated: (caseType: string) => posthog.capture('case_created', { caseType }),
  caseDeleted: () => posthog.capture('case_deleted'),

  // hearings
  hearingAdded: (caseType: string) => posthog.capture('hearing_added', { caseType }),
  hearingDeleted: () => posthog.capture('hearing_deleted'),

  // deadlines
  deadlineAdded: (priority: string) => posthog.capture('deadline_added', { priority }),
  deadlineCompleted: (priority: string) => posthog.capture('deadline_completed', { priority }),
  deadlineDeleted: () => posthog.capture('deadline_deleted'),

  // calendar
  calendarViewChanged: (view: 'month' | 'week' | 'agenda') =>
    posthog.capture('calendar_view_changed', { view }),

  // documents
  documentUploaded: (mimeType: string) => posthog.capture('document_uploaded', { mimeType }),
  documentViewed: (mimeType: string) => posthog.capture('document_viewed', { mimeType }),
  documentDeleted: () => posthog.capture('document_deleted'),
  documentDownloaded: () => posthog.capture('document_downloaded'),

  // contacts
  contactAdded: (role: string) => posthog.capture('contact_added', { role }),
  contactUpdated: () => posthog.capture('contact_updated'),
  contactDeleted: () => posthog.capture('contact_deleted'),
  contactLinkedToCase: () => posthog.capture('contact_linked_to_case'),
  contactUnlinkedFromCase: () => posthog.capture('contact_unlinked_from_case'),

  // dashboard
  dashboardViewed: (seconds: number) => posthog.capture('dashboard_viewed', { seconds }),
  quickActionUsed: (action: string) => posthog.capture('quick_action_used', { action }),

  // notifications
  notificationOpened: (type: string) => posthog.capture('notification_opened', { type }),
  allNotificationsMarkedRead: () => posthog.capture('all_notifications_marked_read'),

  // push notifications
  pushPermissionRequested: (result?: string) => posthog.capture('push_permission_requested', { result }),
  pushNotificationEnabled: () => posthog.capture('push_notification_enabled'),
  pushNotificationDisabled: () => posthog.capture('push_notification_disabled'),

  // settings / profile
  profileUpdated: () => posthog.capture('profile_updated'),
  avatarUpdated: () => posthog.capture('avatar_updated'),
  passwordChanged: () => posthog.capture('password_changed'),
  accountDeleted: () => posthog.capture('account_deleted'),
  signOutClicked: () => posthog.capture('sign_out_clicked'),
  dataExported: () => posthog.capture('data_exported'),
  themeChanged: (theme: string) => posthog.capture('theme_changed', { theme }),
  fontSizeChanged: (size: string) => posthog.capture('font_size_changed', { size }),

  // AI
  aiChatOpened: (caseId?: string) => posthog.capture('ai_chat_opened', { caseId }),
  aiPromptChipUsed: (prompt: string, caseId?: string) => posthog.capture('ai_prompt_chip_used', { prompt, caseId }),
  aiHistoryCleared: () => posthog.capture('ai_history_cleared'),
}
