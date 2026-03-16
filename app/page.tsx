'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Clock, Users, ArrowRight, LogIn, LogOut, Archive, ArchiveRestore, ChevronDown, ChevronUp } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-browser'
import CreateSessionModal from '@/components/CreateSessionModal'
import ThemeToggle from '@/components/ThemeToggle'

interface RecentSession {
  id: string
  name: string
  members: string[]
  lastVisited: string
}

function getArchivedIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem('archivedSessions') ?? '[]')) } catch { return new Set() }
}

function saveArchivedIds(ids: Set<string>) {
  localStorage.setItem('archivedSessions', JSON.stringify(Array.from(ids)))
}

export default function Home() {
  const [showModal, setShowModal] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set())
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
    setArchivedIds(getArchivedIds())
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

  const toggleArchive = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setArchivedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      saveArchivedIds(next)
      return next
    })
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

  const activeSessions = recentSessions.filter(s => !archivedIds.has(s.id))
  const archivedSessions = recentSessions.filter(s => archivedIds.has(s.id))

  const SessionCard = ({ s, archived }: { s: RecentSession; archived: boolean }) => (
    <div
      onClick={() => router.push(`/session/${s.id}`)}
      className="w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-between group cursor-pointer"
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
          onClick={e => toggleArchive(e, s.id)}
          title={archived ? 'Unarchive' : 'Archive'}
          className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition opacity-0 group-hover:opacity-100"
        >
          {archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
        </button>
        <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 transition" />
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto px-4 py-12">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="Splitwise" className="w-12 h-12 rounded-xl shadow-sm" />
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-1">Splitwise</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Split expenses with friends.</p>
            </div>
          </div>
          <div className="pt-1 flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {user ? (
                <button onClick={handleSignOut}
                  className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 border dark:border-gray-600 rounded-lg px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <LogOut size={12} /> Sign Out
                </button>
              ) : (
                <button onClick={handleSignIn} disabled={authLoading}
                  className="flex items-center gap-1 text-xs text-white bg-blue-600 rounded-lg px-2.5 py-1.5 hover:bg-blue-700 disabled:opacity-50 transition">
                  <LogIn size={12} /> {authLoading ? '…' : 'Sign In'}
                </button>
              )}
            </div>
            {user && <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[160px]">{user.email}</p>}
          </div>
        </div>

        {/* New session button */}
        <button onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-between bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-4 mb-8 transition shadow-sm">
          <div className="flex items-center gap-3">
            <Plus size={20} />
            <div className="text-left">
              <p className="font-semibold">New Session</p>
              <p className="text-blue-200 text-xs">Create a group to track expenses</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-blue-300" />
        </button>

        {/* Active sessions */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Clock size={12} /> Recent Sessions
          </h2>

          {sessionsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : activeSessions.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">No sessions yet. Create one above!</p>
          ) : (
            <div className="space-y-2">
              {activeSessions.map(s => <SessionCard key={s.id} s={s} archived={false} />)}
            </div>
          )}
        </div>

        {/* Archived sessions */}
        {archivedSessions.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowArchived(v => !v)}
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3 hover:text-gray-500 dark:hover:text-gray-400 transition"
            >
              <span className="flex items-center gap-1.5"><Archive size={12} /> Archived ({archivedSessions.length})</span>
              {showArchived ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {showArchived && (
              <div className="space-y-2">
                {archivedSessions.map(s => <SessionCard key={s.id} s={s} archived={true} />)}
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <CreateSessionModal
          onClose={() => setShowModal(false)}
          onCreated={id => { setShowModal(false); router.push(`/session/${id}`) }}
        />
      )}
    </main>
  )
}
