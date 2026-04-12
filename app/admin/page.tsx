'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, Users, Search, Trash2, LogIn, Database } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-browser'
import ThemeToggle from '@/components/ThemeToggle'

const ADMIN_EMAIL = 'alphaxie1988@gmail.com'

interface AdminSession {
  id: string
  name: string
  created_at: string
  is_settled: boolean
  member_count: number
  editors: string[]
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [armedId, setArmedId] = useState<string | null>(null)
  const [modalSession, setModalSession] = useState<AdminSession | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
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
    setDeleteError(null)
    const res = await fetch(`/api/admin/sessions/${modalSession.id}`, { method: 'DELETE' })
    if (res.ok) {
      setSessions(prev => prev.filter(s => s.id !== modalSession.id))
      setModalSession(null)
      setArmedId(null)
    } else {
      const data = await res.json()
      setDeleteError(data.error ?? 'Delete failed')
    }
    setDeleting(false)
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
      <div className="min-h-screen dot-grid-bg bg-gray-50 dark:bg-[#111111] flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
          <span className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          Loading…
        </div>
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="min-h-screen dot-grid-bg bg-gray-50 dark:bg-[#111111] flex flex-col items-center justify-center gap-4 px-4">
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/60 shadow-sm p-8 text-center max-w-sm w-full">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Database size={20} className="text-red-400" />
          </div>
          <p className="text-gray-800 dark:text-gray-200 font-semibold mb-1">
            {user ? 'Access Denied' : 'Admin Access Required'}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">
            {user ? 'Your account does not have admin privileges.' : 'Sign in with your admin account to continue.'}
          </p>
          {!user && (
            <button onClick={handleSignIn} disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl px-4 py-2.5 transition font-medium mb-3">
              <LogIn size={14} /> {authLoading ? 'Signing in…' : 'Sign in with Google'}
            </button>
          )}
          <button onClick={() => router.push('/')}
            className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition">
            ← Back to home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen dot-grid-bg bg-gray-50 dark:bg-[#111111]">

      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#111111]/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Admin</h1>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 -mt-0.5">{user?.email}</p>
            </div>
          </div>
          <ThemeToggle className="text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800" />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Stats */}
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/60 px-6 py-5 mb-6 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
            <Database size={18} className="text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Total Sessions</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">{sessions.length}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or ID…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/60 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        {/* Session list */}
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-12">No sessions found.</p>
        ) : (
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
            {filtered.map((s, idx) => (
              <div key={s.id}
                className={`px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                  idx > 0 ? 'border-t border-gray-100 dark:border-gray-700/40' : ''
                }`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{s.name}</p>
                    {s.is_settled && (
                      <span className="shrink-0 text-[10px] font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-full px-2 py-0.5">
                        Settled
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate max-w-[200px]">{s.id}</p>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1 shrink-0">
                      <Users size={10} /> {s.member_count}
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">{formatDate(s.created_at)}</span>
                  </div>
                  {s.editors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {s.editors.map(email => (
                        <span key={email} className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/60 rounded px-1.5 py-0.5">
                          {email}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {armedId === s.id ? (
                    <>
                      <button onClick={() => setArmedId(null)}
                        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition px-2 py-1">
                        Cancel
                      </button>
                      <button onClick={() => { setModalSession(s); setArmedId(null) }}
                        className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg px-3 py-1.5 transition">
                        Delete?
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setArmedId(s.id)} title="Delete session"
                      className="text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 transition p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                  <a href={`/session/${s.id}`} target="_blank" rel="noopener noreferrer"
                    className="text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 transition p-1">
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {modalSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800/95 rounded-2xl shadow-2xl border border-gray-200/60 dark:border-gray-700/50 w-full max-w-sm p-6">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 size={16} className="text-red-500" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Delete session?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              This will permanently delete <span className="font-medium text-gray-800 dark:text-gray-200">{modalSession.name}</span> along with all members, expenses, and settlements.
            </p>
            <p className="text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2 mb-4 truncate">
              {modalSession.id}
            </p>
            <p className="text-xs font-semibold text-red-500 dark:text-red-400 mb-5">This cannot be undone.</p>

            {deleteError && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl px-3 py-2 mb-4">
                <p className="text-xs text-red-600 dark:text-red-400">{deleteError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setModalSession(null); setDeleteError(null) }} disabled={deleting}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition disabled:opacity-50 shadow-sm shadow-red-500/20">
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
