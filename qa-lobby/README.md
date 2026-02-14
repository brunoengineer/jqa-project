# QA Lobby

Local-only QA assistant that generates Markdown documents for common QA tasks.

## Prerequisites

- Node.js LTS
- Choose one LLM mode:
	- **Ollama (local)**
		- Install Ollama and ensure it’s running at `http://localhost:11434`
		- Have at least one model pulled (example: `ollama pull llama3.1`)
	- **OpenAI (API key)**
		- Create `qa-lobby/.env.local` and set `OPENAI_API_KEY=...`

## Run (Windows PowerShell)

```powershell
cd qa-lobby
npm install
npm run dev
```

Open http://localhost:3000
