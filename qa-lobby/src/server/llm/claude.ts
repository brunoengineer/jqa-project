import Anthropic from "@anthropic-ai/sdk";

import type { ProviderModels } from "./types";

export const CLAUDE_MODELS = ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5", "claude-fable-5-1"];

// Models that support the server-side refusal fallback (`fallbacks: "default"`).
const FALLBACK_MODELS = new Set(["claude-opus-5", "claude-opus-5-5", "claude-fable-5-1"]);

let client: Anthropic | null = null;

function getClient(): Anthropic {
	// Resolves ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, or an `ant auth login` profile.
	client ??= new Anthropic();
	return client;
}

function hasCredentials(): boolean {
	return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
}

export async function listClaudeModels(): Promise<ProviderModels> {
	return {
		available: hasCredentials(),
		models: CLAUDE_MODELS,
		message: hasCredentials() ? undefined : "Set ANTHROPIC_API_KEY in .env.local",
	};
}

export async function generateWithClaude(input: {
	model: string;
	system?: string;
	prompt: string;
}): Promise<string> {
	const useFallback = FALLBACK_MODELS.has(input.model);

	let message: Anthropic.Beta.BetaMessage;
	try {
		// Stream so long documents don't hit HTTP timeouts; we only need the final message.
		const stream = getClient().beta.messages.stream({
			model: input.model,
			max_tokens: 64000,
			...(input.system ? { system: input.system } : {}),
			messages: [{ role: "user", content: input.prompt }],
			...(useFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
		});
		message = await stream.finalMessage();
	} catch (error) {
		if (error instanceof Anthropic.AuthenticationError) {
			throw new Error("Claude: invalid or missing API key (set ANTHROPIC_API_KEY in .env.local)");
		}
		if (error instanceof Anthropic.NotFoundError) {
			throw new Error(`Claude: model "${input.model}" not found`);
		}
		if (error instanceof Anthropic.RateLimitError) {
			throw new Error("Claude: rate limited, try again shortly");
		}
		if (error instanceof Anthropic.APIError) {
			throw new Error(`Claude request failed (${error.status}): ${error.message}`);
		}
		if (!hasCredentials()) {
			throw new Error("Claude: no credentials found — set ANTHROPIC_API_KEY in .env.local and restart the server");
		}
		throw error;
	}

	if (message.stop_reason === "refusal") {
		throw new Error("Claude declined this request. Try rephrasing the input or another model.");
	}

	const text = message.content
		.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
		.map((b) => b.text)
		.join("");
	if (!text.trim()) throw new Error("Claude returned an empty response");
	return text;
}
