import { NextResponse } from "next/server";

import { deleteProjectOutput } from "@/server/storage";

export async function DELETE(
	_req: Request,
	ctx: { params: Promise<{ projectId: string; outputId: string }> },
) {
	const { projectId, outputId } = await ctx.params;
	await deleteProjectOutput({ projectId, outputId });
	return NextResponse.json({ ok: true });
}
