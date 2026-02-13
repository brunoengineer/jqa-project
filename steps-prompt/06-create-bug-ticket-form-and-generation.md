# Step 06 — “Create Bug Ticket” form → generate markdown → save output

## Goal
Implement the first end-to-end AI task: user fills a minimal form, clicks Generate, and gets a saved markdown document.

## Minimal input fields
Keep as simple as possible:
- Description (textarea) — ideally the only field users need
Optional fields (only if you think they add real value):
- Title
- Steps to reproduce
- Expected behavior
- Actual behavior

## Deliverables
- UI form for `create-bug-ticket`
- Prompt template that requests markdown output
- Calls `/api/llm/generate` (Step 03)
- Saves markdown output with storage layer (Step 02)
- Displays markdown in the UI

## Acceptance criteria
- Generate produces a markdown document with sections
- Output is persisted and reappears after refresh

## Copilot prompt

Inside `qa-lobby`, implement the `create-bug-ticket` task end-to-end.

Requirements:
- In project detail page, when task `create-bug-ticket` is selected, show a small form.
- Keep fields minimal: only Description must be present in UI; all other fields optional.
- When the user clicks Generate:
  - Build a prompt that asks the LLM to output a bug ticket in **Markdown** with clear headings.
  - Call the existing API `POST /api/llm/generate` with `{ model, prompt }`.
  - Save the output using `createProjectOutput` including taskId and the user input.
  - Update the outputs list and show the rendered markdown.

Error handling:
- If Ollama is not running, show a clear error message in UI.

Do not add more tasks yet.
