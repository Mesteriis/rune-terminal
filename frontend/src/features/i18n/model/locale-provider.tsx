import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { requestLocaleSettings, updateLocaleSettings, type AppLocale } from '@/shared/api/runtime'

type LocaleContextValue = {
  errorMessage: string | null
  isLoading: boolean
  isSaving: boolean
  locale: AppLocale
  refresh: () => Promise<void>
  setLocale: (nextLocale: AppLocale) => Promise<void>
  supportedLocales: AppLocale[]
}

const defaultSupportedLocales: AppLocale[] = ['ru', 'en', 'zh-CN', 'es']

const LocaleContext = createContext<LocaleContextValue | null>(null)

function formatLocaleSettingsError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Unable to load language settings.'
}

export function LocaleSettingsProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('ru')
  const [supportedLocales, setSupportedLocales] = useState<AppLocale[]>(defaultSupportedLocales)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const nextSettings = await requestLocaleSettings()
      setLocaleState(nextSettings.settings.locale)
      setSupportedLocales(nextSettings.supported_locales)
    } catch (error) {
      setErrorMessage(formatLocaleSettingsError(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback(
    async (nextLocale: AppLocale) => {
      if (nextLocale === locale) {
        return
      }

      const previousLocale = locale
      setIsSaving(true)
      setErrorMessage(null)
      setLocaleState(nextLocale)

      try {
        const nextSettings = await updateLocaleSettings({ locale: nextLocale })
        setLocaleState(nextSettings.settings.locale)
        setSupportedLocales(nextSettings.supported_locales)
      } catch (error) {
        setLocaleState(previousLocale)
        setErrorMessage(formatLocaleSettingsError(error))
      } finally {
        setIsSaving(false)
      }
    },
    [locale],
  )

  const value = useMemo<LocaleContextValue>(
    () => ({
      errorMessage,
      isLoading,
      isSaving,
      locale,
      refresh,
      setLocale,
      supportedLocales,
    }),
    [errorMessage, isLoading, isSaving, locale, refresh, setLocale, supportedLocales],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useAppLocale() {
  const value = useContext(LocaleContext)
  if (!value) {
    throw new Error('useAppLocale must be used inside LocaleSettingsProvider')
  }
  return value
}
