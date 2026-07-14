# JS Playground

A lightweight JavaScript compiler/playground that runs entirely in the browser.

## Stack

- React + Vite
- CodeMirror 6 (`@codemirror/lang-javascript`, `@codemirror/autocomplete`, bracket closing via `@codemirror/autocomplete`)
- Web Worker sandbox for code execution

## Features

- Split-screen editor and output panel with a resizable divider
- Sign in with Google (GIS) or continue as guest — workspace files scoped per account
- JavaScript syntax highlighting, line numbers, oneDark theme
- Syntax-only autocomplete (keywords and built-in globals)
- Auto-closing brackets and quotes
- `Run` button and `Ctrl+Enter` / `Cmd+Enter` shortcut
- Streaming console output (`log`, `warn`, `error`)
- Runtime and syntax error display with line numbers when available
- Async/await and timer support
- 2-second execution timeout to stop infinite loops (shows "Execution timed out" only while code is still running)
- Line-wrap toggle
- Workspace files persisted in IndexedDB (scoped by Google email or guest)
- Starter examples and DSA template library (two dropdowns: topic + template)
- File explorer with folders — create, delete, rename, auto-save (IndexedDB)
- Import files from computer into workspace
- Open local folders and edit `.js` files on disk (Chrome / Edge)

## Why Web Worker (not iframe)?

Code runs in a **Web Worker** because:

1. **Timeout / termination** — `worker.terminate()` stops runaway infinite loops after 2 seconds without freezing the UI.
2. **UI isolation** — long synchronous loops in a worker do not block React or CodeMirror.
3. **Console streaming** — `postMessage` gives a simple channel for live `console.log` / `warn` / `error` output as async code runs.

An iframe is a better fit when user code must touch the DOM; this playground focuses on console-oriented JavaScript.

## Development

```bash
npm install
npm run dev
```

Open **http://localhost:5173** — the app always runs on this port.

## Sign in with Google (optional)

This app uses **Google Identity Services** in the browser only (no backend). Copy `.env.example` to `.env` and set your Client ID:

```bash
cp .env.example .env
```

```env
VITE_GOOGLE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
```

Restart `npm run dev` after changing `.env`.

### Get a Google Client ID

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Go to **APIs & Services → OAuth consent screen**
   - User type: **External** (or Internal for Workspace-only)
   - App name, support email, developer contact → Save
   - Add scopes if prompted: `openid`, `email`, `profile` (GIS Sign In with Google provides these by default)
   - Add your Google account as a **Test user** while the app is in Testing
4. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: e.g. `Code v/s Me`
   - **Authorized JavaScript origins**
     - Local: `http://localhost:5173`
     - Production: `https://skkhinchi.github.io`
   - Leave **Authorized redirect URIs** empty for GIS button/One Tap
5. Copy the Client ID into `.env` as `VITE_GOOGLE_CLIENT_ID`
6. For GitHub Pages deploys, add the same value as a repo secret named `VITE_GOOGLE_CLIENT_ID` (**Settings → Secrets and variables → Actions**)

You can still use **Continue as Guest** without configuring Google.

### Auth behavior

- Signed-in users are stored in `localStorage` under `currentUser` (name, email, picture)
- Guest choice is remembered via `continueAsGuest`
- IndexedDB workspaces are scoped by email (guest keeps the original DB so existing local work is preserved)
- Escape, the × button, and click-outside dismiss the modal as guest

## Build

```bash
npm run build
npm run preview
```

## Deploy on GitHub Pages

This repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and deploys on every push to `main`.

### One-time setup

1. Open **https://github.com/skkhinchi/codeVsMe/settings/pages**
2. Under **Build and deployment** → **Source**, choose **GitHub Actions**
3. Push to `main` (or run the workflow manually from the **Actions** tab)

### Live URL

After the first successful deploy:

**https://skkhinchi.github.io/codeVsMe/**

### Notes

- Local dev still uses `npm run dev` at `http://localhost:5173`
- Production builds set `GITHUB_PAGES=true` so asset paths work under `/codeVsMe/`
- **File System Access API** (local folder editing) requires Chrome/Edge and may not work the same on the hosted site; workspace files in IndexedDB still work
