import type { ProviderModels } from "./types";

const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");

// Agent prompts plus pasted requirements easily exceed Ollama's small default context.
const OLLAMA_NUM_CTX = Number(process.env.OLLAMA_NUM_CTX) || 8192;

type OllamaGenerateResponse = {
	response?: string;
	done?: boolean;
};

type OllamaTagsResponse = {
	models?: Array<{ name?: string }>;
};

export async function listOllamaModels(): Promise<ProviderModels> {
	try {
		const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { cache: "no-store" });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = (await res.json()) as OllamaTagsResponse;
		const models = (data.models ?? []).map((m) => m.name).filter((n): n is string => Boolean(n));
		return {
			available: true,
			models,
			message: models.length ? undefined : "No models pulled yet — run `ollama pull llama3.1`",
		};
	} catch {
		return { available: false, models: [], message: `Ollama is not running at ${OLLAMA_BASE_URL}` };
	}
}

export async function generateWithOllama(input: {
	model: string;
	system?: string;
	prompt: string;
}): Promise<string> {
	// The agent instructions go in the prompt rather than Ollama's `system` field,
	// so a custom Modelfile SYSTEM (e.g. llm/models/qa-agent) is kept.
	const prompt = input.system ? `${input.system}\n\n---\n\n${input.prompt}` : input.prompt;

	let res: Response;
	try {
		res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				model: input.model,
				prompt,
				stream: false,
				options: { num_ctx: OLLAMA_NUM_CTX },
			}),
		});
	} catch {
		throw new Error(`Ollama is not reachable at ${OLLAMA_BASE_URL} — is it running?`);
	}

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Ollama request failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`,
		);
	}

	const data = (await res.json()) as OllamaGenerateResponse;
	const responseText = typeof data.response === "string" ? data.response : "";
	if (!responseText.trim()) {
		throw new Error("Ollama returned an empty response");
	}
	return responseText;
}
