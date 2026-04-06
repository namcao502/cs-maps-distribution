const LAUNCH_KEY = 'cs-launch-setup'

export function isLaunchSetup(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem(LAUNCH_KEY) === '1'
}

export function markLaunchSetup(): void {
  localStorage.setItem(LAUNCH_KEY, '1')
}
