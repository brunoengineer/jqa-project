# Step 03 — LLM integration (Ollama + API-key mode)

## Goal
Add server-side code that can generate markdown using either:
- **Ollama locally**, or
- **OpenAI** using a user-provided API key

## Deliverables
- `src/server/llm/ollama.ts` client
- `src/server/llm/openai.ts` client for the OpenAI API
- `src/server/llm/index.ts` that chooses provider based on request/config
- Next.js route handler: `app/api/llm/generate/route.ts`
- Input: `{ provider?: 'ollama' | 'openai', model: string, prompt: string }`
- Output: `{ markdown: string }`

## Acceptance criteria
- If **Ollama** is running, a POST to `/api/llm/generate` returns generated text
- If an **API key** is configured, the same endpoint works in API-key mode
- Failures return a helpful error message (HTTP 500 + JSON)

## Copilot prompt

Inside `qa-lobby`, implement a small server-side LLM layer and an API route to generate markdown.

Requirements:
- Support providers:
	- `provider: 'ollama'`: call local Ollama
	- `provider: 'openai'`: call OpenAI using an API key
- Ollama base URL: `http://localhost:11434`
- Use the Ollama `POST /api/generate` endpoint
- The API route is `POST /api/llm/generate`
- Request JSON: `{ provider?: 'ollama' | 'openai', model: string, prompt: string }`
- Response JSON: `{ markdown: string }`
- Keep it simple: non-streaming response aggregation
- Add basic validation: model and prompt must be non-empty strings
- Do not expose Ollama or API keys directly to browser; call providers server-side.

API-key mode configuration (keep minimal):
- Read the API key from server env: `OPENAI_API_KEY`
- (Optional) allow overriding base URL via env: `OPENAI_BASE_URL` (default `https://api.openai.com/v1`)
- Default provider can be env-driven (example: `LLM_PROVIDER=ollama|openai`) but still allow request override if you add a UI toggle

OpenAI API notes (keep minimal):
- Prefer OpenAI **Responses API**:
	- `POST https://api.openai.com/v1/responses`
	- Send `{ model, input: prompt }`
	- Extract text via a simple `output_text` aggregation (or equivalent) and return it as `{ markdown }`

Also add a note in `qa-lobby/README.md` on how to test with curl on Windows.
