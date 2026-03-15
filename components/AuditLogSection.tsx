'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { AuditLog } from '@/lib/types'

interface Props {
  sessionId: string
}

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'text-green-700 bg-green-50',
  UPDATE: 'text-blue-700 bg-blue-50',
  DELETE: 'text-red-700 bg-red-50',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function describeLog(log: AuditLog): string {
  const d = log.new_data?.description ?? log.old_data?.description ?? 'expense'
  switch (log.action) {
    case 'CREATE': return `Created "${d}"`
    case 'UPDATE': {
      const changes: string[] = []
      if (log.old_data?.description !== log.new_data?.description)
        changes.push(`description: "${log.old_data?.description}" → "${log.new_data?.description}"`)
      if (log.old_data?.amount !== log.new_data?.amount)
        changes.push(`amount: ${log.old_data?.amount} → ${log.new_data?.amount}`)
      if (log.old_data?.currency_code !== log.new_data?.currency_code)
        changes.push(`currency: ${log.old_data?.currency_code} → ${log.new_data?.currency_code}`)
      return `Updated "${d}"${changes.length ? ` (${changes.join(', ')})` : ''}`
    }
    case 'DELETE': return `Deleted "${d}"`
    default: return `Changed "${d}"`
  }
}

export default function AuditLogSection({ sessionId }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setExpanded(prev => !prev)
    if (!loaded) {
      setLoading(true)
      const res = await fetch(`/api/sessions/${sessionId}/audit`)
      const data = await res.json()
      setLogs(data.logs ?? [])
      setLoaded(true)
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
      >
        <span>Audit Log</span>
        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {expanded && (
        <div className="border-t">
          {loading ? (
            <p className="text-center text-gray-400 text-sm py-6">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">No activity yet.</p>
          ) : (
            <div className="divide-y max-h-72 overflow-y-auto">
              {logs.map(log => (
                <div key={log.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ACTION_STYLES[log.action] ?? 'text-gray-600 bg-gray-50'}`}>
                      {log.action}
                    </span>
                    <span className="text-xs text-gray-500 truncate max-w-[180px]">
                      {log.changed_by_email ?? 'unknown'}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto shrink-0">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{describeLog(log)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
