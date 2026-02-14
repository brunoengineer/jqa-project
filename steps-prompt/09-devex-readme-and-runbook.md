# Step 09 — Runbook (clone → install → run)

## Goal
Make onboarding smooth for a QA: clone repo, install prerequisites, run app, verify.

## Deliverables
- Root README or `qa-lobby/README.md` updated with:
  - prerequisites (Node LTS, plus either Ollama or an API key)
  - install steps
  - how to pull a model (`ollama pull ...`) if using Ollama
  - how to configure API-key mode via `.env.local` if not using Ollama
  - run steps
  - basic troubleshooting

## Acceptance criteria
- A new user can run the app with only the README

## Copilot prompt

Update documentation for the QA Lobby.

Requirements:
- In `qa-lobby/README.md` add:
  - Windows-focused steps: install Node LTS
  - Choose one:
    - Ollama mode: install Ollama
    - OpenAI mode: set environment variables in `.env.local` (at minimum `OPENAI_API_KEY`)
  - Start Ollama and verify with `ollama --version` and `ollama list`
  - Pull a model example
  - `npm install` then `npm run dev`
  - How to test `/api/llm/generate` via curl in PowerShell
  - Common errors (Ollama not running, missing/invalid API key, port conflicts)

Keep it concise.
