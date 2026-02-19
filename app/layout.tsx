import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ADHD Task Visualizer',
  description: 'Visual task management for ADHD minds',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
