# Code v/s Me

**Live:** [https://www.codevsme.com](https://www.codevsme.com/)  
**Portfolio:** [http://sumit.codevsme.com](http://sumit.codevsme.com/)

A **browser-only JavaScript / HTML / CSS playground** — write code, run it safely, preview the web, and keep files in a workspace. No backend server for execution; everything important runs in the client.

> Built as a real product-style project (auth, persistence, editor UX, sandboxing, deploy) — useful for portfolio demos and frontend interviews.

---

## What this app does (features)

### Editor & coding UX
| Feature | What it does |
|--------|----------------|
| CodeMirror 6 editor | Syntax highlight, line numbers, oneDark theme, line wrap |
| Multi-file tabs | Open many files, dirty indicator, close tabs, breadcrumbs |
| Run shortcut | `Ctrl+Enter` / `Cmd+Enter` |
| Undo / redo | Proper editor history (`history` + `historyKeymap`) so snippet inserts undo as one step |
| Auto-close brackets | Quotes / brackets close automatically |
| JS abbreviations | Shortcuts like `clg` → `console.log`, `waf` → arrow function (name selected to type over) |
| Structure snippets | Typing `for(` / `if(` / partial `for(let i = 0` expands loop/if skeletons |
| HTML / CSS modes | Language switches by file extension; HTML path/tag completions |
| DSA + example snippets | Dropdown templates for practice (arrays, trees, DP, etc.) |

### Execution & output
| Feature | What it does |
|--------|----------------|
| JS sandbox (Web Worker) | Runs user JS off the main thread |
| Console streaming | `console.log` / `warn` / `error` live in the Console tab |
| Compact object print | Arrays/objects log on one line (`JSON.stringify` compact) |
| Timeouts | Stops infinite loops (~2s) via `worker.terminate()` |
| Async drain | Allows pending timers/promises briefly after sync work finishes |
| Error lines | Maps stack lines back to user code (AsyncFunction offset) |
| Success / error mascots | Happy / confused panda feedback in Console |
| Terminal (REPL) | Interactive JS session with history |
| Web View | HTML/CSS (+ linked assets) live preview in an iframe |

### Files & workspace
| Feature | What it does |
|--------|----------------|
| In-browser workspace | Folders/files create, rename, delete, auto-save |
| IndexedDB persistence | Survives refresh; scoped per Google email or guest |
| Local folder (Chrome/Edge) | File System Access API — edit files on disk |
| Explorer UI | Workspace \| On disk tabs, tree, context menu, tooltips |

### Auth & product polish
| Feature | What it does |
|--------|----------------|
| Google Sign-In | Google Identity Services (GIS) — no custom backend |
| Guest mode | Use without account; guest DB kept separate |
| Toasts / dialogs | Shared UI provider for success/error/prompt/confirm |
| Learning chat panel | Side panel for learning assistant UI |
| SEO / a11y | Meta, OG, JSON-LD, robots/sitemap, landmarks, skip link, ARIA tabs |
| Deploy | GitHub Actions → GitHub Pages + custom domain |

---

## Tech stack & modules — what we used and **why**

### Core app
| Module | Why we used it |
|--------|----------------|
| **React 19** | Component UI, hooks for workspace/auth/runner state |
| **TypeScript** | Safer refactors around workers, IndexedDB, editor APIs |
| **Vite 8** | Fast dev server, ESM, easy `?worker` bundling, GitHub Pages build |
| **`@vitejs/plugin-react`** | JSX/TSX + Fast Refresh |
| **oxlint** | Fast linting in CI/local |

### Editor (CodeMirror 6 — modular packages)
| Package | Why |
|---------|-----|
| `@codemirror/view` | Editor UI, keymaps, decorations |
| `@codemirror/state` | Immutable editor state, transactions, annotations (`addToHistory`) |
| `@codemirror/commands` | Default keys, **`history` / undo-redo**, indent |
| `@codemirror/lang-javascript` | JS parsing + built-in snippets |
| `@codemirror/lang-html` / `lang-css` | HTML & CSS editing |
| `@codemirror/language` | Language support plumbing |
| `@codemirror/autocomplete` | Completion popup, **`snippetCompletion`**, tabstops |
| `@codemirror/theme-one-dark` | Dark theme matching the app |

**Why CodeMirror instead of Monaco / textarea?**  
Lighter than Monaco for a playground, fully modular, great snippet/autocomplete APIs, and we control every extension (history, workers aren’t tied to it).

### Runtime / browser APIs (no npm — platform features)
| API | Why |
|-----|-----|
| **Web Worker** | Isolate user JS; `terminate()` on infinite loops; UI stays responsive |
| **`AsyncFunction`** | Run user code with `async/await` + inject custom `console` |
| **`postMessage`** | Stream console lines from worker → React |
| **IndexedDB** | Persist workspace trees + file contents (larger than `localStorage`) |
| **`localStorage`** | Auth user + guest flag only |
| **File System Access API** | Open/edit real folders on disk (Chrome/Edge) |
| **Google Identity Services** | Sign in with Google without owning an auth server |
| **iframe (Web View)** | Safe-ish HTML/CSS preview surface |

### Auth helpers (our code)
| File | Role |
|------|------|
| `src/auth/jwt.ts` | Decode Google ID token payload in the browser |
| `src/auth/authStorage.ts` | Save/load `currentUser` / guest preference |
| `src/hooks/useAuth.ts` | Modal, login, logout, workspace scope |

### Storage / workspace
| File | Role |
|------|------|
| `src/storage/workspaceDb.ts` | IndexedDB schema; DB name scoped by email |
| `src/hooks/useWorkspace.ts` | Tabs, dirty state, auto-save, snippet load |
| `src/hooks/useLocalFolder.ts` | Disk folder permission + tree + read/write |

### Editor intelligence (our code)
| File | Role |
|------|------|
| `src/editor/completions.ts` | Combines all JS completion sources |
| `src/editor/jsAbbreviations.ts` | `clg`, `waf`, `fn`, … → snippets |
| `src/editor/jsStructureSnippets.ts` | Adaptive `for` / `if` / `while` skeletons |
| `src/editor/htmlCompletions.ts` | Tag + relative path suggestions |
| `src/editor/playgroundScope.ts` | Member completions for `console`, `Math`, etc. |

### Execution
| File | Role |
|------|------|
| `src/worker/runner.worker.ts` | Sandbox: console bridge, serialize values, REPL session, errors |
| `src/hooks/useCodeRunner.ts` | Spawn worker, timeouts, watchdog, map messages → console lines |
| `src/hooks/useRepl.ts` | Terminal REPL session state |
| `src/utils/htmlPreview.ts` | Build preview HTML blob/doc for Web View |

---

## Architecture (how pieces connect)

```text
┌──────────────────────────── UI (React) ────────────────────────────┐
│  FileExplorer │ CodeMirror editor │ Console / Terminal / Web View   │
│       │                │                        │                    │
│  useWorkspace     completions              useCodeRunner / useRepl   │
│  useLocalFolder   abbreviations            htmlPreview               │
└───────┬────────────────┬────────────────────────┬────────────────────┘
        │                │                        │
   IndexedDB        Editor state            Web Worker (JS run)
   (per user)       + history               postMessage ↔ console
        │
   Google GIS → localStorage user → workspaceScope (email | guest)
```

**Mental model for interviews:**  
UI is React; editing is CodeMirror; persistence is IndexedDB; execution is a Worker; auth only identifies *which* local DB to open — it does **not** sync files to the cloud today.

---

## Special things we built (talking points)

1. **Safe-ish JS execution without a backend**  
   Worker + timeout + custom `console` + output limits.

2. **Product-grade editor UX**  
   Abbreviations + adaptive structure snippets + undo that doesn’t break after snippet insert (`history` + `Transaction.addToHistory.of(false)` on React sync).

3. **Per-account local workspaces**  
   Same Google account on the same browser reopens its IndexedDB; guest keeps the legacy DB so old work isn’t wiped.

4. **Dual file sources**  
   Virtual workspace (IndexedDB) + optional real disk folder (File System Access API).

5. **HTML/CSS Web View**  
   Separate from the Worker path — preview needs DOM, so iframe/blob preview instead of Worker.

6. **SEO for a SPA**  
   Meta/OG/Twitter, JSON-LD `WebApplication`, `robots.txt`, `sitemap.xml`, noscript fallback, a11y landmarks.

7. **Custom domain deploy**  
   Vite `base: '/'`, CNAME, GitHub Actions injects `VITE_GOOGLE_CLIENT_ID`.

8. **Honest limitation (good interview answer)**  
   Google login does **not** sync code across laptops — storage is local. Cross-device sync would need Firebase/Supabase/own API.

---

## Interview Q&A (prepare these)

### Product / overview
**Q: What is Code v/s Me?**  
A: A client-side playground to write and run JS (and preview HTML/CSS), with a file workspace, Google/guest auth scoping, and GitHub Pages hosting.

**Q: Why build this?**  
A: To practice real frontend systems: editor embedding, sandboxing, persistence, OAuth UX, deploy — not just a UI clone.

### Execution / security
**Q: Why a Web Worker instead of `eval` on the main thread?**  
A: Main-thread `eval`/loops freeze React and the editor. A Worker runs off-thread; we can `terminate()` on timeout.

**Q: Why not an iframe for JS?**  
A: iframe is better when code must touch the DOM. Our JS path is console-oriented. HTML preview uses iframe/Web View separately.

**Q: Is the sandbox fully secure?**  
A: It’s isolation for UX (timeouts, UI freeze), not a hardened multi-tenant jail. Workers still share the origin; we don’t expose a server. For untrusted multi-user hosting you’d need stronger isolation (separate origins, CSP, server-side runners).

**Q: How do you stop `while(true){}`?**  
A: Start a timer when Run begins; if still running after ~2s, `worker.terminate()` and show a timeout error.

**Q: How does `console.log` reach the UI?**  
A: Worker overrides `console.log/warn/error` → `postMessage` → `useCodeRunner` appends lines → `OutputPanel` renders.

**Q: How are objects printed?**  
A: `serialize()` in the worker — primitives as strings; objects via compact `JSON.stringify` (one line).

**Q: How do you get error line numbers?**  
A: Parse the error stack (`<anonymous>:line`) and subtract AsyncFunction wrapper offset (~2).

### Editor
**Q: Why CodeMirror 6?**  
A: Modular extensions, first-class autocomplete/snippets, smaller than Monaco for this use case.

**Q: How do `waf` / `clg` work?**  
A: Custom completion source (`jsAbbreviations`) + `snippetCompletion`. First tabstop (e.g. `name`) is selected so you type over it — no modal.

**Q: How does adaptive `for(` completion work?**  
A: `jsStructureSnippets` regex-matches the prefix before the cursor and builds a snippet template from what you already typed.

**Q: Why was undo broken, and how did you fix it?**  
A: Missing `history()` / `historyKeymap`, and React→editor full-doc sync was entering undo history. Fixed with `history()` and `Transaction.addToHistory.of(false)` on external syncs.

### Storage & auth
**Q: Where is code saved?**  
A: IndexedDB (files/folders/meta). Auth user lives in `localStorage`.

**Q: Does Google login sync across devices?**  
A: **No.** Login only chooses the local DB namespace. Cross-device needs a cloud backend.

**Q: How is workspace scoped?**  
A: `js-playground-workspace:${email}` vs legacy guest DB name.

**Q: What is `origin_mismatch` on Google Sign-In?**  
A: The page origin isn’t listed under OAuth client **Authorized JavaScript origins** (must include `https://www.codevsme.com`, not only redirect URIs).

**Q: Why GIS instead of Firebase Auth?**  
A: No backend required for MVP; decode ID token client-side for profile; good enough for scoping local data. Firebase would be better if we add cloud sync.

### HTML preview
**Q: How does Web View work?**  
A: Collect related HTML/CSS/(JS) files, build a preview document (`htmlPreview`), show in iframe; reload key remounts.

### Performance / UX
**Q: How do you avoid blocking the UI while code runs?**  
A: Worker off main thread; React stays interactive; output streams via messages.

**Q: Output flood protection?**  
A: Cap console messages in the worker; emit `output-limit` when exceeded.

### Deploy / SEO
**Q: How is it deployed?**  
A: Push to `main` → GitHub Actions builds with Vite → uploads Pages artifact → custom domain via CNAME.

**Q: SPA SEO challenges?**  
A: Crawlers may not run full JS — we put meta/JSON-LD/noscript content in `index.html` and ship `robots.txt` + `sitemap.xml`.

### Design tradeoffs (strong answers)
**Q: Biggest tradeoff?**  
A: Local-only persistence vs complexity of sync. Chose local-first for ship speed; sync is a clear next milestone.

**Q: What would you add next?**  
A: Cloud sync (Firestore/Supabase), shareable links, tests for worker serialize/timeouts, stronger CSP for previews.

---

## Project structure (high level)

```text
src/
  App.tsx                 # Shell: header, explorer, editor, output, auth
  components/             # UI: editor, explorer, output, auth, mascots, chat
  editor/                 # Completions, abbreviations, structure snippets
  hooks/                  # useAuth, useWorkspace, useCodeRunner, useRepl, useLocalFolder
  storage/workspaceDb.ts  # IndexedDB
  worker/runner.worker.ts # JS sandbox
  auth/                   # GIS helpers
  data/                   # Example + DSA snippets
  utils/                  # Preview, runnable file checks, tabs
public/                   # logo, favicon, robots.txt, sitemap.xml, CNAME
```

---

## Local development

```bash
npm install
cp .env.example .env   # set VITE_GOOGLE_CLIENT_ID (optional for guest-only)
npm run dev            # http://localhost:5173
```

```bash
npm run build
npm run preview
```

### Google OAuth checklist
Under OAuth client **Authorized JavaScript origins** (not only redirect URIs):

- `http://localhost:5173`
- `https://www.codevsme.com`
- `https://codevsme.com`

Repo secret for deploy: `VITE_GOOGLE_CLIENT_ID`.

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b` + production bundle |
| `npm run preview` | Preview production build |
| `npm run lint` | oxlint |

---

## Author notes (portfolio one-liner)

> Solo-built **Code v/s Me** — a React + CodeMirror playground with Web Worker sandboxing, IndexedDB workspaces, Google/guest auth scoping, adaptive editor snippets, HTML preview, and GitHub Pages deploy on a custom domain.

---

## License

Private / personal project unless otherwise stated.
