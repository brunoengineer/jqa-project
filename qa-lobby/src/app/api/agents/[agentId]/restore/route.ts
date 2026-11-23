import { NextResponse } from "next/server";

import { restoreBuiltInAgent, withPrompt } from "@/server/agents";
import { agentErrorResponse } from "@/server/agents/http";

type RouteCtx = { params: Promise<{ agentId: string }> };

/** Brings back a built-in agent that was removed. */
export async function POST(_req: Request, ctx: RouteCtx) {
	try {
		const { agentId } = await ctx.params;
		const agent = await restoreBuiltInAgent(agentId);
		return NextResponse.json({ agent: await withPrompt(agent) });
	} catch (error) {
		return agentErrorResponse(error);
	}
}
