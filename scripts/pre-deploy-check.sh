#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; exit 1; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo ""
echo "🔍 Lawket Pre-Deploy Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$(date -u)"
echo ""

# 1. typescript
echo "1. TypeScript check..."
if pnpm tsc --noEmit 2>&1; then
  pass "TypeScript clean"
else
  fail "TypeScript errors found"
fi

# 2. lint
echo "2. Lint check..."
if pnpm lint --max-warnings 0 2>&1; then
  pass "Lint clean"
else
  fail "Lint errors found"
fi

# 3. tests
echo "3. Unit tests..."
if pnpm test:run 2>&1; then
  pass "All tests passing"
else
  fail "Tests failed"
fi

# 4. coverage
echo "4. Coverage gate..."
pnpm test:coverage > /dev/null 2>&1
if [ -f "coverage/coverage-summary.json" ]; then
  COVERAGE=$(node -e "
    const r = require('./coverage/coverage-summary.json');
    console.log(r.total.lines.pct);
  ")
  if node -e "process.exit(parseFloat('$COVERAGE') < 70 ? 1 : 0)"; then
    pass "Coverage: ${COVERAGE}%"
  else
    fail "Coverage ${COVERAGE}% below 70%"
  fi
else
  warn "No coverage report found"
fi

# 5. no console.log
echo "5. console.log check..."
if grep -r "console\.log" src/ \
  --include="*.ts" \
  --include="*.tsx" \
  --quiet 2>/dev/null; then
  echo "   Found in:"
  grep -r "console\.log" src/ \
    --include="*.ts" \
    --include="*.tsx" -l
  fail "console.log found in src/"
fi
pass "No console.log"

# 6. no hardcoded secrets
echo "6. Secret check..."
SECRETS_FOUND=0
declare -a PATTERNS=(
  "AI"
  "LEMONSQUEEZY_API_KEY="
  "LEMONSQUEEZY_WEBHOOK_SECRET="
  "VAPID_PRIVATE_KEY="
  "SUPABASE_SERVICE_ROLE"
)
for pattern in "${PATTERNS[@]}"; do
  if grep -r "$pattern" src/ \
    --include="*.ts" \
    --include="*.tsx" \
    --quiet 2>/dev/null; then
    echo "   Found: $pattern"
    SECRETS_FOUND=1
  fi
done
if [ $SECRETS_FOUND -eq 1 ]; then
  fail "Hardcoded secrets in source"
fi
pass "No hardcoded secrets"

# 7. .env.example exists
echo "7. Environment docs..."
if [ ! -f ".env.example" ]; then
  fail ".env.example missing"
fi
pass ".env.example present"

# 8. build
echo "8. Production build..."
if pnpm build 2>&1; then
  pass "Build successful"
else
  fail "Build failed"
fi

# 9. bundle secret scan
echo "9. Bundle secret scan..."
BUNDLE_SECRETS=0
declare -a BUNDLE_PATTERNS=(
  "AI"
  "LEMONSQUEEZY_API_KEY"
  "LEMONSQUEEZY_WEBHOOK_SECRET"
  "VAPID_PRIVATE_KEY"
  "SUPABASE_SERVICE_ROLE"
)
for pattern in "${BUNDLE_PATTERNS[@]}"; do
  if grep -r "$pattern" .next/static/ \
    --quiet 2>/dev/null; then
    echo "   CRITICAL: '$pattern' in bundle!"
    BUNDLE_SECRETS=1
  fi
done
if [ $BUNDLE_SECRETS -eq 1 ]; then
  fail "CRITICAL: Secrets exposed in bundle!"
fi
pass "Bundle is clean"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ All checks passed!${NC}"
echo -e "${GREEN}🚀 Safe to deploy${NC}"
echo ""
