import { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'QoderResume - AI-Powered Resume Optimization',
  description: 'Optimize your resume with AI-powered analysis, ATS scoring, and job matching',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  )
}