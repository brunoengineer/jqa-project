import { NextResponse } from "next/server";

import { generateMarkdown } from "@/server/llm";
import { getPromptContent } from "@/server/prompts";

type ReqBody = {
	provider?: unknown;
	model?: unknown;
	prompt?: unknown;
	taskId?: unknown;
};

function unwrapSingleMarkdownFence(text: string): string {
	const s = text.trim();
	const m = s.match(/^```(?:md|markdown)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/i);
	if (!m) return text;
	return m[1]?.trim() ?? "";
}

function isProvider(value: unknown): value is "ollama" | "openai" {
	return value === "ollama" || value === "openai";
}

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as ReqBody;
		const provider = isProvider(body.provider) ? body.provider : undefined;
		const model = typeof body.model === "string" ? body.model.trim() : "";
		const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
		const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";

		if (!model) {
			return NextResponse.json({ error: "model is required" }, { status: 400 });
		}
		if (!prompt) {
			return NextResponse.json({ error: "prompt is required" }, { status: 400 });
		}

		let finalPrompt = prompt;
		if (taskId) {
			const tmpl = await getPromptContent(taskId);
			if (tmpl.content.trim()) {
				finalPrompt = `${tmpl.content.trim()}\n\n---\n\n${prompt}`;
			}
		}

		const markdownRaw = await generateMarkdown({ provider, model, prompt: finalPrompt });
		const markdown = unwrapSingleMarkdownFence(markdownRaw);
		return NextResponse.json({ markdown });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
