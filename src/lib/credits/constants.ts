export const SIGNUP_BONUS = 10
export const AD_CREDIT_VALUE = 1
export const MAX_AD_PER_DAY = 3

export const CREDIT_COSTS = {
  'case-summary': 1,
  'hearing-prep': 2,
  'suggest-deadlines': 1,
  'analyze-document': 2,
  'clean-notes': 1,
  'draft-section': 2,
  'chat': 1,
} as const

export type AIFeature = keyof typeof CREDIT_COSTS

export interface CreditPackage {
  id: string
  name: string
  credits: number
  priceUSD: number
  pricePKR: number
  originalPricePKR?: number
  discountPercent?: number
  discountLabel?: string
  variantId: string
  isPopular: boolean
  description: string
  perCreditPKR: number
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 100,
    priceUSD: 4.67,
    pricePKR: 1299,
    originalPricePKR: 1999,
    discountPercent: 35,
    discountLabel: '35% off',
    variantId: process.env.LEMONSQUEEZY_VARIANT_STARTER ?? '',
    isPopular: false,
    description: 'Perfect for trying out',
    perCreditPKR: 13,
  },
  {
    id: 'standard',
    name: 'Standard',
    credits: 300,
    priceUSD: 10.78,
    pricePKR: 2999,
    originalPricePKR: 4999,
    discountPercent: 40,
    discountLabel: '40% off',
    variantId: process.env.LEMONSQUEEZY_VARIANT_STANDARD ?? '',
    isPopular: true,
    description: 'Best for active lawyers',
    perCreditPKR: 10,
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 1000,
    priceUSD: 28.77,
    pricePKR: 7999,
    originalPricePKR: 12999,
    discountPercent: 38,
    discountLabel: '38% off',
    variantId: process.env.LEMONSQUEEZY_VARIANT_PRO ?? '',
    isPopular: false,
    description: 'Maximum value',
    perCreditPKR: 8,
  },
]
