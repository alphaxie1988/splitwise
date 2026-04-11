'use client'

import { useState, useEffect } from 'react'
import { Download, X, Share, MoreVertical } from 'lucide-react'

type Platform = 'ios' | 'android' | 'other' | null

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPWA() {
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }
    // Dismissed before
    if (localStorage.getItem('pwa-install-dismissed') === '1') {
      setDismissed(true)
      return
    }

    const ua = navigator.userAgent
    const isIOS = /iphone|ipad|ipod/i.test(ua)
    const isAndroid = /android/i.test(ua)

    if (isIOS) {
      setPlatform('ios')
    } else if (isAndroid) {
      setPlatform('android')
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setPlatform('android')
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', '1')
    setDismissed(true)
    setShowGuide(false)
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
  }

  if (installed || dismissed || !platform) return null

  // ── Android: native install prompt available ──────────────────────────────
  if (platform === 'android' && deferredPrompt) {
    return (
      <div className="mt-4 rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-gray-800 px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Download size={15} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Add to Home Screen</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Install for quick access, works offline</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstall}
            className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition"
          >
            Install
          </button>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
            <X size={15} />
          </button>
        </div>
      </div>
    )
  }

  // ── Android: no native prompt — show manual guide ─────────────────────────
  if (platform === 'android' && !deferredPrompt) {
    return (
      <>
        <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-gray-900 dark:bg-white flex items-center justify-center">
              <Download size={15} className="text-white dark:text-gray-900" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Add to Home Screen</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Install for quick access, works offline</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowGuide(true)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition"
            >
              How to
            </button>
            <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
              <X size={15} />
            </button>
          </div>
        </div>

        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 pb-4 sm:pb-0">
            <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="/icon.svg" alt="" className="w-10 h-10 rounded-xl shadow-sm" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">Install Splitwise</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Add to your Android home screen</p>
                  </div>
                </div>
                <button onClick={() => setShowGuide(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
                  <X size={18} />
                </button>
              </div>
              <div className="px-5 py-5 space-y-4">
                <Step
                  number={1}
                  icon={
                    <div className="w-7 h-7 rounded-md bg-gray-800 dark:bg-gray-200 flex items-center justify-center">
                      <MoreVertical size={14} className="text-white dark:text-gray-900" />
                    </div>
                  }
                  title="Tap the menu button"
                  description='Tap the three-dot menu (⋮) in the top-right corner of Chrome'
                />
                <Step
                  number={2}
                  icon={
                    <div className="w-7 h-7 rounded-md bg-gray-800 dark:bg-gray-200 flex items-center justify-center">
                      <PlusSquareIcon className="text-white dark:text-gray-900" />
                    </div>
                  }
                  title='"Add to Home Screen"'
                  description='Tap this option from the menu'
                />
                <Step
                  number={3}
                  icon={
                    <div className="w-7 h-7 rounded-md bg-green-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  }
                  title='Tap "Add"'
                  description='Confirm to add the app to your home screen'
                />
              </div>
              <div className="px-5 pb-5">
                <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                  Only works in <span className="font-medium text-gray-500 dark:text-gray-400">Chrome</span> on Android.
                </p>
                <button
                  onClick={() => { setShowGuide(false); handleDismiss() }}
                  className="mt-3 w-full text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition py-1"
                >
                  Don't show again
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // ── iOS: manual guide ─────────────────────────────────────────────────────
  if (platform === 'ios') {
    return (
      <>
        <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-gray-900 dark:bg-white flex items-center justify-center">
              <Download size={15} className="text-white dark:text-gray-900" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Add to Home Screen</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Install for quick access, works offline</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowGuide(true)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition"
            >
              How to
            </button>
            <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* iOS guide modal */}
        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 pb-4 sm:pb-0">
            <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">

              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="/icon.svg" alt="" className="w-10 h-10 rounded-xl shadow-sm" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">Install Splitwise</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Add to your iPhone home screen</p>
                  </div>
                </div>
                <button onClick={() => setShowGuide(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
                  <X size={18} />
                </button>
              </div>

              {/* Steps */}
              <div className="px-5 py-5 space-y-4">
                <Step
                  number={1}
                  icon={
                    <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center">
                      <Share size={14} className="text-white" />
                    </div>
                  }
                  title='Tap the Share button'
                  description='The share icon is at the bottom of your Safari browser bar'
                />
                <Step
                  number={2}
                  icon={
                    <div className="w-7 h-7 rounded-md bg-gray-800 dark:bg-gray-200 flex items-center justify-center">
                      <PlusSquareIcon />
                    </div>
                  }
                  title='"Add to Home Screen"'
                  description='Scroll down in the share sheet and tap this option'
                />
                <Step
                  number={3}
                  icon={
                    <div className="w-7 h-7 rounded-md bg-green-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  }
                  title='Tap "Add"'
                  description='Confirm in the top-right corner to add the app'
                />
              </div>

              {/* Footer hint */}
              <div className="px-5 pb-5">
                <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                  Only works in <span className="font-medium text-gray-500 dark:text-gray-400">Safari</span> on iOS. Switch browsers if needed.
                </p>
                <button
                  onClick={() => { setShowGuide(false); handleDismiss() }}
                  className="mt-3 w-full text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition py-1"
                >
                  Don't show again
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return null
}

function Step({
  number,
  icon,
  title,
  description,
}: {
  number: number
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="shrink-0 w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center mt-0.5">
        <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{number}</span>
      </div>
      <div className="flex items-start gap-3 flex-1">
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  )
}

// Custom plus-in-square icon matching iOS/Android "Add to Home Screen" symbol
function PlusSquareIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'text-white dark:text-gray-800'}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}
