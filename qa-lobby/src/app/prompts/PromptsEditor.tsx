"use client";

import { useState } from "react";

import type { PromptRecord } from "@/server/prompts/prompts";

async function request(url: string, init: RequestInit): Promise<unknown> {
	const res = await fetch(url, init);
	const text = await res.text();
	let json: { error?: string } = {};
	try {
		json = JSON.parse(text) as { error?: string };
	} catch {
		// ignore
	}
	if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
	return json;
}

export function PromptsEditor(props: { initial: PromptRecord[] }) {
	const [rows, setRows] = useState<PromptRecord[]>(props.initial);
	const [openTaskId, setOpenTaskId] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [dirty, setDirty] = useState<Record<string, boolean>>({});

	function update(taskId: string, patch: Partial<PromptRecord>) {
		setRows((prev) => prev.map((r) => (r.taskId === taskId ? { ...r, ...patch } : r)));
	}

	async function onSave(row: PromptRecord) {
		setBusyId(row.taskId);
		setError(null);
		try {
			await request(`/api/prompts/${encodeURIComponent(row.taskId)}`, {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ content: row.content }),
			});
			update(row.taskId, { source: "saved" });
			setDirty((d) => ({ ...d, [row.taskId]: false }));
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setBusyId(null);
		}
	}

	async function onReset(row: PromptRecord) {
		setBusyId(row.taskId);
		setError(null);
		try {
			const json = (await request(`/api/prompts/${encodeURIComponent(row.taskId)}`, {
				method: "DELETE",
			})) as Pick<PromptRecord, "content" | "source">;
			update(row.taskId, { content: json.content, source: json.source });
			setDirty((d) => ({ ...d, [row.taskId]: false }));
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setBusyId(null);
		}
	}

	if (rows.length === 0) {
		return <p className="text-sm text-muted">No agents found.</p>;
	}

	return (
		<div className="space-y-4">
			{error ? (
				<div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
					{error}
				</div>
			) : null}

			<div className="space-y-2">
				{rows.map((row) => {
					const isOpen = openTaskId === row.taskId;
					const isBusy = busyId === row.taskId;
					return (
						<section
							key={row.taskId}
							className={`card overflow-hidden transition ${isOpen ? "border-accent/25" : "hover:border-line-strong"}`}
						>
							<button
								type="button"
								aria-expanded={isOpen}
								onClick={() => setOpenTaskId((prev) => (prev === row.taskId ? null : row.taskId))}
								className="flex w-full items-center gap-4 px-4 py-3.5 text-left"
							>
								<span className="code-chip">{row.code}</span>
								<div className="min-w-0 flex-1">
									<h2 className="truncate text-sm font-semibold">{row.taskName}</h2>
									<p className="truncate text-xs text-muted">{row.taskDescription}</p>
								</div>
								<span
									className={`chip shrink-0 ${
										row.source === "saved" ? "border-accent-2/30 bg-accent-2/10 text-accent-2" : ""
									}`}
								>
									{row.source === "saved" ? "customized" : row.source}
								</span>
								<span className={`font-mono text-xs text-faint transition ${isOpen ? "rotate-90" : ""}`}>›</span>
							</button>

							{isOpen ? (
								<div className="space-y-3 border-t border-line bg-black/20 p-4">
									<textarea
										className="input h-96 resize-y font-mono text-xs leading-relaxed"
										spellCheck={false}
										value={row.content}
										onChange={(e) => {
											update(row.taskId, { content: e.target.value });
											setDirty((d) => ({ ...d, [row.taskId]: true }));
										}}
									/>
									<div className="flex flex-wrap items-center justify-between gap-3">
										<span className="font-mono text-[11px] text-faint">
											{row.content.length.toLocaleString()} chars · {row.category}
										</span>
										<div className="flex gap-2">
											{row.source === "saved" ? (
												<button
													type="button"
													onClick={() => onReset(row)}
													disabled={isBusy}
													className="btn-ghost px-3 py-1.5 text-xs"
												>
													Reset to default
												</button>
											) : null}
											<button
												type="button"
												onClick={() => onSave(row)}
												disabled={isBusy || !dirty[row.taskId]}
												className="btn-primary px-3 py-1.5 text-xs"
											>
												{isBusy ? "Saving…" : dirty[row.taskId] ? "Save changes" : "No changes"}
											</button>
										</div>
									</div>
								</div>
							) : null}
						</section>
					);
				})}
			</div>
		</div>
	);
}
