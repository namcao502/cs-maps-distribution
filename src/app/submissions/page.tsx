'use client'
import { SubmitForm } from '@/components/SubmitForm'
import { MySubmissions } from '@/components/MySubmissions'

export default function SubmissionsPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">Submit a Map</h1>
      <p className="text-[var(--text-muted)] text-sm mb-6">
        Upload a CS 1.6 map archive. It will appear on the public list after admin review.
      </p>
      <SubmitForm onSubmitted={() => window.location.reload()} />
      <h2 className="text-lg font-semibold mt-10 mb-4">My Submissions</h2>
      <MySubmissions />
    </main>
  )
}
