/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
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

test('renders three screenshot file inputs that accept image types', () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  const inputs = document.querySelectorAll('input[type="file"][accept="image/jpeg,image/png,image/webp"]')
  expect(inputs.length).toBe(3)
})

test('shows filename and remove button after file selection', () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  const inputs = document.querySelectorAll('input[type="file"][accept="image/jpeg,image/png,image/webp"]')
  const file = new File(['data'], 'shot.webp', { type: 'image/webp' })
  fireEvent.change(inputs[0], { target: { files: [file] } })
  expect(screen.getByText('shot.webp')).toBeInTheDocument()
  // remove button is ×
  const removeBtn = screen.getByText('×')
  expect(removeBtn).toBeInTheDocument()
})

test('remove button clears the slot', () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  const inputs = document.querySelectorAll('input[type="file"][accept="image/jpeg,image/png,image/webp"]')
  const file = new File(['data'], 'shot.png', { type: 'image/png' })
  fireEvent.change(inputs[0], { target: { files: [file] } })
  expect(screen.getByText('shot.png')).toBeInTheDocument()
  fireEvent.click(screen.getByText('×'))
  expect(screen.queryByText('shot.png')).not.toBeInTheDocument()
})
