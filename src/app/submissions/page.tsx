'use client'
import { SubmitForm } from '@/components/submissions/SubmitForm'
import { MySubmissions } from '@/components/submissions/MySubmissions'
import { SiteHeader } from '@/components/layout/SiteHeader'

export default function SubmissionsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <SiteHeader />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <a href="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--accent-cyan)] mb-6 transition-colors">
          ← Home
        </a>
        <h2 className="text-lg font-semibold mb-2">Submit map(s)</h2>
        <p className="text-[var(--text-muted)] text-sm mb-6">
          Upload a CS 1.6 map archive. It will appear on the public list after admin review.
        </p>
        <SubmitForm onSubmitted={() => window.location.reload()} />
        <h2 className="text-lg font-semibold mt-10 mb-4">My Submissions</h2>
        <MySubmissions />
      </main>
    </div>
  )
}
