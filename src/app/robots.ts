import type { MetadataRoute } from 'next'
import { BRAND } from '@/lib/constants/brand'

// dynamic robots.txt

export default function robots(): MetadataRoute.Robots {
  const APP_ROUTES = [
    '/dashboard',
    '/cases',
    '/calendar',
    '/documents',
    '/contacts',
    '/settings',
    '/api/',
    '/offline',
  ]

  return {
    rules: [
      // default: all crawlers
      {
        userAgent: '*',
        allow: [
          '/',
          '/privacy',
          '/terms',
          '/disclaimer',
          '/refund-policy',
          '/support',
          '/changelog',
        ],
        disallow: APP_ROUTES,
      },
      // explicit GEO allow list (AI search engines that respect robots.txt)
      {
        userAgent: 'GPTBot',
        allow: ['/'],
        disallow: APP_ROUTES,
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/'],
        disallow: APP_ROUTES,
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/'],
        disallow: APP_ROUTES,
      },
      {
        userAgent: 'Amazonbot',
        allow: ['/'],
        disallow: APP_ROUTES,
      },
      {
        userAgent: 'Bytespider',
        disallow: ['/'],
      },
    ],
    sitemap: `${BRAND.url}/sitemap.xml`,
    host: BRAND.url,
  }
}
