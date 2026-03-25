/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { UploadForm } from '@/components/admin/UploadForm'

test('renders screenshots section', () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  expect(screen.getByText(/screenshots/i)).toBeInTheDocument()
})

test('shows max 3 note', () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  expect(screen.getByText(/up to 3/i)).toBeInTheDocument()
})
