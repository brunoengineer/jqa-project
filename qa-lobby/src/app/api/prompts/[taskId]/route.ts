import { NextResponse } from "next/server";

import { AgentInputError, AgentNotFoundError, getAgent, validateInstructions } from "@/server/agents";
import { agentErrorResponse } from "@/server/agents/http";
import { deleteSavedPrompt, getPromptContent, savePrompt } from "@/server/prompts";

type RouteCtx = { params: Promise<{ taskId: string }> };

type PutBody = { content?: unknown };

/** Only active agents have editable instructions; this also keeps arbitrary ids away from the file system. */
async function requireAgent(ctx: RouteCtx) {
	const { taskId } = await ctx.params;
	const agent = await getAgent(taskId);
	if (!agent) throw new AgentNotFoundError(taskId);
	return agent;
}

export async function GET(_req: Request, ctx: RouteCtx) {
	try {
		const agent = await requireAgent(ctx);
		const prompt = await getPromptContent(agent.id);
		return NextResponse.json({ taskId: agent.id, ...prompt });
	} catch (error) {
		return agentErrorResponse(error);
	}
}

export async function PUT(req: Request, ctx: RouteCtx) {
	try {
		const agent = await requireAgent(ctx);
		const body = (await req.json()) as PutBody;
		if (typeof body.content !== "string") {
			return NextResponse.json({ error: "content is required" }, { status: 400 });
		}
		// Custom agents have no default to fall back to, so their instructions can't be blank.
		await savePrompt(agent.id, validateInstructions(body.content, !agent.builtIn));
		return NextResponse.json({ ok: true });
	} catch (error) {
		return agentErrorResponse(error);
	}
}

/** Remove the saved override so a built-in agent falls back to its default prompt. */
export async function DELETE(_req: Request, ctx: RouteCtx) {
	try {
		const agent = await requireAgent(ctx);
		if (!agent.builtIn) {
			throw new AgentInputError("Custom agents have no default instructions to reset to");
		}
		await deleteSavedPrompt(agent.id);
		const prompt = await getPromptContent(agent.id);
		return NextResponse.json({ taskId: agent.id, ...prompt });
	} catch (error) {
		return agentErrorResponse(error);
	}
}
