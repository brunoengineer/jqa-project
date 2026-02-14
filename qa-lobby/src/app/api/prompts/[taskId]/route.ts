import { NextResponse } from "next/server";

import { getPromptContent, savePrompt } from "@/server/prompts";

type RouteCtx = { params: Promise<{ taskId: string }> };

type PutBody = { content?: unknown };

export async function GET(_req: Request, ctx: RouteCtx) {
	try {
		const { taskId } = await ctx.params;
		const prompt = await getPromptContent(taskId);
		return NextResponse.json({ taskId, ...prompt });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 },
		);
	}
}

export async function PUT(req: Request, ctx: RouteCtx) {
	try {
		const { taskId } = await ctx.params;
		const body = (await req.json()) as PutBody;
		const content = typeof body.content === "string" ? body.content : null;
		if (content == null) {
			return NextResponse.json({ error: "content is required" }, { status: 400 });
		}

		await savePrompt(taskId, content);
		return NextResponse.json({ ok: true });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
