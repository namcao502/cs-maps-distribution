/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/StatusBadge'

// ── Badge ────────────────────────────────────────────────────────────────────

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Hello</Badge>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('renders with size md', () => {
    render(<Badge size="md">Large</Badge>)
    expect(screen.getByText('Large')).toBeInTheDocument()
  })

  it.each(['default', 'success', 'warning', 'danger', 'info'] as const)(
    'renders variant %s',
    (variant) => {
      render(<Badge variant={variant}>{variant}</Badge>)
      expect(screen.getByText(variant)).toBeInTheDocument()
    }
  )

  it('accepts custom className', () => {
    render(<Badge className="my-custom">Tag</Badge>)
    expect(screen.getByText('Tag').className).toContain('my-custom')
  })
})

// ── Button ───────────────────────────────────────────────────────────────────

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('is disabled when loading', () => {
    render(<Button loading>Save</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when disabled prop set', () => {
    render(<Button disabled>Click</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it.each(['sm', 'md', 'lg'] as const)('renders size %s', (size) => {
    render(<Button size={size}>Btn</Button>)
    expect(screen.getByText('Btn')).toBeInTheDocument()
  })

  it.each(['primary', 'secondary', 'ghost', 'danger', 'success'] as const)(
    'renders variant %s',
    (variant) => {
      render(<Button variant={variant}>Btn</Button>)
      expect(screen.getByText('Btn')).toBeInTheDocument()
    }
  )

  it('calls onClick when clicked', () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Go</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalled()
  })
})

// ── Card ─────────────────────────────────────────────────────────────────────

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content</Card>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<Card className="p-8">Content</Card>)
    expect(container.firstChild).toHaveClass('p-8')
  })
})

// ── Modal ────────────────────────────────────────────────────────────────────

describe('Modal', () => {
  it('renders children', () => {
    render(<Modal>Modal content</Modal>)
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('renders without title or onClose', () => {
    render(<Modal>Bare modal</Modal>)
    expect(screen.getByText('Bare modal')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<Modal title="Test Title">Content</Modal>)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('renders close button when onClose provided', () => {
    const onClose = jest.fn()
    render(<Modal title="T" onClose={onClose}>Content</Modal>)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })
})

// ── Spinner ──────────────────────────────────────────────────────────────────

describe('Spinner', () => {
  it('renders with default size', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it.each(['sm', 'md', 'lg'] as const)('renders size %s', (size) => {
    render(<Spinner size={size} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

// ── StatusBadge ──────────────────────────────────────────────────────────────

describe('StatusBadge', () => {
  it('renders Pending', () => {
    render(<StatusBadge status="pending" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders Approved', () => {
    render(<StatusBadge status="approved" />)
    expect(screen.getByText('Approved')).toBeInTheDocument()
  })

  it('renders Rejected', () => {
    render(<StatusBadge status="rejected" />)
    expect(screen.getByText('Rejected')).toBeInTheDocument()
  })
})
