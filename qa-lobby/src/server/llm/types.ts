// "claude-code" = Claude plan via the Claude Code CLI; "claude" = Anthropic API key.
export const llmProviders = ["ollama", "claude-code", "copilot", "claude", "openai"] as const;

export type LlmProvider = (typeof llmProviders)[number];

export function isLlmProvider(value: unknown): value is LlmProvider {
	return typeof value === "string" && (llmProviders as readonly string[]).includes(value);
}

export type GenerateMarkdownInput = {
	provider?: LlmProvider;
	model: string;
	/** Agent instructions (the task's prompt template). */
	system?: string;
	/** The user's filled-in form. */
	prompt: string;
};

export type GenerateMarkdownResult = {
	markdown: string;
};

export type ProviderModels = {
	/** Whether the provider looks usable right now (running / configured / signed in). */
	available: boolean;
	models: string[];
	/** Human-readable reason when not available. */
	message?: string;
};
