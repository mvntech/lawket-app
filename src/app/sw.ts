/// <reference lib="webworker" />

import { defaultCache } from '@serwist/next/worker'
import {
  Serwist,
  NetworkFirst,
  CacheFirst,
  StaleWhileRevalidate,
  ExpirationPlugin,
  CacheableResponsePlugin,
} from 'serwist'

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | import('serwist').PrecacheEntry)[]
}

// runtime caching

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false, // controlled via message (UpdateNotification component sends SKIP_WAITING)
  clientsClaim: true,
  navigationPreload: true,
  fallbacks: {
    entries: [
      { url: '/offline', matcher: ({ request }) => request.destination === 'document' },
    ],
  },
  runtimeCaching: [
    // supabase REST API (network first, 5-minute cache)
    {
      matcher: /^https:\/\/.*\.supabase\.co\/rest\/.*/,
      handler: new NetworkFirst({
        cacheName: 'supabase-api',
        plugins: [
          new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 300 }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
    // supabase auth (network only, never cache auth tokens)
    {
      matcher: /^https:\/\/.*\.supabase\.co\/auth\/.*/,
      handler: new NetworkFirst({
        cacheName: 'supabase-auth',
        plugins: [
          new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 }),
        ],
      }),
    },
    // supabase storage (signed URLs) (cache first, 1-hour TTL)
    {
      matcher: /^https:\/\/.*\.supabase\.co\/storage\/.*/,
      handler: new CacheFirst({
        cacheName: 'supabase-storage',
        plugins: [
          new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 3600 }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
    // google fonts stylesheets (stale while revalidate)
    {
      matcher: /^https:\/\/fonts\.googleapis\.com\/.*/,
      handler: new StaleWhileRevalidate({
        cacheName: 'google-fonts-stylesheets',
        plugins: [
          new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
        ],
      }),
    },
    // google fonts files (cache first, 1-year TTL)
    {
      matcher: /^https:\/\/fonts\.gstatic\.com\/.*/,
      handler: new CacheFirst({
        cacheName: 'google-fonts-webfonts',
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
        ],
      }),
    },
    // next.js static assets (cache first, 30-day TTL)
    {
      matcher: /\/_next\/static\/.*/,
      handler: new CacheFirst({
        cacheName: 'next-static',
        plugins: [
          new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
    // images (stale while revalidate, 30-day TTL)
    {
      matcher: /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/,
      handler: new StaleWhileRevalidate({
        cacheName: 'images',
        plugins: [
          new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
    ...defaultCache,
  ],
})

serwist.addEventListeners()

// lifecycle logging

self.addEventListener('install', () => {
  console.info('[SW] Installing service worker')
})

self.addEventListener('activate', () => {
  console.info('[SW] Service worker activated')
})

// SKIP_WAITING message (from UpdateNotification component)

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.info('[SW] Received SKIP_WAITING - activating new service worker')
    self.skipWaiting()
  }

  if (event.data?.type === 'TRIGGER_SYNC') {
    // background sync triggered from sync-engine on reconnect
    event.waitUntil(
      self.registration.sync?.register('background-sync').catch((err) => {
        console.warn('[SW] Background sync registration failed:', err)
      }) ?? Promise.resolve(),
    )
  }
})

// background sync

self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'background-sync') {
    console.info('[SW] Background sync triggered - notifying clients')
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'BACKGROUND_SYNC_TRIGGERED' })
        })
      }),
    )
  }
})

// push notifications

interface PushPayload {
  title: string
  body: string
  data?: {
    type: 'hearing_reminder' | 'deadline_reminder' | 'case_update' | 'system'
    case_id?: string
    reference_id?: string
  }
}

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  const data = event.data.json() as PushPayload

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    // tag deduplicates (same hearing/deadline won't fire twice)
    tag: data.data
      ? `${data.data.type}-${data.data.reference_id ?? data.data.case_id}`
      : 'lawket',
    requireInteraction: true,
    data: data.data,
    actions: [
      { action: 'view', title: 'View case' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    vibrate: [200, 100, 200],
  } as NotificationOptions

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// notification click

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const action = event.action
  const data = event.notification.data as PushPayload['data']

  if (action === 'dismiss') return

  const url = data?.case_id ? `/cases/${data.case_id}` : '/dashboard'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList: readonly WindowClient[]) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus()
            client.navigate(url)
            return
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url)
        }
      }),
  )
})

// notification close

self.addEventListener('notificationclose', (_event: NotificationEvent) => {
  // analytics tracked client-side (no action needed here)
})
