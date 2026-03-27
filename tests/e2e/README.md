# E2E test setup

E2E tests run against a real next.js server and a real supabase development project.

## prerequisites

1. create `tests/e2e/.env.test` with:

```env
TEST_EMAIL=your-test-email@example.com
TEST_PASSWORD=yourpassword@1234
```

these must be credentials for a real supabase account in your **development** project.

## running E2E tests

```bash
# start the app first
pnpm build && pnpm start

# then in another terminal:
pnpm test:e2e

# run headed (visible browser):
pnpm test:e2e:headed

# run only mobile Safari (iPhone 14):
pnpm test:e2e:mobile
```

## notes

- tests run sequentially (`workers: 1`) to avoid auth state conflicts
- screenshots and videos are saved on failure to `playwright-report/`
- on CI, test credentials are injected via GitHub Secrets (`TEST_EMAIL`, `TEST_PASSWORD`)
- the `tests/e2e/.env.test` file is gitignored - never commit real credentials
