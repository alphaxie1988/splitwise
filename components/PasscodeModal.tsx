'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'

interface Props {
  sessionId: string
  onUnlocked: () => void
}

export default function PasscodeModal({ sessionId, onUnlocked }: Props) {
  const [passcode, setPasscode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      })
      const data = await res.json()
      if (data.ok) {
        localStorage.setItem(`unlockedSession_${sessionId}`, '1')
        onUnlocked()
      } else {
        setError('Incorrect passcode.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={22} className="text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold dark:text-gray-100 mb-1">Session Protected</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Enter the passcode to view this session.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input autoFocus type="text" value={passcode} onChange={e => setPasscode(e.target.value)}
            placeholder="Enter passcode"
            className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-center tracking-widest bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading || !passcode}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition">
            {loading ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  )
}
