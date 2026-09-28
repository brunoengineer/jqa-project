// Client-safe helpers for the per-project context (the storage lives in src/server/storage).

/**
 * Keeps agent prompt + context + task input + output inside Ollama's default 8K-token window.
 * Past that, Ollama drops the start of the prompt, which is where the agent instructions are.
 */
export const PROJECT_CONTEXT_MAX_CHARS = 8000;

/** Prepends the project context to the user's filled-in form. */
export function withProjectContext(context: string, taskInput: string): string {
	return [
		"# Project context",
		"Background on the project this task belongs to. Use it for domain terms, components, environments, users, and team conventions. If it conflicts with the task input, the task input wins. Don't repeat it back unless it's relevant to the task.",
		`<project_context>\n${context.trim()}\n</project_context>`,
		"# Task input",
		taskInput,
	].join("\n\n");
}
