import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SplitEasy — Split expenses without signing up',
  description: 'Create a session, share the link, track who owes who.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}
