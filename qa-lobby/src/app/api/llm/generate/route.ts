import { NextResponse } from "next/server";

import { generateMarkdown, isLlmProvider } from "@/server/llm";
import { getPromptContent } from "@/server/prompts";
import { resolveTaskId } from "@/tasks/registry";

// Local models and long documents can take minutes.
export const maxDuration = 600;

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

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as ReqBody;
		const provider = isLlmProvider(body.provider) ? body.provider : undefined;
		const model = typeof body.model === "string" ? body.model.trim() : "";
		const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
		const taskId = typeof body.taskId === "string" ? resolveTaskId(body.taskId.trim()) : "";

		if (!model) {
			return NextResponse.json({ error: "model is required" }, { status: 400 });
		}
		if (!prompt) {
			return NextResponse.json({ error: "prompt is required" }, { status: 400 });
		}

		const system = taskId ? (await getPromptContent(taskId)).content.trim() || undefined : undefined;

		const markdownRaw = await generateMarkdown({ provider, model, system, prompt });
		const markdown = unwrapSingleMarkdownFence(markdownRaw);
		return NextResponse.json({ markdown });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
