// Client-safe provider metadata (the server-side clients live in src/server/llm).

import type { LlmProvider } from "@/server/llm/types";

export type ProviderInfo = {
	id: LlmProvider;
	label: string;
	defaultModel: string;
	hint: string;
};

export const providers: ProviderInfo[] = [
	{ id: "ollama", label: "Ollama", defaultModel: "llama3.1", hint: "Local models, free and private" },
	{ id: "claude-code", label: "Claude", defaultModel: "opus", hint: "Your Claude plan (via Claude Code)" },
	{ id: "copilot", label: "Copilot", defaultModel: "gpt-5", hint: "Your GitHub Copilot plan" },
	{ id: "claude", label: "Claude API", defaultModel: "claude-opus-5", hint: "Anthropic API key (pay per use)" },
	{ id: "openai", label: "OpenAI", defaultModel: "gpt-4.1-mini", hint: "OpenAI API key (pay per use)" },
];

export function getProviderInfo(id: string | undefined): ProviderInfo | undefined {
	return providers.find((p) => p.id === id);
}
