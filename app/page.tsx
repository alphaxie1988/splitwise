'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Outfit } from 'next/font/google'
import { Plus, Clock, Users, ArrowRight, LogIn, LogOut, Archive, ArchiveRestore, ChevronDown, ShieldCheck, Zap, Globe, Calculator, ScrollText, Share2, Smartphone } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-browser'
import CreateSessionModal from '@/components/CreateSessionModal'
import ThemeToggle from '@/components/ThemeToggle'
import InstallPWA from '@/components/InstallPWA'

const outfit = Outfit({ subsets: ['latin'], weight: ['700', '800'] })

interface RecentSession {
  id: string
  name: string
  members: string[]
  lastVisited: string
  isArchived?: boolean
}

// localStorage helpers for guest users
function getGuestArchivedIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem('archivedSessions') ?? '[]')) } catch { return new Set() }
}
function saveGuestArchivedIds(ids: Set<string>) {
  localStorage.setItem('archivedSessions', JSON.stringify(Array.from(ids)))
}

export default function Home() {
  const [showModal, setShowModal] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [guestArchivedIds, setGuestArchivedIds] = useState<Set<string>>(new Set())
  const [showArchived, setShowArchived] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const loadSessions = async (loggedIn: boolean) => {
    setSessionsLoading(true)
    if (loggedIn) {
      const res = await fetch(`/api/user/sessions?t=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json()
      setRecentSessions(data.sessions ?? [])
    } else {
      const stored = JSON.parse(localStorage.getItem('recentSessions') ?? '[]')
      setRecentSessions(stored)
    }
    setSessionsLoading(false)
  }

  useEffect(() => {
    setGuestArchivedIds(getGuestArchivedIds())
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      loadSessions(!!user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      loadSessions(!!u)
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignIn = async () => {
    setAuthLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/` },
    })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const toggleArchive = async (e: React.MouseEvent, id: string, currentlyArchived: boolean) => {
    e.stopPropagation()
    if (user) {
      setRecentSessions(prev => prev.map(s => s.id === id ? { ...s, isArchived: !currentlyArchived } : s))
      await fetch('/api/user/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: id, is_archived: !currentlyArchived }),
      })
    } else {
      setGuestArchivedIds(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        saveGuestArchivedIds(next)
        return next
      })
    }
  }

  function formatRelative(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const isArchived = (s: RecentSession) =>
    user ? (s.isArchived ?? false) : guestArchivedIds.has(s.id)

  const activeSessions = recentSessions.filter(s => !isArchived(s))
  const archivedSessions = recentSessions.filter(s => isArchived(s))

  const SessionCard = ({ s }: { s: RecentSession }) => {
    const archived = isArchived(s)
    return (
      <div
        onClick={() => router.push(`/session/${s.id}`)}
        className="w-full bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/40 rounded-xl px-4 py-3.5 text-left hover:bg-gray-100 dark:hover:bg-gray-900/60 hover:border-gray-200 dark:hover:border-gray-600 transition-all flex items-center justify-between group cursor-pointer"
      >
        <div className="min-w-0 flex-1">
          <p className={`font-medium truncate ${archived ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>{s.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
            <Users size={10} />
            <span className="truncate">{s.members.join(', ')}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className="text-xs text-gray-400 dark:text-gray-500">{formatRelative(s.lastVisited)}</span>
          <button
            onClick={e => toggleArchive(e, s.id, archived)}
            title={archived ? 'Unarchive' : 'Archive'}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            {archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
          </button>
          <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen dot-grid-bg bg-gray-50 dark:bg-[#111111]">

      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#111111]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/icon.svg" alt="Splitwise" className="w-7 h-7 rounded-lg" />
            <span className="font-bold text-base tracking-tight text-gray-900 dark:text-white">Splitwise</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800" />
            {user ? (
              <button onClick={handleSignOut}
                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <LogOut size={12} /> Sign Out
              </button>
            ) : (
              <button onClick={handleSignIn} disabled={authLoading}
                className="flex items-center gap-1 text-xs text-white bg-blue-600 rounded-lg px-2.5 py-1.5 hover:bg-blue-700 disabled:opacity-50 transition">
                <LogIn size={12} /> {authLoading ? '…' : 'Sign In'}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16 pb-12 px-4 text-center overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[520px] h-[320px] bg-blue-400/8 dark:bg-blue-500/6 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-500/20 mb-5">
            Free · No account required
          </span>

          <h1 className={`${outfit.className} text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.08] text-gray-900 dark:text-white mb-4`}>
            Split expenses,<br />
            <span className="text-blue-600 dark:text-blue-400">not friendships.</span>
          </h1>

          <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-xs mx-auto mb-8 leading-relaxed">
            Track shared costs with anyone — trips, dinners, housemates. Settle up in seconds.
          </p>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold rounded-xl px-6 py-3 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30">
            <Plus size={16} strokeWidth={2.5} />
            New Session
          </button>

          {user && (
            <div className="mt-5 flex items-center justify-center gap-2">
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">{user.email}</p>
              {user.email === 'alphaxie1988@gmail.com' && (
                <button onClick={() => router.push('/admin')} title="Admin"
                  className="text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition">
                  <ShieldCheck size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Session panel */}
      <div className="max-w-md mx-auto px-4 pb-16">
        <InstallPWA />

        <div className="bg-white dark:bg-gray-800/80 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/60 overflow-hidden">

          {/* Recent sessions header */}
          <div className="flex items-center gap-1.5 px-4 pt-4 pb-2.5 border-b border-gray-100 dark:border-gray-700/50">
            <Clock size={11} className="text-gray-400 dark:text-gray-500" />
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Recent Sessions</span>
          </div>

          <div className="p-3">
            {sessionsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700/40 rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : activeSessions.length === 0 ? (
              <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">No sessions yet. Create one above!</p>
            ) : (
              <div className="space-y-2">
                {activeSessions.map(s => <SessionCard key={s.id} s={s} />)}
              </div>
            )}
          </div>

          {/* Archived sessions */}
          {archivedSessions.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-700/50 px-3 py-3">
              <button
                onClick={() => setShowArchived(v => !v)}
                className="w-full flex items-center justify-between text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 mb-1 hover:text-gray-500 dark:hover:text-gray-400 transition"
              >
                <span className="flex items-center gap-1.5"><Archive size={11} /> Archived ({archivedSessions.length})</span>
                <ChevronDown size={12} className={`transition-transform duration-300 ${showArchived ? 'rotate-180' : ''}`} />
              </button>
              <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${showArchived ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-2 pt-2 pb-1">
                    {archivedSessions.map(s => <SessionCard key={s.id} s={s} />)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <CreateSessionModal
          onClose={() => setShowModal(false)}
          onCreated={id => { setShowModal(false); router.push(`/session/${id}`) }}
        />
      )}

      {/* Features Section */}
      <section className="border-t border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800/40 py-20">
        <div className="max-w-4xl mx-auto px-6">

          {/* Section header — editorial, left-aligned on desktop */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-12">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-blue-500 dark:text-blue-400 mb-3">Why Splitwise</p>
              <h2 className={`${outfit.className} text-3xl font-extrabold text-gray-900 dark:text-white leading-tight`}>
                Everything you need<br className="hidden sm:block" /> to split fairly.
              </h2>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-400 dark:text-gray-500 lg:text-right shrink-0 pb-1">
              {['Free forever', 'No account needed', '150+ currencies', 'PWA-ready'].map(s => (
                <span key={s} className="flex items-center gap-1">
                  <span className="text-blue-400 dark:text-blue-500">✓</span> {s}
                </span>
              ))}
            </div>
          </div>

          {/* Feature cards — stacked, taller */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Zap,
                color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
                title: 'Instant Setup',
                desc: 'No sign-up required. Create a session in seconds and share the link — anyone can join immediately.',
              },
              {
                icon: Calculator,
                color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
                title: 'Smart Settlements',
                desc: 'Our algorithm calculates the minimum number of payments needed to settle all debts fairly.',
              },
              {
                icon: Globe,
                color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
                title: 'Multi-Currency',
                desc: 'Add expenses in any currency. Live exchange rates keep everything balanced in a single base currency.',
              },
              {
                icon: ScrollText,
                color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10',
                title: 'Full Audit Log',
                desc: 'Every change is recorded. See exactly who added, edited, or deleted anything and when.',
              },
              {
                icon: Share2,
                color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10',
                title: 'Share Anywhere',
                desc: 'Share your session via link, WhatsApp, Telegram, or QR code — no installs needed on either end.',
              },
              {
                icon: Smartphone,
                color: 'text-teal-500 bg-teal-50 dark:bg-teal-500/10',
                title: 'Works on Any Device',
                desc: 'Install as a PWA for quick home-screen access. Fast, responsive, and feels native on mobile.',
              },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="p-6 rounded-2xl border border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800/90 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm transition-all">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${color}`}>
                  <Icon size={20} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA closing section */}
      <section className="relative bg-gray-900 dark:bg-[#0a0a0a] py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[560px] h-[320px] bg-blue-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-md mx-auto">
          <h2 className={`${outfit.className} text-4xl sm:text-5xl font-extrabold text-white leading-[1.1] tracking-tight mb-4`}>
            Start splitting<br />in seconds.
          </h2>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            No sign-up. No app install. Create a session and share the link — your group is ready instantly.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 active:scale-[0.98] text-white text-sm font-semibold rounded-xl px-6 py-3 transition-all shadow-lg shadow-blue-500/25">
            <Plus size={16} strokeWidth={2.5} />
            Create a free session
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 dark:bg-[#0a0a0a] border-t border-gray-800 py-7 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <img src="/icon.svg" alt="" className="w-5 h-5 rounded-md" />
            <span className="text-sm font-semibold text-white">Splitwise</span>
            <span className="text-[10px] text-gray-600 border border-gray-800 rounded px-1.5 py-0.5 ml-1">v1.0.0</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {['Next.js', 'Supabase', 'Tailwind CSS', 'Frankfurter API'].map(t => (
              <span key={t} className="text-[11px] text-gray-500 bg-gray-900 border border-gray-800 rounded-md px-2 py-0.5">{t}</span>
            ))}
          </div>
          <p className="text-xs text-gray-600">Split expenses, not friendships.</p>
        </div>
      </footer>
    </div>
  )
}
