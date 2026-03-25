/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { InstallStepper } from '@/components/maps/InstallStepper'
import type { InstallStatus } from '@/lib/maps/install'

test('renders all 4 phase labels in idle state', () => {
  render(<InstallStepper status={null} />)
  expect(screen.getByText('DOWNLOAD')).toBeInTheDocument()
  expect(screen.getByText('VERIFY')).toBeInTheDocument()
  expect(screen.getByText('EXTRACT')).toBeInTheDocument()
  expect(screen.getByText('WRITE')).toBeInTheDocument()
})

test('shows active phase label when downloading', () => {
  const status: InstallStatus = { phase: 'downloading', progress: 45 }
  render(<InstallStepper status={status} />)
  expect(screen.getByText(/45%/)).toBeInTheDocument()
})

test('shows file count when writing', () => {
  const status: InstallStatus = { phase: 'writing', current: 'de_dust2.bsp', total: 5, done: 2 }
  render(<InstallStepper status={status} />)
  expect(screen.getByText(/2\/5/)).toBeInTheDocument()
})

test('shows error message on error', () => {
  const status: InstallStatus = { phase: 'error', message: 'Folder access denied.' }
  render(<InstallStepper status={status} />)
  expect(screen.getByText('Folder access denied.')).toBeInTheDocument()
})
