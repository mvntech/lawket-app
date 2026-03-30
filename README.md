# lawket

> an ai-powered case management for solo lawyers. your law, in your pocket.

[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-blue)]()

---

## table of contents
- [introduction](#introduction)
- [prerequisites](#prerequisites)
- [installation](#installation)
- [usage](#usage)
- [configuration](#configuration)
- [api documentation](#api-documentation)
- [testing](#testing)
- [contributing](#contributing)
- [license](#license)

---

## introduction
lawket is a comprehensive ai-powered case management platform designed specifically for solo lawyers. it streamlines legal workflows by providing real-time case history, intelligent hearing reminders, and ai-driven document analysis, all accessible via a mobile-friendly pwa.

**key features:**
- **case management:** track full case histories and client interactions.
- **ai assistant:** case-specific gemini ai context for research and drafting.
- **document analysis:** automated ai analysis of legal documents.
- **calendar & reminders:** hearing reminders and scheduling.
- **credit-based ai:** scalable usage with credits via lemonsqueezy.
- **pwa support:** works offline and installable on ios and android.

## prerequisites
before running the project, ensure you have the following installed and configured:
- [node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (recommended)
- [supabase account](https://supabase.com/) (database & auth)
- [gemini api key](https://aistudio.google.com/) (gemini ai)
- [lemonsqueezy store](https://www.lemonsqueezy.com/) (payments)

## installation
follow these steps to set up lawket locally:

```bash
# clone the repository
git clone https://github.com/mvntech/lawket-app.git
cd lawket-app

# install dependencies
pnpm install

# set up environment variables
cp .env.example .env.local
```

## usage
run the development server for both frontend and backend functionality:

```bash
# start development server
pnpm dev

# build for production
pnpm build

# start production server
pnpm start
```
access the application at `http://localhost:3000`.

## configuration
### environment variables (`.env.local`)

| variable | description | default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | supabase project url | `null` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | supabase anonymous client key | `null` |
| `GEMINI_API_KEY` | api key for gemini ai | `null` |
| `LEMONSQUEEZY_API_KEY` | api key for lemonsqueezy payments | `null` |
| `NEXT_PUBLIC_APP_URL` | base url of the application | `http://localhost:3000` |

refer to `.env.example` for the complete list of available configurations including sentry, posthog, and vapid keys.

## api documentation
the project includes several internal api endpoints (next.js edge/server routes):

- `post /api/ai/chat`: interactive chat sessions with gemini ai.
- `post /api/ai/analyze-document`: extracts key information from uploaded pdfs.
- `post /api/credits/checkout`: initiates the credit purchase flow.
- `get /api/credits/balance`: retrieves the user's current ai credit balance.
- `post /api/push/subscribe`: manages web push notification subscriptions.

## testing
run the comprehensive test suite to ensure platform stability:

```bash
# run unit tests
pnpm test:run

# run e2e tests with playwright
pnpm test:e2e

# run tests with coverage report
pnpm test:coverage

# pre-deploy checks
pnpm pre-deploy
```

## contributing
we welcome contributions to lawket! to contribute:
1. fork the repository.
2. create your feature branch (`git checkout -b feature/amazing-feature`).
3. commit your changes (`git commit -m 'add amazing feature'`).
4. push to the branch (`git push origin feature/amazing-feature`).
5. open a pull request.

## license
distributed under the mit license. see `LICENSE` for more information.

created by [muntaha / mvntech] with love!♡
