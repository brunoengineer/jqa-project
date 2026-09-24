import { listPrompts } from "@/server/prompts";

import { PromptsEditor } from "./PromptsEditor";

export const dynamic = "force-dynamic";

export default async function PromptsPage() {
	const prompts = await listPrompts();

	return (
		<div className="mx-auto max-w-4xl space-y-8">
			<div className="space-y-3">
				<p className="eyebrow">{"// agents"}</p>
				<h1 className="text-3xl font-semibold tracking-tight">Agent prompts</h1>
				<p className="text-muted">
					Each agent runs with the instructions below. Defaults are synced from{" "}
					<code className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-accent">
						qa-agent-hub
					</code>{" "}
					with <code className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-accent">npm run sync:agents</code>.
					Edits you save here stay local and override the default until you reset them.
				</p>
			</div>

			<PromptsEditor initial={prompts} />
		</div>
	);
}
