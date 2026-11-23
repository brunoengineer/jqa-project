import { NextResponse } from "next/server";

import { withProjectContext } from "@/lib/project-context";
import { generateMarkdown, isLlmProvider } from "@/server/llm";
import { getAgent } from "@/server/agents";
import { getPromptContent } from "@/server/prompts";
import { getProject, getProjectContext } from "@/server/storage";

// Local models and long documents can take minutes.
export const maxDuration = 600;

type ReqBody = {
	provider?: unknown;
	model?: unknown;
	prompt?: unknown;
	taskId?: unknown;
	/** When set, the project's saved context is prepended to the prompt. */
	projectId?: unknown;
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
		const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";
		const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";

		if (!model) {
			return NextResponse.json({ error: "model is required" }, { status: 400 });
		}
		if (!prompt) {
			return NextResponse.json({ error: "prompt is required" }, { status: 400 });
		}

		// Resolves legacy ids and rejects agents that were deleted (or never existed).
		const agent = taskId ? await getAgent(taskId) : null;
		if (taskId && !agent) {
			return NextResponse.json({ error: `Agent "${taskId}" not found — it may have been deleted` }, { status: 404 });
		}
		const system = agent ? (await getPromptContent(agent.id)).content.trim() || undefined : undefined;

		// Looked up through the projects index so an arbitrary id can't point outside data/.
		const project = projectId ? await getProject(projectId) : null;
		const context = project ? await getProjectContext(project.id) : "";
		const fullPrompt = context.trim() ? withProjectContext(context, prompt) : prompt;

		const markdownRaw = await generateMarkdown({ provider, model, system, prompt: fullPrompt });
		const markdown = unwrapSingleMarkdownFence(markdownRaw);
		return NextResponse.json({ markdown });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
