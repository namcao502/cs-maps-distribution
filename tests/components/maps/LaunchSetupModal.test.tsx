/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { LaunchSetupModal } from '@/components/maps/LaunchSetupModal'

test('renders "Setup Game Launch" title in setup mode', () => {
  render(<LaunchSetupModal mode="setup" onSetupComplete={jest.fn()} onClose={jest.fn()} />)
  expect(screen.getByText('Setup Game Launch')).toBeInTheDocument()
})

test('renders "Reconfigure Game Launch" title in reconfigure mode', () => {
  render(<LaunchSetupModal mode="reconfigure" onSetupComplete={jest.fn()} onClose={jest.fn()} />)
  expect(screen.getByText('Reconfigure Game Launch')).toBeInTheDocument()
})

test('renders download link pointing to /setup-cs-launch.ps1 with download attribute', () => {
  render(<LaunchSetupModal mode="setup" onSetupComplete={jest.fn()} onClose={jest.fn()} />)
  const link = screen.getByRole('link', { name: /download setup-cs-launch\.ps1/i })
  expect(link).toHaveAttribute('href', '/setup-cs-launch.ps1')
  expect(link).toHaveAttribute('download')
})

test('calls onSetupComplete when "Done, I ran it" is clicked', () => {
  const onSetupComplete = jest.fn()
  render(<LaunchSetupModal mode="setup" onSetupComplete={onSetupComplete} onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /done, i ran it/i }))
  expect(onSetupComplete).toHaveBeenCalledTimes(1)
})

test('calls onClose when Cancel is clicked', () => {
  const onClose = jest.fn()
  render(<LaunchSetupModal mode="setup" onSetupComplete={jest.fn()} onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('calls onClose when backdrop is clicked', () => {
  const onClose = jest.fn()
  render(<LaunchSetupModal mode="setup" onSetupComplete={jest.fn()} onClose={onClose} />)
  fireEvent.click(screen.getByTestId('launch-setup-backdrop'))
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('does not call onClose when dialog content is clicked', () => {
  const onClose = jest.fn()
  render(<LaunchSetupModal mode="setup" onSetupComplete={jest.fn()} onClose={onClose} />)
  fireEvent.click(screen.getByRole('dialog'))
  expect(onClose).not.toHaveBeenCalled()
})
