export type LlmProvider = "ollama" | "openai";

export type GenerateMarkdownInput = {
	provider?: LlmProvider;
	model: string;
	prompt: string;
};

export type GenerateMarkdownResult = {
	markdown: string;
};
