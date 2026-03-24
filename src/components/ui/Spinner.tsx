type Size = 'sm' | 'md' | 'lg'
const SIZES: Record<Size, string> = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-6 h-6' }

export function Spinner({ size = 'md' }: { size?: Size }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`${SIZES[size]} border-2 border-current border-t-transparent rounded-full animate-spin`}
    />
  )
}
