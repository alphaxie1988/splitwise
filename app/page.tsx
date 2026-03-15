'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CreateSessionModal from '@/components/CreateSessionModal'

export default function Home() {
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">SplitEasy</h1>
        <p className="text-gray-500 mb-8">
          Split expenses with friends — no sign-up required.
          <br />
          Just create a session and share the link.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg text-base font-medium hover:bg-blue-700 transition"
        >
          Create New Session
        </button>
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
