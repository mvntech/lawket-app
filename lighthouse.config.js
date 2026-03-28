/** @type {import('lighthouse').Config} */
export default {
  extends: 'lighthouse:default',
  settings: {
    // target mobile
    formFactor: 'mobile',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 4,
    },
    screenEmulation: {
      mobile: true,
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      disabled: false,
    },
    // audit categories (all enabled)
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
  },
  // custom thresholds matching
  assertions: {
    'categories:pwa': ['error', { minScore: 0.9 }],
    'categories:performance': ['error', { minScore: 0.85 }],
    'categories:accessibility': ['warn', { minScore: 0.9 }],
    'categories:best-practices': ['warn', { minScore: 0.9 }],
    'categories:seo': ['warn', { minScore: 0.9 }],
    // core web vitals
    'first-contentful-paint': ['warn', { maxNumericValue: 2500 }],
    'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
    'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
    'total-blocking-time': ['warn', { maxNumericValue: 300 }],
  },
}
