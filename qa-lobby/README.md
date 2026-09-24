# QA Lobby — app

Local-first QA agent workspace (Next.js). Full documentation: [../README.md](../README.md).

## Quick start (Windows PowerShell)

```powershell
cd qa-lobby
npm install
copy .env.example .env.local   # optional: only for Claude / Copilot / OpenAI
npm run dev                    # or: npm.cmd run dev
```

Open http://127.0.0.1:3000.

| Provider | Setup |
|---|---|
| Ollama | Install Ollama, `ollama pull llama3.1` (or any model) |
| Claude (your plan) | Claude Code signed in with your Claude account (the VS Code extension is enough) |
| Copilot (your plan) | `npx @github/copilot` → `/login` once, or `COPILOT_GITHUB_TOKEN` in `.env.local` |
| Claude API (pay per use) | `ANTHROPIC_API_KEY` in `.env.local` |
| OpenAI (pay per use) | `OPENAI_API_KEY` in `.env.local` |

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server on `127.0.0.1:3000` |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run sync:agents` | Re-import agent prompts from `../../qa-agent-hub` (or `-- --hub <path>`) |
