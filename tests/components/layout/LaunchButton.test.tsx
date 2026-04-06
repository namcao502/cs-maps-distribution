/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { LaunchButton } from '@/components/layout/LaunchButton'
import * as launchStore from '@/lib/maps/launch-store'

jest.mock('@/components/maps/LaunchSetupModal', () => ({
  LaunchSetupModal: ({
    onSetupComplete,
    onClose,
    mode,
  }: {
    onSetupComplete: () => void
    onClose: () => void
    mode: string
  }) => (
    <div data-testid="launch-modal" data-mode={mode}>
      <button onClick={onSetupComplete}>done</button>
      <button onClick={onClose}>close</button>
    </div>
  ),
}))

jest.mock('@/lib/maps/launch-store', () => ({
  isLaunchSetup: jest.fn(),
  markLaunchSetup: jest.fn(),
}))

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
}

beforeEach(() => {
  jest.resetAllMocks()
  setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
})

test('renders null on non-Windows', () => {
  setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
  ;(launchStore.isLaunchSetup as jest.Mock).mockReturnValue(false)
  const { container } = render(<LaunchButton />)
  expect(container.firstChild).toBeNull()
})

test('renders Launch CS button on Windows', () => {
  ;(launchStore.isLaunchSetup as jest.Mock).mockReturnValue(false)
  render(<LaunchButton />)
  expect(screen.getByRole('button', { name: /launch cs/i })).toBeInTheDocument()
})

test('does not show gear button before setup', () => {
  ;(launchStore.isLaunchSetup as jest.Mock).mockReturnValue(false)
  render(<LaunchButton />)
  expect(screen.queryByRole('button', { name: /reconfigure/i })).not.toBeInTheDocument()
})

test('shows gear button when setup is done', () => {
  ;(launchStore.isLaunchSetup as jest.Mock).mockReturnValue(true)
  render(<LaunchButton />)
  expect(screen.getByRole('button', { name: /reconfigure/i })).toBeInTheDocument()
})

test('opens setup modal (mode=setup) when Launch CS clicked and not setup', () => {
  ;(launchStore.isLaunchSetup as jest.Mock).mockReturnValue(false)
  render(<LaunchButton />)
  fireEvent.click(screen.getByRole('button', { name: /launch cs/i }))
  expect(screen.getByTestId('launch-modal')).toBeInTheDocument()
  expect(screen.getByTestId('launch-modal')).toHaveAttribute('data-mode', 'setup')
})

test('does not open modal when Launch CS clicked and setup is done', () => {
  // window.location.href is non-configurable in jsdom and cannot be spied on;
  // verify the observable behavior instead: modal must NOT open (the other branch opens it)
  ;(launchStore.isLaunchSetup as jest.Mock).mockReturnValue(true)
  render(<LaunchButton />)
  fireEvent.click(screen.getByRole('button', { name: /launch cs/i }))
  expect(screen.queryByTestId('launch-modal')).not.toBeInTheDocument()
})

test('opens modal (mode=reconfigure) when gear clicked', () => {
  ;(launchStore.isLaunchSetup as jest.Mock).mockReturnValue(true)
  render(<LaunchButton />)
  fireEvent.click(screen.getByRole('button', { name: /reconfigure/i }))
  expect(screen.getByTestId('launch-modal')).toHaveAttribute('data-mode', 'reconfigure')
})

test('calls markLaunchSetup and shows gear when Done clicked in modal', () => {
  ;(launchStore.isLaunchSetup as jest.Mock).mockReturnValue(false)
  render(<LaunchButton />)
  fireEvent.click(screen.getByRole('button', { name: /launch cs/i }))
  fireEvent.click(screen.getByRole('button', { name: /done/i }))
  expect(launchStore.markLaunchSetup).toHaveBeenCalledTimes(1)
  expect(screen.queryByTestId('launch-modal')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /reconfigure/i })).toBeInTheDocument()
})

test('closes modal without marking setup when Cancel clicked', () => {
  ;(launchStore.isLaunchSetup as jest.Mock).mockReturnValue(false)
  render(<LaunchButton />)
  fireEvent.click(screen.getByRole('button', { name: /launch cs/i }))
  fireEvent.click(screen.getByRole('button', { name: /close/i }))
  expect(launchStore.markLaunchSetup).not.toHaveBeenCalled()
  expect(screen.queryByTestId('launch-modal')).not.toBeInTheDocument()
})
