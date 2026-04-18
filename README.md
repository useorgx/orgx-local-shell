# orgx-local-shell

**Tauri 2 desktop app** that renders the same surfaces as [useorgx.com](https://useorgx.com) (Runs, Execution Receipts, Reviews, Vault & Budgets, Audit log) locally. Bundles the three plugin peers as system sidecars so dispatches survive browser closes — the shell stays in the tray, peers keep driving claude-code / codex / opencode, receipts flow back.

## Architecture

```
┌──────────────────────────────────────────────────┐
│ Tauri window (WebView)                           │
│   React + @useorgx/orgx-ui-kit surfaces          │
│   fetches against useorgx.com via @useorgx/…/data│
│                                                  │
└────────┬─────────────────────────────────────────┘
         │  invoke('start_peer', …)
         ▼
┌──────────────────────────────────────────────────┐
│ Tauri Rust backend (src-tauri)                   │
│   - system tray (menu + left-click = open)       │
│   - invoke handler spawns plugin binaries        │
│     (orgx-claude-code-peer, orgx-codex-peer,     │
│      orgx-opencode-plugin)                       │
└────────┬─────────────────────────────────────────┘
         │  child_process spawn
         ▼
   orgx-claude-code-peer · orgx-codex-peer · orgx-opencode-plugin
                (each opens its own WS to useorgx.com)
```

## Why Tauri 2 not Electron

- ~15 MB binary vs ~200 MB
- Native webview → fewer Chromium security patches to chase
- First-class Rust backend makes shell spawning + IPC + tray straightforward
- Signed DMG / AppImage / MSI via `tauri build`

## Dev loop

```bash
# install deps
pnpm install          # or: npm install

# run the frontend + Tauri together
pnpm tauri:dev

# type-check the frontend
pnpm type-check
```

The first launch prompts for:

- **Base URL** (defaults to `https://useorgx.com`)
- **Workspace ID** (uuid)
- **oxk_ API key** (scopes: `gateway:drive` + `plugin:heartbeat`)

All three are stored in `localStorage` — never shipped anywhere off the machine.

## Bundled plugin peers

The shell invokes the three peer binaries when the user clicks **Start plugin peers**:

- `orgx-claude-code-peer` from [`@useorgx/claude-code-plugin`](https://github.com/useorgx/orgx-claude-code-plugin)
- `orgx-codex-peer` from [`@useorgx/codex-plugin`](https://github.com/useorgx/orgx-codex-plugin)
- `orgx-opencode-plugin` from [`@useorgx/orgx-opencode-plugin`](https://github.com/useorgx/orgx-opencode-plugin)

Peers receive `ORGX_API_KEY` + `ORGX_WORKSPACE_ID` as env vars. The Tauri capability file (`src-tauri/capabilities/default.json`) narrows the shell permission to exactly those three binary names.

## Build targets

`tauri build` produces:

- macOS: `.dmg` (universal binary recommended once Rust toolchain is set up for both archs)
- Linux: `.AppImage`
- Windows: `.msi`

Icons live in `src-tauri/icons/` (placeholder paths in `tauri.conf.json`).

## Status

Alpha — part of the Sovereign Execution initiative [`993cabeb`](https://useorgx.com/live/993cabeb-8162-4f35-9b4d-3832df9d5f83).
