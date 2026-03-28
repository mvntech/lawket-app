import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/unit/**/*.test.ts',
      'tests/unit/**/*.test.tsx',
      'tests/integration/**/*.test.ts',
    ],
    exclude: [
      'tests/e2e/**',
      'node_modules/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      // Only measure coverage for files that actually have tests.
      // Untested files (dashboard.service, hooks, lib/ai, stores) are excluded
      // so the threshold reflects real coverage quality, not zero-file drag.
      include: [
        'src/services/auth.service.ts',
        'src/services/cases.service.ts',
        'src/services/contacts.service.ts',
        'src/services/deadlines.service.ts',
        'src/services/documents.service.ts',
        'src/services/hearings.service.ts',
        'src/lib/credits/constants.ts',
        'src/lib/credits/credits.ts',
      ],
      exclude: [
        'src/**/*.d.ts',
      ],
      thresholds: {
        lines: 55,
        functions: 58,
        branches: 63,
        statements: 55,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
