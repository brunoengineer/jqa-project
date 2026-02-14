# QA Lobby

Local-only QA assistant that generates Markdown documents for common QA tasks.

Includes an **AI Prompts** page where you can edit the instruction template used for each task (saved locally).

## Prerequisites

- Node.js LTS
- Choose one LLM mode:
	- **Ollama (local)**
		- Install Ollama and ensure it’s running at `http://localhost:11434`
		- Have at least one model pulled (example: `ollama pull llama3.1`)
	- **OpenAI (API key)**
		- Create `qa-lobby/.env.local` and set `OPENAI_API_KEY=...`
		- (Optional) set `OPENAI_BASE_URL=...` if using a compatible proxy

## Local data (important)

- QA Lobby stores projects, generated documents, and saved prompt overrides in `qa-lobby/data/`.
- This folder is **intentionally gitignored** and meant to be local-only.

## AI Prompts

- Default (versioned) prompt templates live in `qa-lobby/prompts/`.
- When you edit/save prompts in the UI (`/prompts`), the saved versions override defaults and are written to `qa-lobby/data/prompts/`.

## Run (Windows PowerShell)

```powershell
cd qa-lobby
npm install
npm run dev
```

Open http://localhost:3000

## Run (macOS/Linux)

```bash
cd qa-lobby
npm install
npm run dev
```
