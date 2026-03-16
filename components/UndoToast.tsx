'use client'

import { useEffect, useState } from 'react'
import { Undo2 } from 'lucide-react'

interface Props {
  message: string
  onUndo: () => void
  onExpire: () => void
  duration?: number
}

export default function UndoToast({ message, onUndo, onExpire, duration = 5000 }: Props) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const start = Date.now()
    const timer = setTimeout(onExpire, duration)
    const interval = setInterval(() => {
      setProgress(Math.max(0, 100 - ((Date.now() - start) / duration) * 100))
    }, 50)
    return () => { clearTimeout(timer); clearInterval(interval) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 dark:bg-gray-700 text-white rounded-xl shadow-2xl overflow-hidden min-w-[300px]">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-sm flex-1">{message}</span>
        <button
          onClick={onUndo}
          className="flex items-center gap-1.5 text-sm font-semibold text-blue-400 hover:text-blue-300 transition shrink-0"
        >
          <Undo2 size={13} /> Undo
        </button>
      </div>
      <div
        className="h-0.5 bg-blue-500 transition-[width] duration-75"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
