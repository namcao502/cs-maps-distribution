import { INFO_SEARCH_PLACEHOLDER } from '@/lib/constants/messages'

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
)

export function SearchInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="w-full flex items-center gap-2 px-3 py-2 bg-[var(--bg-surface)] border border-[var(--accent-cyan)]/40 focus-within:border-[var(--accent-cyan)] rounded-xl text-[var(--text-muted)] transition-colors">
      <SearchIcon />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={INFO_SEARCH_PLACEHOLDER}
        className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none"
          aria-label="Clear search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  )
}
