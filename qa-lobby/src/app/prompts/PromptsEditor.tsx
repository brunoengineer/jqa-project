"use client";

import { useMemo, useState } from "react";

type PromptRecord = {
	taskId: string;
	taskName: string;
	taskDescription: string;
	content: string;
	source: "saved" | "default" | "empty";
};

export function PromptsEditor(props: { initial: PromptRecord[] }) {
	const [rows, setRows] = useState<PromptRecord[]>(props.initial);
	const [savingId, setSavingId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [savedAt, setSavedAt] = useState<Record<string, number>>({});

	const hasAny = useMemo(() => rows.length > 0, [rows.length]);

	async function onSave(taskId: string) {
		setSavingId(taskId);
		setError(null);
		try {
			const row = rows.find((r) => r.taskId === taskId);
			if (!row) throw new Error("Prompt not found");

			const res = await fetch(`/api/prompts/${encodeURIComponent(taskId)}`, {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ content: row.content }),
			});

			const text = await res.text();
			if (!res.ok) {
				let msg = `Save failed (${res.status})`;
				try {
					const parsed = JSON.parse(text) as { error?: string };
					if (parsed.error) msg = parsed.error;
				} catch {
					// ignore
				}
				throw new Error(msg);
			}

			setRows((prev) => prev.map((r) => (r.taskId === taskId ? { ...r, source: "saved" } : r)));
			setSavedAt((prev) => ({ ...prev, [taskId]: Date.now() }));
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setSavingId(null);
		}
	}

	if (!hasAny) {
		return <div className="text-sm text-foreground/70">No prompts found.</div>;
	}

	return (
		<div className="space-y-6">
			{error ? (
				<div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
					{error}
				</div>
			) : null}

			{rows.map((row) => {
				const isSaving = savingId === row.taskId;
				return (
					<section key={row.taskId} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
						<div className="flex items-start justify-between gap-4">
							<div>
								<h2 className="text-base font-semibold">{row.taskName}</h2>
								<p className="mt-1 text-sm text-foreground/70">{row.taskDescription}</p>
								<p className="mt-2 text-xs text-foreground/60">Source: {row.source}</p>
							</div>
							<div className="shrink-0 text-right">
								<button
									type="button"
									onClick={() => onSave(row.taskId)}
									disabled={isSaving}
									className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm hover:bg-white/[0.09] disabled:opacity-60"
								>
									{isSaving ? "Saving…" : "Save"}
								</button>
								{savedAt[row.taskId] ? (
									<div className="mt-2 text-xs text-foreground/60">Saved just now</div>
								) : null}
							</div>
						</div>

						<textarea
							className="mt-3 h-52 w-full resize-y rounded-md border border-white/10 bg-black/20 px-3 py-2 font-mono text-sm outline-none focus:border-white/20"
							value={row.content}
							onChange={(e) => {
								const next = e.target.value;
								setRows((prev) => prev.map((r) => (r.taskId === row.taskId ? { ...r, content: next } : r)));
							}}
						/>
					</section>
				);
			})}
		</div>
	);
}
