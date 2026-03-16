import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Splitwise — Split expenses without signing up',
  description: 'Create a session, share the link, track who owes who.',
  icons: { icon: '/icon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}
