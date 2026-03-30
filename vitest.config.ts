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
      include: [
        'src/services/auth.service.ts',
        'src/services/cases.service.ts',
        'src/services/contacts.service.ts',
        'src/services/deadlines.service.ts',
        'src/services/documents.service.ts',
        'src/services/hearings.service.ts',
        'src/services/settings.service.ts',
        'src/lib/credits/constants.ts',
        'src/lib/credits/credits.ts',
        'src/lib/ai/rate-limiter.ts',
        'src/lib/validations/ai.schema.ts',
        'src/lib/validations/document.schema.ts',
      ],
      exclude: [
        'src/**/*.d.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
