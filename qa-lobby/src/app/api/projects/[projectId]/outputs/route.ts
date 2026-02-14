import { NextResponse } from "next/server";

import { createProjectOutput, listProjectOutputs } from "@/server/storage";

export async function GET(
	_req: Request,
	ctx: { params: Promise<{ projectId: string }> },
) {
	const { projectId } = await ctx.params;
	const outputs = await listProjectOutputs(projectId);
	return NextResponse.json({ outputs });
}

export async function POST(
	req: Request,
	ctx: { params: Promise<{ projectId: string }> },
) {
	try {
		const { projectId } = await ctx.params;
		const body = (await req.json()) as {
			taskId?: unknown;
			title?: unknown;
			input?: unknown;
			markdown?: unknown;
		};
		const taskId = typeof body.taskId === "string" ? body.taskId : "";
		const title = typeof body.title === "string" ? body.title : undefined;
		const markdown = typeof body.markdown === "string" ? body.markdown : "";

		const output = await createProjectOutput({
			projectId,
			taskId,
			title,
			input: body.input,
			markdown,
		});

		return NextResponse.json({ output }, { status: 201 });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 400 },
		);
	}
}
