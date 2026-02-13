# Step 01 — Scaffold the TypeScript app (Next.js + dark UI)

## Goal
Create the runnable app skeleton with TypeScript, Tailwind, and dark-mode styling.

## Deliverables
- Folder `qa-lobby/` created in repo root
- Next.js App Router project in TypeScript
- Tailwind configured + dark mode enabled
- A simple landing page with “Projects” header (dark UI)

## Acceptance criteria
- `cd qa-lobby && npm run dev` starts
- Opening `http://localhost:3000` shows a dark UI shell

## Copilot prompt

In the repository root (which already has `llm/` and `steps-prompt/`), create a new Next.js project in a folder named `qa-lobby`.

Requirements:
- Next.js App Router
- TypeScript
- Tailwind CSS configured
- Dark mode enabled (class strategy)
- Minimal UI: a top header "QA Lobby" and a "Projects" section (no functionality yet)

Also add a short README in `qa-lobby/README.md` with prerequisites:
- Node.js LTS
- Ollama installed + running

Commands should be standard for Windows PowerShell.

Do not add extra pages or features yet.
