# AGENTS.md

Guidelines for Codex and other agents working in `useorgx/orgx-local-shell`.

## Project

This repo is the Tauri 2 desktop shell for OrgX local execution surfaces and peer sidecar control.

## Setup

For Codex cloud, use:

```bash
bash .codex/setup-cloud.sh
```

Maintenance script for cached environments:

```bash
bash .codex/maintenance-cloud.sh
```

## Verification

```bash
npm run type-check
npm run build
```

Do not treat native Tauri packaging as a baseline cloud requirement. Run `npm run tauri:build` only when the task specifically touches native shell packaging and the environment has Rust/Tauri prerequisites.
