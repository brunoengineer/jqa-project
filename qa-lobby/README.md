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

## Ollama quick check (optional)

In a terminal:

```powershell
ollama --version
ollama list
ollama pull llama3.1
```

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

## Quick API smoke test (PowerShell)

With the dev server running (`npm run dev`), you can test generation directly:

**Ollama**

```powershell
curl.exe -s http://localhost:3000/api/llm/generate `
	-H "content-type: application/json" `
	-d '{"provider":"ollama","model":"llama3.1","taskId":"create-bug-ticket","prompt":"Say hi in Markdown."}'
```

**OpenAI** (requires `OPENAI_API_KEY` in `.env.local`)

```powershell
curl.exe -s http://localhost:3000/api/llm/generate `
	-H "content-type: application/json" `
	-d '{"provider":"openai","model":"gpt-4.1-mini","taskId":"create-bug-ticket","prompt":"Say hi in Markdown."}'
```

If your machine doesn’t have `curl.exe`, you can use:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/llm/generate -ContentType application/json -Body (
	'{"provider":"ollama","model":"llama3.1","taskId":"create-bug-ticket","prompt":"Say hi in Markdown."}'
)
```

## Troubleshooting

- **Port already in use**: stop the other process using `http://localhost:3000`, or start Next on another port: `npm run dev -- -p 3001`
- **Ollama not running**: start Ollama and re-check `http://localhost:11434` (and run `ollama list`)
- **Ollama model not found**: pull it first (example: `ollama pull llama3.1`) or change the model field in the UI
- **OpenAI 401/invalid key**: verify `qa-lobby/.env.local` contains a valid `OPENAI_API_KEY` and restart the dev server

## Run (macOS/Linux)

```bash
cd qa-lobby
npm install
npm run dev
```
