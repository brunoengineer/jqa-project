# Agent prompts

Default, versioned instructions for each QA Lobby agent, one file per agent id (see `src/tasks/registry.ts`).

**Don't edit these by hand.** They are generated from [qa-agent-hub](https://github.com/brunoengineer/qa-agent-hub):

```powershell
npm run sync:agents                       # expects ../../qa-agent-hub
npm run sync:agents -- --hub C:\path\to\qa-agent-hub
```

The sync (`scripts/sync-agents.mjs`) takes each hub command in `.claude/commands/`, inlines the shared guidance
from `.claude/CLAUDE.md` it references, drops the chat-only sections ("If No Input Provided", "File Output"),
turns "Chat Response" into "Author Notes" (the **Before you post** list goes at the end of the document, below a
`---` line), and appends QA Lobby's one-shot output rules. The sync fails if chat- or file-specific wording from
the hub survives, so a change in the hub's format can't slip into the prompts unnoticed.

If you saved an edit to a built-in agent on the **Agents** page, that edit keeps overriding the synced default.
Click **Reset to default** there to pick up the new version.

Edits made on the **Agents** page are saved to `data/prompts/<id>.md` and override these defaults until you
click **Reset to default**. Agents created on the Agents page are not in this folder: their definitions live in
`data/agents.json` and their instructions in `data/prompts/<id>.md`.
