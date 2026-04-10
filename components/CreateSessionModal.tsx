'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, RefreshCw, Lock } from 'lucide-react'

interface Props {
  onClose: () => void
  onCreated: (id: string) => void
}

interface CurrencyEntry {
  code: string
  rate: string
  name: string
}

const INPUT = 'w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function CreateSessionModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [members, setMembers] = useState(['', ''])
  const [currencies, setCurrencies] = useState<CurrencyEntry[]>([])
  const [passcode, setPasscode] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingRate, setFetchingRate] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [allCurrencies, setAllCurrencies] = useState<Record<string, string>>({})
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null)
  const dropdownRef = useRef<number | null>(null)

  useEffect(() => {
    fetch('/api/currencies')
      .then(r => r.json())
      .then(data => setAllCurrencies(data ?? {}))
      .catch(() => {})
  }, [])

  const updateMember = (i: number, value: string) => {
    const updated = [...members]; updated[i] = value; setMembers(updated)
  }
  const removeMember = (i: number) => setMembers(members.filter((_, idx) => idx !== i))
  const addMember = () => setMembers([...members, ''])

  const updateCurrency = (i: number, fields: Partial<CurrencyEntry>) => {
    setCurrencies(prev => prev.map((c, idx) => idx === i ? { ...c, ...fields } : c))
  }
  const removeCurrency = (i: number) => setCurrencies(currencies.filter((_, idx) => idx !== i))
  const addCurrency = () => setCurrencies([...currencies, { code: '', rate: '', name: '' }])

  const fetchLiveRate = async (i: number, codeOverride?: string) => {
    const code = (codeOverride ?? currencies[i].code).trim().toUpperCase()
    if (!code) return
    setFetchingRate(i)
    try {
      const res = await fetch(`/api/exchange-rate?from=${encodeURIComponent(code)}`)
      const data = await res.json()
      const rate = Array.isArray(data) ? data[0]?.rate : undefined
      if (rate) updateCurrency(i, { rate: rate.toString() })
      else setError(`Could not fetch rate for ${code}`)
    } catch {
      setError(`Failed to fetch rate for ${code}`)
    } finally {
      setFetchingRate(null)
    }
  }

  function getSuggestions(query: string) {
    const q = query.trim().toUpperCase()
    if (!q) return []
    return Object.entries(allCurrencies)
      .filter(([code, label]) =>
        typeof code === 'string' && typeof label === 'string' &&
        (code.startsWith(q) || label.toUpperCase().includes(q))
      )
      .slice(0, 8) as [string, string][]
  }

  const handleSelectCurrency = (i: number, code: string, label: string) => {
    updateCurrency(i, { code, name: label })
    setActiveDropdown(null)
    dropdownRef.current = null
    fetchLiveRate(i, code)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const validMembers = members.map(m => m.trim()).filter(Boolean)
    if (validMembers.length < 2) { setError('Please add at least 2 members.'); return }
    const validCurrencies = currencies.filter(c => c.code.trim() && c.rate.trim())
    for (const c of validCurrencies) {
      if (isNaN(parseFloat(c.rate)) || parseFloat(c.rate) <= 0) {
        setError(`Exchange rate for ${c.code} must be a positive number.`); return
      }
    }
    setLoading(true)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'My Session',
          members: validMembers,
          passcode: passcode.trim() || null,
          currencies: validCurrencies.map(c => ({ code: c.code.trim().toUpperCase(), rate: parseFloat(c.rate) })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create session.')
      onCreated(data.id)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-gray-100">Create New Session</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Session Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Bangkok Trip" className={INPUT} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Members</label>
            <div className="space-y-2">
              {members.map((m, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="text" value={m} onChange={e => updateMember(i, e.target.value)}
                    placeholder={`Member ${i + 1}`} className={INPUT} />
                  {members.length > 2 && (
                    <button type="button" onClick={() => removeMember(i)} className="text-red-400 hover:text-red-600 shrink-0">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addMember}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 flex items-center gap-1">
              <Plus size={14} /> Add member
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Foreign Currencies <span className="text-gray-400 font-normal ml-1 text-xs">(SGD is always included)</span>
            </label>
            <div className="space-y-3">
              {currencies.map((c, i) => {
                const suggestions = getSuggestions(c.code)
                return (
                  <div key={i}>
                    <div className="flex gap-2 items-center">
                      {/* Type-ahead code input */}
                      <div className="relative shrink-0 w-24">
                        <input
                          type="text"
                          value={c.code}
                          onChange={e => {
                            updateCurrency(i, { code: e.target.value.toUpperCase(), name: '' })
                            setActiveDropdown(i)
                          }}
                          onFocus={() => setActiveDropdown(i)}
                          onBlur={() => setTimeout(() => {
                            if (dropdownRef.current === i) return
                            setActiveDropdown(null)
                          }, 150)}
                          placeholder="USD"
                          maxLength={5}
                          className="w-full border dark:border-gray-600 rounded-lg px-2 py-2 text-sm uppercase text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {activeDropdown === i && suggestions.length > 0 && (
                          <ul
                            onMouseEnter={() => { dropdownRef.current = i }}
                            onMouseLeave={() => { dropdownRef.current = null }}
                            className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg shadow-lg z-30 max-h-44 overflow-y-auto"
                          >
                            {suggestions.map(([code, label]) => (
                              <li key={code}>
                                <button
                                  type="button"
                                  onMouseDown={() => handleSelectCurrency(i, code, label)}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                                >
                                  <span className="font-mono font-semibold text-gray-900 dark:text-gray-100 w-10 shrink-0">{code}</span>
                                  <span className="text-gray-500 dark:text-gray-400 truncate">{label}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <span className="text-gray-400 text-xs shrink-0">1 =</span>
                      <input type="number" value={c.rate} onChange={e => updateCurrency(i, { rate: e.target.value })}
                        placeholder="1.35" step="any" min="0.000001" className={INPUT} />
                      <span className="text-gray-400 text-xs shrink-0">SGD</span>
                      <button type="button" onClick={() => fetchLiveRate(i)} disabled={fetchingRate === i || !c.code.trim()}
                        title="Fetch live rate" className="text-blue-400 hover:text-blue-600 disabled:opacity-40 shrink-0">
                        <RefreshCw size={14} className={fetchingRate === i ? 'animate-spin' : ''} />
                      </button>
                      <button type="button" onClick={() => removeCurrency(i)} className="text-red-400 hover:text-red-600 shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Currency name label */}
                    {c.name && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 pl-1">
                        {c.code} — {c.name}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
            <button type="button" onClick={addCurrency}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 flex items-center gap-1">
              <Plus size={14} /> Add currency
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1">
              <Lock size={13} /> Passcode <span className="text-gray-400 font-normal ml-1 text-xs">(optional)</span>
            </label>
            <input type="text" value={passcode} onChange={e => setPasscode(e.target.value)}
              placeholder="e.g. 1234" className={INPUT} />
            <p className="text-xs text-gray-400 mt-1">If set, visitors must enter this to view the session.</p>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition">
            {loading ? 'Creating…' : 'Create Session'}
          </button>
        </form>
      </div>
    </div>
  )
}
