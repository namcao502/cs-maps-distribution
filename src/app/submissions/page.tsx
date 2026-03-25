'use client'
import { SubmitForm } from '@/components/submissions/SubmitForm'
import { MySubmissions } from '@/components/submissions/MySubmissions'
import { SiteHeader } from '@/components/layout/SiteHeader'

export default function SubmissionsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <SiteHeader installedCount={0} totalCount={0} query="" onQueryChange={() => {}} activeTab="all" onTabChange={() => {}} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold mb-2">Submit a Map</h2>
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
