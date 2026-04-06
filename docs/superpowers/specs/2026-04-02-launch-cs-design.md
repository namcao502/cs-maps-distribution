# Launch CS Feature Design

**Date:** 2026-04-02
**Status:** Approved

## Overview

Add a "Launch CS" button to the site header that lets Windows users start Counter-Strike 1.6 directly from the browser. Because browsers cannot execute local files, a one-time PowerShell setup script registers a custom `cs://` URI scheme in the Windows registry pointing to the user's `cstrike.exe`. After setup the button fires `window.location.href = 'cs://'`, which the OS routes to the game executable.

This feature is Windows-only. Non-Windows users see nothing.

## Architecture

Four new pieces:

| File | Purpose |
|------|---------|
| `public/setup-cs-launch.ps1` | Static PowerShell script the user downloads and runs once |
| `src/lib/maps/launch-store.ts` | localStorage helpers: `isLaunchSetup()` and `markLaunchSetup()` |
| `src/components/layout/LaunchButton.tsx` | Split-button in the header: launch or reconfigure |
| `src/components/maps/LaunchSetupModal.tsx` | 3-step setup/reconfigure modal |

`src/components/layout/SiteHeader.tsx` gets one new import: `<LaunchButton />` placed left of the Submit Map link. Note: `SiteHeader` is now mounted from `src/app/layout.tsx` (moved from individual pages in commit `dc5609f`) — the component file is still the right place to add `LaunchButton`.

## Components

### `launch-store.ts`

Follows the same localStorage pattern as `isInstalledLocally` in `folder-store.ts`.

```ts
const LAUNCH_KEY = 'cs-launch-setup'
export const isLaunchSetup = (): boolean =>
  typeof window !== 'undefined' && localStorage.getItem(LAUNCH_KEY) === '1'
export const markLaunchSetup = (): void =>
  localStorage.setItem(LAUNCH_KEY, '1')
```

### `LaunchButton.tsx`

Client component with local state only.

- On mount: check `navigator.userAgent` for Windows; check `isLaunchSetup()` into local `useState`
- Non-Windows: return `null`
- Windows + not setup: single button renders; clicking opens `LaunchSetupModal` with `onSetupComplete` callback
- Windows + setup done: split-button renders; main area fires `window.location.href = 'cs://'`; gear icon opens `LaunchSetupModal` (reconfigure mode) with `onSetupComplete` callback

`onSetupComplete` calls `markLaunchSetup()` and sets the local `isSetup` state to `true`, causing an immediate re-render without a page refresh.

Visual: `[ Launch CS ][ gear ]` only appears after setup. Before setup it is a plain `[ Launch CS ]` button (no gear -- setup is the only action).

### `LaunchSetupModal.tsx`

Modal with two modes: **Setup** (first time) and **Reconfigure** (via gear icon).

Three steps shown to the user:
1. Download `setup-cs-launch.ps1` via `<a href="/setup-cs-launch.ps1" download>`
2. Right-click the downloaded file and select "Run with PowerShell"
3. In the file picker that opens, select your `cstrike.exe`

Primary action button: "Done, I ran it" -- calls `markLaunchSetup()` and closes the modal.

Heading differs by mode:
- First time: "Setup Game Launch"
- Reconfigure: "Reconfigure Game Launch"

### `setup-cs-launch.ps1`

Static file in `/public`. The script:
1. Opens a native `System.Windows.Forms.OpenFileDialog` filtered to `*.exe`
2. User navigates to and selects their `cstrike.exe`
3. Script derives the game directory from the selected exe path
4. Script writes a `.reg` file to `$env:TEMP` registering the `cs://` URI scheme with a `cmd /c` wrapper that sets the working directory before launching
5. Imports the `.reg` silently via `regedit /s`
6. Deletes the temp `.reg` file
7. Prints "Done!" and waits for Enter before closing

The `.reg` content:
```
Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\cs]
@="URL:Counter-Strike Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\cs\shell\open\command]
@="cmd /c \"cd /d \"<game dir>\" && \"<path to cstrike.exe>\""
```

The `cmd /c` wrapper is required because browsers launch URI handlers with their own working directory (not the exe's folder). Counter-Strike (GoldSrc engine) expects to be started from its installation directory or it fails to locate its assets.

In the PowerShell script, the command string is constructed as:
```powershell
$exePath = $dialog.FileName          # e.g. C:\Games\CS\cstrike.exe
$exeDir  = Split-Path $exePath       # e.g. C:\Games\CS
$command = "cmd /c `"cd /d `"$exeDir`" && `"$exePath`"`""
```

The file uses UTF-16 LE encoding (`Out-File -Encoding unicode`) because `regedit` requires it.

## Data Flow

```
User clicks "Launch CS" (first time)
  -> LaunchButton: isLaunchSetup() = false
  -> Opens LaunchSetupModal (Setup mode)
  -> User downloads .ps1, runs it, picks cstrike.exe
  -> cs:// registered in Windows registry
  -> User clicks "Done, I ran it"
  -> markLaunchSetup() sets localStorage['cs-launch-setup'] = '1'
  -> Modal closes, LaunchButton re-renders with gear icon

User clicks "Launch CS" (subsequent)
  -> LaunchButton: isLaunchSetup() = true
  -> window.location.href = 'cs://'
  -> OS routes to cstrike.exe

User clicks gear icon
  -> Opens LaunchSetupModal (Reconfigure mode)
  -> User re-runs .ps1 with correct exe
  -> Clicks "Done" -> markLaunchSetup() overwrites flag
```

## Error Handling & Edge Cases

| Scenario | Handling |
|----------|---------|
| Non-Windows browser | `LaunchButton` returns `null` -- feature invisible |
| `cs://` fires but no handler registered | Browser silently does nothing; user clicks gear to redo setup |
| User clicks "Done" without running the script | `cs://` silently fails; gear icon lets them retry |
| Wrong exe selected | User clicks gear, re-runs script, clicks Done again |
| `localStorage` unavailable (private browsing) | `isLaunchSetup()` returns `false` safely; modal shows every click |

No error UI needed -- the feature is best-effort and the gear icon covers all recovery paths.

## Styling

Follow existing header button patterns. Use `--accent-cyan` for borders/text on the main button to match the Submit Map link style. The gear icon uses `--text-muted` with hover to `--text-primary`, kept subtle so the main "Launch CS" label reads as the primary action.

## Out of Scope

- Mac/Linux support
- Auto-detection of whether `cs://` is registered
- Steam-based launching
- Verifying the selected exe is actually CS 1.6
