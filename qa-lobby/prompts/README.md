# Agent prompts

Default, versioned instructions for each QA Lobby agent, one file per agent id (see `src/tasks/registry.ts`).

**Don't edit these by hand.** They are generated from [qa-agent-hub](https://github.com/brunoengineer/qa-agent-hub):

```powershell
npm run sync:agents                       # expects ../../qa-agent-hub
npm run sync:agents -- --hub C:\path\to\qa-agent-hub
```

The sync (`scripts/sync-agents.mjs`) takes each hub command in `.claude/commands/`, inlines the shared guidance
from `.claude/CLAUDE.md` it references, drops the chat-only sections ("If No Input Provided", "File Output"),
and appends QA Lobby's one-shot output rules.

Edits made on the **Agents** page are saved to `data/prompts/<id>.md` and override these defaults until you
click **Reset to default**.
