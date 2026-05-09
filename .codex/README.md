# Codex Cloud Environment

Use these repo-local scripts when configuring the Codex cloud environment for `useorgx/orgx-local-shell`.

## Setup script

```bash
bash .codex/setup-cloud.sh
```

## Maintenance script

```bash
bash .codex/maintenance-cloud.sh
```

## Environment notes

- Node 22 or newer is safe for frontend checks.
- `tauri:dev` and `tauri:build` require native Rust/Tauri setup and are not baseline Codex cloud checks.
- The app depends on `useorgx/orgx-ui-kit` and `useorgx/orgx-data`; setup builds temporary clones of both GitHub dependencies so their `dist` type outputs exist before shell verification.
- Do not add OrgX API keys or workspace IDs as plain environment variables.

## Verification commands

```bash
npm run type-check
npm run build
```
