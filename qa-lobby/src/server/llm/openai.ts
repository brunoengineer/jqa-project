type ResponsesApiResponse = {
	output_text?: string;
	output?: Array<{
		content?: Array<{
			type?: string;
			text?: string;
		}>;
	}>;
};

function extractOutputText(payload: ResponsesApiResponse): string {
	if (typeof payload.output_text === "string" && payload.output_text.trim()) {
		return payload.output_text;
	}

	const parts: string[] = [];
	for (const item of payload.output ?? []) {
		for (const content of item.content ?? []) {
			if (content?.type === "output_text" && typeof content.text === "string") {
				parts.push(content.text);
			}
		}
	}

	return parts.join("\n");
}

export async function generateWithOpenAi(input: {
	model: string;
	prompt: string;
}): Promise<string> {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		throw new Error("Missing OPENAI_API_KEY");
	}

	const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
		/\/$/,
		"",
	);

	const res = await fetch(`${baseUrl}/responses`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: input.model,
			input: input.prompt,
		}),
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`OpenAI request failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`,
		);
	}

	const payload = (await res.json()) as ResponsesApiResponse;
	const outputText = extractOutputText(payload);
	if (!outputText.trim()) {
		throw new Error("OpenAI returned an empty response");
	}
	return outputText;
}
