import { listPrompts } from "@/server/prompts";

import { PromptsEditor } from "./PromptsEditor";

export default async function PromptsPage() {
	const prompts = await listPrompts();

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-semibold tracking-tight">AI Prompts</h1>
				<p className="mt-2 text-sm text-foreground/70">
					Edit the instruction templates used to refine AI output for each task.
				</p>
			</div>

			<PromptsEditor initial={prompts} />
		</div>
	);
}
