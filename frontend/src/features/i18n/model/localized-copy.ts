import type { AppLocale } from '@/shared/api/runtime'

export type LocalizedCopy<T> = Record<AppLocale, T>

export function resolveLocalizedCopy<T>(copy: LocalizedCopy<T>, locale: AppLocale) {
  return copy[locale]
}
