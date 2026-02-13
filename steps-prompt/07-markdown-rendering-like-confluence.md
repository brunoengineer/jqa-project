# Step 07 — Render Markdown nicely (dark, readable)

## Goal
Make the generated `.md` look “Confluence-ish”: readable headings, lists, code blocks, tables.

## Deliverables
- Markdown renderer component
- Styling via Tailwind typography (dark mode)

## Acceptance criteria
- Headings, lists, bold, code blocks, tables render correctly
- Looks good in dark mode

## Copilot prompt

Inside `qa-lobby`, add a markdown rendering component for the generated outputs.

Requirements:
- Use `react-markdown` with `remark-gfm`
- Use Tailwind Typography plugin (`@tailwindcss/typography`) to style markdown
- Ensure styling works in dark mode
- Render markdown in the project detail view for the selected output

Do not add editing of markdown; read-only preview is enough.
