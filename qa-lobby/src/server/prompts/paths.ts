import path from "node:path";

import { getDataRoot } from "@/server/storage/paths";
import { AGENT_ID_PATTERN } from "@/tasks/registry";

/** Agent ids become file names, so reject anything that could escape the prompts directory. */
function assertSafeId(taskId: string): string {
	if (!AGENT_ID_PATTERN.test(taskId)) throw new Error(`Invalid agent id: ${JSON.stringify(taskId)}`);
	return taskId;
}

export function getPromptsDir(): string {
	return path.join(getDataRoot(), "prompts");
}

export function getPromptPath(taskId: string): string {
	return path.join(getPromptsDir(), `${assertSafeId(taskId)}.md`);
}

export function getDefaultPromptsDir(): string {
	// Versioned defaults live in qa-lobby/prompts
	return path.join(process.cwd(), "prompts");
}

export function getDefaultPromptPath(taskId: string): string {
	return path.join(getDefaultPromptsDir(), `${assertSafeId(taskId)}.md`);
}
