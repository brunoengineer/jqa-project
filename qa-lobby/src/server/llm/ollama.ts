const OLLAMA_BASE_URL = "http://localhost:11434";

type OllamaGenerateResponse = {
	response?: string;
	done?: boolean;
};

export async function generateWithOllama(input: {
	model: string;
	prompt: string;
}): Promise<string> {
	const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			model: input.model,
			prompt: input.prompt,
			stream: false,
		}),
	});

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
