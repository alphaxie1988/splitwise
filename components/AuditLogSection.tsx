'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { AuditLog } from '@/lib/types'

interface Props {
  sessionId: string
  refreshKey?: number
}

const ACTION_STYLES: Record<string, string> = {
  CREATE:         'text-green-700 bg-green-50 dark:text-green-400 dark:bg-gray-700/50',
  UPDATE:         'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-gray-700/50',
  DELETE:         'text-red-700 bg-red-50 dark:text-red-400 dark:bg-gray-700/50',
  RATE_CHANGE:    'text-orange-700 bg-orange-50 dark:text-orange-400 dark:bg-gray-700/50',
  SETTLE:          'text-green-700 bg-green-50 dark:text-green-400 dark:bg-gray-700/50',
  UNSETTLE:        'text-yellow-700 bg-yellow-50 dark:text-yellow-400 dark:bg-gray-700/50',
  SESSION_UPDATE:  'text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-gray-700/50',
  PAYMENT_CHECK:   'text-teal-700 bg-teal-50 dark:text-teal-400 dark:bg-gray-700/50',
  PAYMENT_UNCHECK: 'text-orange-700 bg-orange-50 dark:text-orange-400 dark:bg-gray-700/50',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
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
    case 'RATE_CHANGE': {
      const code = log.new_data?.currency_code ?? ''
      return `Changed ${code} rate: ${log.old_data?.rate_to_sgd} → ${log.new_data?.rate_to_sgd} SGD`
    }
    case 'SETTLE': return 'Marked session as settled'
    case 'UNSETTLE': return 'Reopened session'
    case 'SESSION_UPDATE': return `Renamed session: "${log.old_data?.name}" → "${log.new_data?.name}"`
    case 'PAYMENT_CHECK': return `Marked payment: ${log.new_data?.from_member} → ${log.new_data?.to_member} (${Number(log.new_data?.amount).toFixed(2)} SGD)`
    case 'PAYMENT_UNCHECK': return `Unmarked payment: ${log.old_data?.from_member} → ${log.old_data?.to_member} (${Number(log.old_data?.amount).toFixed(2)} SGD)`
    default: return `Changed "${d}"`
  }
}

export default function AuditLogSection({ sessionId, refreshKey }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/sessions/${sessionId}/audit?t=${Date.now()}`, { cache: 'no-store' })
    const data = await res.json()
    setLogs(data.logs ?? [])
    setLoading(false)
  }, [sessionId])

  useEffect(() => {
    if (expanded) fetchLogs()
  }, [expanded, refreshKey, fetchLogs])

  return (
    <div className="border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
      >
        <span>Audit Log</span>
        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {expanded && (
        <div className="border-t dark:border-gray-700">
          {loading ? (
            <p className="text-center text-gray-400 text-sm py-6">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">No activity yet.</p>
          ) : (
            <div className="divide-y dark:divide-gray-700 max-h-72 overflow-y-auto">
              {logs.map(log => (
                <div key={log.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ACTION_STYLES[log.action] ?? 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-700'}`}>
                      {log.action}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                      {log.changed_by_email ?? 'unknown'}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto shrink-0">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{describeLog(log)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
