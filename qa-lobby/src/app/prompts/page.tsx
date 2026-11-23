import { listAgentsWithPrompts, listRemovedBuiltInAgents } from "@/server/agents";

import { AgentsManager } from "./AgentsManager";

export const dynamic = "force-dynamic";

const codeClass =
	"rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-accent";

export default async function PromptsPage() {
	const [agents, removed] = await Promise.all([listAgentsWithPrompts(), listRemovedBuiltInAgents()]);

	return (
		<div className="mx-auto max-w-4xl space-y-8">
			<div className="space-y-3">
				<p className="eyebrow">{"// agents"}</p>
				<h1 className="text-3xl font-semibold tracking-tight">Agents</h1>
				<p className="text-muted">
					Create your own agents, edit the instructions each one runs with, or remove the ones you don&apos;t need.
					Built-in defaults are synced from <code className={codeClass}>qa-agent-hub</code> with{" "}
					<code className={codeClass}>npm run sync:agents</code>; your edits stay local and override them until you
					reset. Removed built-ins can be restored, and documents already generated are always kept.
				</p>
			</div>

			<AgentsManager initial={agents} removed={removed} />
		</div>
	);
}
