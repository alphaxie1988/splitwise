'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Clock, Users, ArrowRight, LogIn, LogOut } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-browser'
import CreateSessionModal from '@/components/CreateSessionModal'

interface RecentSession {
  id: string
  name: string
  members: string[]
  lastVisited: string
}

export default function Home() {
  const [showModal, setShowModal] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
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

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-12">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="Splitwise" className="w-12 h-12 rounded-xl shadow-sm" />
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-1">Splitwise</h1>
              <p className="text-gray-500 text-sm">Split expenses with friends.</p>
            </div>
          </div>
          <div className="pt-1">
            {user ? (
              <div className="flex flex-col items-end gap-1">
                <p className="text-xs text-gray-500 truncate max-w-[140px]">{user.email}</p>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 text-xs text-gray-500 border rounded-lg px-2.5 py-1.5 hover:bg-gray-100 transition"
                >
                  <LogOut size={12} /> Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={authLoading}
                className="flex items-center gap-1.5 text-sm text-white bg-blue-600 rounded-lg px-3 py-2 hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <LogIn size={14} />
                {authLoading ? 'Signing in…' : 'Sign In'}
              </button>
            )}
          </div>
        </div>

        {/* Create button */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-base font-medium hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Create New Session
        </button>

        {/* Recent sessions */}
        <div className="mt-10">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Clock size={12} />
            {user ? 'Your Sessions' : 'Recent Sessions'}
          </h2>

          {sessionsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recentSessions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              {user ? 'No sessions yet. Create one or visit a shared link.' : 'No recent sessions.'}
            </p>
          ) : (
            <div className="space-y-2">
              {recentSessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/session/${s.id}`)}
                  className="w-full bg-white border rounded-xl px-4 py-3 flex items-center gap-3 hover:border-blue-300 hover:shadow-sm transition text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Users size={10} />
                      {s.members.join(' · ')}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-gray-400">{formatRelative(s.lastVisited)}</p>
                    <ArrowRight size={14} className="text-gray-300 ml-auto mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {showModal && (
        <CreateSessionModal
          onClose={() => setShowModal(false)}
          onCreated={(id) => router.push(`/session/${id}`)}
        />
      )}
    </main>
  )
}
