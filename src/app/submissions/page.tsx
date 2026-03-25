'use client'
import { SubmitForm } from '@/components/submissions/SubmitForm'
import { MySubmissions } from '@/components/submissions/MySubmissions'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { BTN_HOME, LABEL_SUBMIT_MAPS, INFO_SUBMIT_DESCRIPTION, LABEL_MY_SUBMISSIONS } from '@/lib/constants/messages'

export default function SubmissionsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <SiteHeader />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <a href="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--accent-cyan)] mb-6 transition-colors">
          {BTN_HOME}
        </a>
        <h2 className="text-lg font-semibold mb-2">{LABEL_SUBMIT_MAPS}</h2>
        <p className="text-[var(--text-muted)] text-sm mb-6">
          {INFO_SUBMIT_DESCRIPTION}
        </p>
        <SubmitForm onSubmitted={() => window.location.reload()} />
        <h2 className="text-lg font-semibold mt-10 mb-4">{LABEL_MY_SUBMISSIONS}</h2>
        <MySubmissions />
      </main>
    </div>
  )
}
