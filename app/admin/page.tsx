'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, Users, Search, Trash2, LogIn } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-browser'
import ThemeToggle from '@/components/ThemeToggle'

const ADMIN_EMAIL = 'alphaxie1988@gmail.com'

interface AdminSession {
  id: string
  name: string
  created_at: string
  member_count: number
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [search, setSearch] = useState('')
  // Step 2: armed row (shows inline "Delete?" prompt)
  const [armedId, setArmedId] = useState<string | null>(null)
  // Step 3: final modal
  const [modalSession, setModalSession] = useState<AdminSession | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (!user || user.email !== ADMIN_EMAIL) {
        setForbidden(true)
        setLoading(false)
        return
      }
      fetch('/api/admin/sessions')
        .then(r => r.json())
        .then(data => {
          setSessions(data.sessions ?? [])
          setLoading(false)
        })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignIn = async () => {
    setAuthLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/admin` },
    })
  }

  const handleDelete = async () => {
    if (!modalSession) return
    setDeleting(true)
    const res = await fetch(`/api/admin/sessions/${modalSession.id}`, { method: 'DELETE' })
    if (res.ok) {
      setSessions(prev => prev.filter(s => s.id !== modalSession.id))
    }
    setDeleting(false)
    setModalSession(null)
    setArmedId(null)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-SG', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  const filtered = sessions.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400 dark:text-gray-500 text-sm">Loading…</p>
      </main>
    )
  }

  if (forbidden) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-700 dark:text-gray-300 font-medium">
          {user ? 'Access denied.' : 'Sign in to access the admin panel.'}
        </p>
        {!user && (
          <button onClick={handleSignIn} disabled={authLoading}
            className="flex items-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg px-4 py-2 transition">
            <LogIn size={14} /> {authLoading ? 'Signing in…' : 'Sign in with Google'}
          </button>
        )}
        <button onClick={() => router.push('/')}
          className="text-sm text-gray-400 dark:text-gray-500 hover:underline">
          Go home
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admin</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500">{user?.email}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Stats */}
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl px-5 py-4 mb-6">
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold mb-1">Total Sessions</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{sessions.length}</p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or ID…"
            className="w-full pl-8 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Session list */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-10">No sessions found.</p>
          ) : (
            filtered.map(s => (
              <div key={s.id}
                className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{s.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate">{s.id}</p>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 shrink-0">
                      <Users size={10} /> {s.member_count}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{formatDate(s.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Step 2 — armed: show inline confirm/cancel */}
                  {armedId === s.id ? (
                    <>
                      <button onClick={() => setArmedId(null)}
                        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition px-2 py-1">
                        Cancel
                      </button>
                      <button onClick={() => { setModalSession(s); setArmedId(null) }}
                        className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg px-3 py-1 transition">
                        Delete?
                      </button>
                    </>
                  ) : (
                    /* Step 1 — idle trash icon */
                    <button onClick={() => setArmedId(s.id)}
                      title="Delete session"
                      className="text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 transition">
                      <Trash2 size={15} />
                    </button>
                  )}

                  <a href={`/session/${s.id}`} target="_blank" rel="noopener noreferrer"
                    className="text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 transition">
                    <ExternalLink size={15} />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Step 3 — final confirmation modal */}
      {modalSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete session?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              You are about to permanently delete:
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 truncate">
              {modalSession.name}
            </p>
            <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mb-5 truncate">
              {modalSession.id}
            </p>
            <p className="text-sm text-red-500 font-medium mb-6">
              This will delete all members, expenses, and settlements. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModalSession(null)} disabled={deleting}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
