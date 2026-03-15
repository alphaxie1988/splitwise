'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Clock, Users, ArrowRight } from 'lucide-react'
import CreateSessionModal from '@/components/CreateSessionModal'

interface RecentSession {
  id: string
  name: string
  members: string[]
  lastVisited: string
}

export default function Home() {
  const [showModal, setShowModal] = useState(false)
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const router = useRouter()

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('recentSessions') ?? '[]')
    setRecentSessions(stored)
  }, [])

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
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">SplitEasy</h1>
          <p className="text-gray-500 text-sm">
            Split expenses with friends — no sign-up required.
          </p>
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
        {recentSessions.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Clock size={12} />
              Recent Sessions
            </h2>
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
          </div>
        )}
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
