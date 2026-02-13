# Step 03 — Ollama integration (server-side API)

## Goal
Add server-side code that calls Ollama locally to generate markdown.

## Deliverables
- `src/server/llm/ollama.ts` client
- Next.js route handler: `app/api/llm/generate/route.ts`
- Input: `{ model: string, prompt: string }`
- Output: `{ markdown: string }`

## Acceptance criteria
- If Ollama is running, a POST to `/api/llm/generate` returns generated text
- Failures return a helpful error message (HTTP 500 + JSON)

## Copilot prompt

Inside `qa-lobby`, implement an Ollama client and an API route to generate markdown.

Requirements:
- Ollama base URL: `http://localhost:11434`
- Use the Ollama `POST /api/generate` endpoint
- The API route is `POST /api/llm/generate`
- Request JSON: `{ model: string, prompt: string }`
- Response JSON: `{ markdown: string }`
- Keep it simple: non-streaming response aggregation
- Add basic validation: model and prompt must be non-empty strings
- Do not expose Ollama directly to browser (avoid CORS); call it server-side.

Also add a note in `qa-lobby/README.md` on how to test with curl on Windows.
