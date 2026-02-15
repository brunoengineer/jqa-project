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
	const [openTaskId, setOpenTaskId] = useState<string | null>(null);
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

			<div className="space-y-3">
				{rows.map((row) => {
					const isOpen = openTaskId === row.taskId;
					const isSaving = savingId === row.taskId;
					return (
						<section
							key={row.taskId}
							className="rounded-lg border border-white/10 bg-white/[0.03]"
						>
							<button
								type="button"
								aria-expanded={isOpen}
								onClick={() => setOpenTaskId((prev) => (prev === row.taskId ? null : row.taskId))}
								className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left"
							>
								<div className="min-w-0">
									<h2 className="truncate text-base font-semibold">{row.taskName}</h2>
									<p className="mt-1 text-sm text-foreground/70">{row.taskDescription}</p>
									<p className="mt-2 text-xs text-foreground/60">
										Source: {row.source}
										{savedAt[row.taskId] ? " · Saved just now" : ""}
									</p>
								</div>

								<div className="shrink-0 pt-0.5 text-xs text-foreground/60">
									{isOpen ? "Click to collapse" : "Click to expand"}
								</div>
							</button>

							{isOpen ? (
								<div className="border-t border-white/10 px-4 py-4">
									<div className="flex items-center justify-end">
										<button
											type="button"
											onClick={() => onSave(row.taskId)}
											disabled={isSaving}
											className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
										>
											{isSaving ? "Saving…" : "Save"}
										</button>
									</div>

									<textarea
										className="mt-3 h-56 w-full resize-y rounded-md border border-white/10 bg-black/20 px-3 py-2 font-mono text-sm outline-none focus:border-white/20"
										value={row.content}
										onChange={(e) => {
											const next = e.target.value;
											setRows((prev) =>
												prev.map((r) => (r.taskId === row.taskId ? { ...r, content: next } : r)),
											);
										}}
									/>
								</div>
							) : null}
						</section>
					);
				})}
			</div>
		</div>
	);
}
