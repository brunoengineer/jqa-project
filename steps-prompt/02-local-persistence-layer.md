# Step 02 — Local persistence layer (Projects + Outputs on disk)

## Goal
Implement a small storage layer that persists projects and generated markdown outputs on disk.

## Storage design (suggested)
- `qa-lobby/data/`
  - `projects.json` (index)
  - `projects/<projectId>/`
    - `project.json`
    - `outputs/<outputId>.json` (metadata)
    - `outputs/<outputId>.md` (content)

## Deliverables
- `src/server/storage/` with Node `fs/promises` code
- CRUD functions:
  - create/list/delete projects
  - create/list/delete outputs inside a project
- IDs: use `crypto.randomUUID()`

## Acceptance criteria
- Creating a project writes files under `qa-lobby/data/`
- Restarting dev server keeps existing projects

## Copilot prompt

Inside `qa-lobby`, implement a minimal local persistence layer that writes to `qa-lobby/data`.

Requirements:
- Use Node `fs/promises` and `path`
- Create `src/server/storage` module(s)
- Implement:
  - `listProjects()`
  - `createProject({ name: string })`
  - `deleteProject(projectId)`
  - `listProjectOutputs(projectId)`
  - `createProjectOutput({ projectId, taskId, title?, input, markdown })`
  - `deleteProjectOutput({ projectId, outputId })`
- Persist outputs as `.md` plus a small `.json` metadata file
- Ensure directories are created if missing
- Handle missing project folders gracefully (return empty)

Do not build UI yet; just implement the server-side modules and (if needed) a tiny smoke API route to verify reading/writing.
