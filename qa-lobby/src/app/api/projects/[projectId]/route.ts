import { NextResponse } from "next/server";

import { deleteProject } from "@/server/storage";

export async function DELETE(
	_req: Request,
	ctx: { params: Promise<{ projectId: string }> },
) {
	const { projectId } = await ctx.params;
	await deleteProject(projectId);
	return NextResponse.json({ ok: true });
}
