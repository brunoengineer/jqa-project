# Step 04 — Projects UI (list/create/open)

## Goal
Build the first functional UI: create projects and open a project.

## Deliverables
- Page: Projects list
- Create project form: single input (project name)
- Project detail route: `/projects/[projectId]`

## Acceptance criteria
- Creating a project updates the list immediately
- Refreshing the page keeps the project

## Copilot prompt

Inside `qa-lobby` implement the Projects UI.

Requirements:
- Use Next.js App Router pages:
  - `/` redirects or shows projects list
  - `/projects` shows projects list
  - `/projects/[projectId]` shows project detail shell (empty for now)
- Dark-mode UI with Tailwind, minimal and clean
- Create project: a single input for name + create button
- Data access:
  - Use Next.js route handlers OR server actions to call the storage layer from Step 02
  - Do not call `fs` from client components
- Add delete project (simple button)

Do not add extra navigation elements beyond what’s needed.
