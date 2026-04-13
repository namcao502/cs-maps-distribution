# CS Maps Distribution

A web app for browsing and installing Counter-Strike 1.6 maps directly into your game folder — no manual file copying needed.

## Features

- **One-click install** — picks your CS 1.6 folder and writes the `.bsp` file directly via the File System Access API
- **Batch install** — select multiple maps and install them all at once
- **Search & filter** — filter maps by name or tag (Defuse, Hostage, etc.)
- **Daily pick** — admin pins a featured map with caption; shown as first card on the homepage
- **Launch CS** — Windows-only header button that launches Counter-Strike 1.6 via a `cs://` URI scheme (one-time PowerShell setup)
- **Admin panel** — upload maps, manage tags, hide/show maps, reorder the list
- **Submission queue** — community members can submit maps for admin review
- **Dark mode** — follows system preference

## Tech Stack

- [Next.js 15](https://nextjs.org) (App Router)
- [Firebase](https://firebase.google.com) — Auth, Firestore, and Storage
- [Tailwind CSS](https://tailwindcss.com)
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) for direct installs

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create a `.env.local` file:

```env
# Public (browser-safe)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# Server-only
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=
ADMIN_GOOGLE_EMAIL=
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm test` | Run tests |
