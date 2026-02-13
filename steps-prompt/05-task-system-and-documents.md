# Step 05 — Tasks/Agents + project documents list

## Goal
Introduce the concept of Tasks/Agents and show a list of generated outputs inside a project.

## Deliverables
- A small static task registry in code (v1)
- Project detail page shows:
  - task selector
  - list of existing outputs grouped by task

## Acceptance criteria
- Opening a project shows existing outputs loaded from disk
- Deleting an output removes it from disk and UI

## Copilot prompt

Inside `qa-lobby`, implement a minimal Task registry and display outputs.

Requirements:
- Create `src/tasks/registry.ts` exporting an array of tasks:
  - `id` (string)
  - `name` (string)
  - `description` (string)
- At minimum include one task: `create-bug-ticket`
- In `/projects/[projectId]` render:
  - A task selector (dropdown)
  - A list of outputs for the project grouped by `taskId`
  - Each output item shows: title (fallback), createdAt, delete button

Data:
- Fetch outputs from the server (route handler / server action) using the Step 02 storage layer.

UI constraints:
- Keep it minimal; no filters/search.
