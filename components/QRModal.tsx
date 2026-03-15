'use client'

import { X } from 'lucide-react'

interface Props {
  url: string
  onClose: () => void
}

export default function QRModal({ url, onClose }: Props) {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-5 text-center">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Share Session</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <img src={qrSrc} alt="QR Code" className="mx-auto rounded-lg border p-2" width={220} height={220} />
        <p className="text-xs text-gray-400 mt-3 break-all">{url}</p>
      </div>
    </div>
  )
}
