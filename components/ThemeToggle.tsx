'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

const CYCLE: Theme[] = ['light', 'dark', 'system']

const ICONS: Record<Theme, React.ReactNode> = {
  light: <Sun size={14} />,
  dark: <Moon size={14} />,
  system: <Monitor size={14} />,
}

const TITLES: Record<Theme, string> = {
  light: 'Light mode',
  dark: 'Dark mode',
  system: 'System mode',
}

function applyTheme(theme: Theme) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
  if (theme === 'system') {
    localStorage.removeItem('theme')
  } else {
    localStorage.setItem('theme', theme)
  }
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    setTheme(stored === 'light' || stored === 'dark' ? stored : 'system')

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        document.documentElement.classList.toggle('dark', e.matches)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggle = () => {
    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]
    const apply = () => {
      setTheme(next)
      applyTheme(next)
    }
    if (!document.startViewTransition) {
      apply()
      return
    }
    document.documentElement.dataset.themeTransition = ''
    const t = document.startViewTransition(apply)
    t.finished.finally(() => delete document.documentElement.dataset.themeTransition)
  }

  return (
    <button
      onClick={toggle}
      title={`${TITLES[theme]} — click to switch`}
      className={`flex items-center justify-center px-2.5 py-1.5 rounded-lg border transition ${className}`}
    >
      {ICONS[theme]}
    </button>
  )
}
