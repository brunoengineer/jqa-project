import { NextResponse } from "next/server";

import { AgentNotFoundError, deleteAgent, getAgent, updateAgent, validateAgentInput, withPrompt } from "@/server/agents";
import { agentErrorResponse } from "@/server/agents/http";

type RouteCtx = { params: Promise<{ agentId: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
	try {
		const { agentId } = await ctx.params;
		const agent = await getAgent(agentId);
		if (!agent) throw new AgentNotFoundError(agentId);
		return NextResponse.json({ agent: await withPrompt(agent) });
	} catch (error) {
		return agentErrorResponse(error);
	}
}

/** Updates a custom agent's details (name, description, category, code, fields). */
export async function PATCH(req: Request, ctx: RouteCtx) {
	try {
		const { agentId } = await ctx.params;
		const input = validateAgentInput(await req.json());
		const agent = await updateAgent(agentId, input);
		return NextResponse.json({ agent: await withPrompt(agent) });
	} catch (error) {
		return agentErrorResponse(error);
	}
}

/** Deletes a custom agent, or hides a built-in one (restorable). Generated documents are kept. */
export async function DELETE(_req: Request, ctx: RouteCtx) {
	try {
		const { agentId } = await ctx.params;
		const { builtIn } = await deleteAgent(agentId);
		return NextResponse.json({ ok: true, builtIn });
	} catch (error) {
		return agentErrorResponse(error);
	}
}
