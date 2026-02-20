'use client'
import { useEffect } from 'react'

export function ThemeApplier({ theme }: { theme: 'light' | 'dark' }) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  return null
}
