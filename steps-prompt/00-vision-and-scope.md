# Step 00 — Vision, scope, and architecture (align first)

## Goal
Align on **what the QA Lobby is** (and what it is not) before writing code.

## What we’re building (v1)
A local-only app (runs on `localhost`) that lets a QA:
- Create **Projects**
- Inside a project, create **AI-generated Documents** using predefined **Tasks/Agents** (e.g., “Create Bug Ticket”)
- Fill a **minimal form** (only a description field is expected; keep everything else optional)
- Generate an **.md output** via **Ollama** and show it nicely in a dark UI (Confluence-ish markdown rendering)
- Keep outputs **saved on disk** so reopening the app shows everything again
- View outputs grouped by task and delete them

## Key assumptions (default choices)
- **Runtime**: Web app in browser via **Next.js (TypeScript)** running locally (no Electron for now)
- **Storage**: On-disk data folder in the repo (e.g., `qa-lobby/data/…`), storing JSON metadata + `.md` files
- **LLM**: **Ollama** running locally (`http://localhost:11434`) with a selectable model name (string)
- **Single-user**: no auth, no multi-user sync

If you want Electron/desktop packaging later, we’ll add it after v1.

## Non-goals (explicitly not doing now)
- No cloud deployment
- No user accounts / permissions
- No complex dashboards, charts, filters, or multi-page wizard flows
- No vector DB / embeddings / RAG (unless you explicitly ask later)

## UX (screens)
1. **Projects list**: create project, open project, delete project
2. **Project detail**:
   - left: list of documents/outputs (grouped by task)
   - main: task picker + simple form + generated markdown preview

## Copilot prompt (paste into Copilot Chat)

You are implementing a local-only QA Lobby in this workspace.

Before coding, write a short v1 spec (1 page max) with:
- data model (Project, Task, OutputDocument)
- storage strategy on disk (folder structure and file formats)
- API boundary: browser UI → Next.js route handlers → Ollama
- page list + minimal UI interactions

Constraints:
- Keep it minimal: only the UX described above.
- Default to Next.js App Router + TypeScript.
- Use dark mode.
- Persist everything on disk.

At the end, list 3-5 acceptance criteria that can be manually verified.
