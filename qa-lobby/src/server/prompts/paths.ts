import path from "node:path";

import { getDataRoot } from "@/server/storage/paths";

export function getPromptsDir(): string {
	return path.join(getDataRoot(), "prompts");
}

export function getPromptPath(taskId: string): string {
	return path.join(getPromptsDir(), `${taskId}.md`);
}

export function getDefaultPromptsDir(): string {
	// Versioned defaults live in qa-lobby/prompts
	return path.join(process.cwd(), "prompts");
}

export function getDefaultPromptPath(taskId: string): string {
	return path.join(getDefaultPromptsDir(), `${taskId}.md`);
}
