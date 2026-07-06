# JS Playground

A lightweight JavaScript compiler/playground that runs entirely in the browser.

## Stack

- React + Vite
- CodeMirror 6 (`@codemirror/lang-javascript`, `@codemirror/autocomplete`, bracket closing via `@codemirror/autocomplete`)
- Web Worker sandbox for code execution

## Features

- Split-screen editor and output panel with a resizable divider
- JavaScript syntax highlighting, line numbers, oneDark theme
- Syntax-only autocomplete (keywords and built-in globals)
- Auto-closing brackets and quotes
- `Run` button and `Ctrl+Enter` / `Cmd+Enter` shortcut
- Streaming console output (`log`, `warn`, `error`)
- Runtime and syntax error display with line numbers when available
- Async/await and timer support
- 2-second execution timeout to stop infinite loops (shows "Execution timed out" only while code is still running)
- Line-wrap toggle
- Code persisted in `localStorage`
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

## Build

```bash
npm run build
npm run preview
```
