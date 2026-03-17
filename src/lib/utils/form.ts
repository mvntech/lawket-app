import { zodResolver as _zodResolver } from '@hookform/resolvers/zod'
import type { ZodTypeAny } from 'zod/v3'

// wrapper that resolves zod v3 type incompatibility with @hookform/resolvers
// runtime behavior is identical (only fixes compile time types)
export function zodResolver<T extends ZodTypeAny>(schema: T) {
  return _zodResolver(schema as any)
}
