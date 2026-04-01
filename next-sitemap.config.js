/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'https://lawket.vercel.app',
  generateRobotsTxt: false,
  generateIndexSitemap: false,
  exclude: [
    '/dashboard',
    '/dashboard/*',
    '/cases',
    '/cases/*',
    '/calendar',
    '/calendar/*',
    '/documents',
    '/documents/*',
    '/contacts',
    '/contacts/*',
    '/settings',
    '/settings/*',
    '/api/*',
  ],
  additionalPaths: async (config) => [
    {
      loc: '/',
      changefreq: 'weekly',
      priority: 1.0,
      lastmod: new Date().toISOString(),
    },
    {
      loc: '/privacy',
      changefreq: 'monthly',
      priority: 0.5,
      lastmod: new Date().toISOString(),
    },
    {
      loc: '/terms',
      changefreq: 'monthly',
      priority: 0.5,
      lastmod: new Date().toISOString(),
    },
    {
      loc: '/disclaimer',
      changefreq: 'monthly',
      priority: 0.4,
      lastmod: new Date().toISOString(),
    },
    {
      loc: '/refund-policy',
      changefreq: 'monthly',
      priority: 0.4,
      lastmod: new Date().toISOString(),
    },
    {
      loc: '/support',
      changefreq: 'monthly',
      priority: 0.6,
      lastmod: new Date().toISOString(),
    },
  ],
}
