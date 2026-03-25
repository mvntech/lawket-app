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
    credits: 50,
    priceUSD: 9,
    pricePKR: 2500,
    variantId: process.env.LEMONSQUEEZY_VARIANT_STARTER ?? '',
    isPopular: false,
    description: 'Perfect for trying out',
    perCreditPKR: 50,
  },
  {
    id: 'standard',
    name: 'Standard',
    credits: 100,
    priceUSD: 17,
    pricePKR: 4750,
    originalPricePKR: 5000,
    discountPercent: 5,
    discountLabel: '5% off',
    variantId: process.env.LEMONSQUEEZY_VARIANT_STANDARD ?? '',
    isPopular: true,
    description: 'Best for active lawyers',
    perCreditPKR: 47.5,
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 500,
    priceUSD: 80,
    pricePKR: 22500,
    originalPricePKR: 25000,
    discountPercent: 10,
    discountLabel: '10% off',
    variantId: process.env.LEMONSQUEEZY_VARIANT_PRO ?? '',
    isPopular: false,
    description: 'Maximum value',
    perCreditPKR: 45,
  },
]
