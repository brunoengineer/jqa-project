"use client";

export async function generateMarkdownViaApi(input: {
	provider: "ollama" | "openai";
	model: string;
	taskId: string;
	prompt: string;
}): Promise<string> {
	const res = await fetch("/api/llm/generate", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(input),
	});

	const text = await res.text();
	if (!res.ok) {
		let msg = `LLM error (${res.status})`;
		try {
			const parsed = JSON.parse(text) as { error?: string };
			if (parsed.error) msg = parsed.error;
		} catch {
			// ignore
		}
		throw new Error(msg);
	}

	const json = JSON.parse(text) as { markdown?: unknown };
	const markdown = typeof json.markdown === "string" ? json.markdown : "";
	if (!markdown.trim()) throw new Error("LLM returned empty markdown");
	return markdown;
}

export async function saveOutputViaApi(input: {
	projectId: string;
	taskId: string;
	title?: string;
	input: unknown;
	markdown: string;
}): Promise<{ outputId?: string }> {
	const res = await fetch(`/api/projects/${input.projectId}/outputs`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			taskId: input.taskId,
			title: input.title,
			input: input.input,
			markdown: input.markdown,
		}),
	});

	const text = await res.text();
	if (!res.ok) {
		let msg = `Save error (${res.status})`;
		try {
			const parsed = JSON.parse(text) as { error?: string };
			if (parsed.error) msg = parsed.error;
		} catch {
			// ignore
		}
		throw new Error(msg);
	}

	const json = JSON.parse(text) as { output?: { id?: string } };
	return { outputId: json.output?.id };
}

export function deriveTitleFromText(explicitTitle: string, text: string): string | undefined {
	const explicit = explicitTitle.trim();
	if (explicit) return explicit;
	const firstLine = text
		.trim()
		.replace(/\s+/g, " ")
		.slice(0, 80)
		.trim();
	return firstLine || undefined;
}
