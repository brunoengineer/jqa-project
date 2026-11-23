"use client";

import { useMemo, useState } from "react";

import { ConfirmButton } from "@/components/ConfirmButton";
import type { AgentWithPrompt } from "@/server/agents";
import { DEFAULT_CUSTOM_CATEGORY, orderCategories, taskCategories, type AgentRecord } from "@/tasks/registry";

import {
	AgentDetailsEditor,
	blankField,
	detailsPayload,
	toFieldDrafts,
	type AgentDetailsDraft,
} from "./AgentDetailsEditor";

const INSTRUCTIONS_TEMPLATE = `You are a senior QA engineer. <Describe the agent's role and goal in one or two sentences.>

## Task

Using the input below, <describe what the agent must produce>.

## Output Format

<Describe the sections, tables, or checklists the document must contain.>

## Output Rules

- This is a single-shot generation: never ask follow-up questions or wait for more input. When a detail is missing, make a reasonable assumption and list it under an "Assumptions" note.
- Respond with the final Markdown document only — no preamble, no closing remarks, and do not wrap the whole response in a code block.
`;

function newAgentDraft(): AgentDetailsDraft {
	return {
		name: "",
		code: "",
		category: DEFAULT_CUSTOM_CATEGORY,
		description: "",
		fields: [
			{
				...blankField(),
				label: "Input",
				required: true,
				rows: 8,
				allowFiles: true,
				placeholder: "Paste the content the agent should work on.",
			},
		],
	};
}

function draftFromAgent(agent: AgentRecord): AgentDetailsDraft {
	return {
		name: agent.name,
		code: agent.code,
		category: agent.category,
		description: agent.description,
		fields: toFieldDrafts(agent.fields),
	};
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
	const res = await fetch(url, init);
	const text = await res.text();
	let json: { error?: string } = {};
	try {
		json = JSON.parse(text) as { error?: string };
	} catch {
		// ignore
	}
	if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
	return json as T;
}

function jsonInit(method: string, body: unknown): RequestInit {
	return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

type Tab = "instructions" | "details";

export function AgentsManager(props: { initial: AgentWithPrompt[]; removed: AgentRecord[] }) {
	const [rows, setRows] = useState<AgentWithPrompt[]>(props.initial);
	const [removed, setRemoved] = useState<AgentRecord[]>(props.removed);
	const [openId, setOpenId] = useState<string | null>(null);
	const [tab, setTab] = useState<Tab>("instructions");
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [dirty, setDirty] = useState<Record<string, boolean>>({});
	const [detailDrafts, setDetailDrafts] = useState<Record<string, AgentDetailsDraft>>({});

	const [creating, setCreating] = useState(false);
	const [createDraft, setCreateDraft] = useState<AgentDetailsDraft>(newAgentDraft);
	const [createInstructions, setCreateInstructions] = useState(INSTRUCTIONS_TEMPLATE);

	const categories = useMemo(
		() => [...new Set([...taskCategories, ...rows.map((r) => r.category), DEFAULT_CUSTOM_CATEGORY])],
		[rows],
	);
	const groups = useMemo(
		() => orderCategories(rows).map((category) => ({ category, items: rows.filter((r) => r.category === category) })),
		[rows],
	);

	function update(id: string, patch: Partial<AgentWithPrompt>) {
		setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
	}

	/** Runs an API action with shared busy/error handling. */
	async function run(id: string, action: () => Promise<void>) {
		setBusyId(id);
		setError(null);
		setNotice(null);
		try {
			await action();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setBusyId(null);
		}
	}

	function toggle(row: AgentWithPrompt) {
		setOpenId((prev) => (prev === row.id ? null : row.id));
		setTab("instructions");
	}

	const onSaveInstructions = (row: AgentWithPrompt) =>
		run(row.id, async () => {
			await request(`/api/prompts/${encodeURIComponent(row.id)}`, jsonInit("PUT", { content: row.content }));
			update(row.id, { source: "saved" });
			setDirty((d) => ({ ...d, [row.id]: false }));
		});

	const onResetInstructions = (row: AgentWithPrompt) =>
		run(row.id, async () => {
			const json = await request<Pick<AgentWithPrompt, "content" | "source">>(
				`/api/prompts/${encodeURIComponent(row.id)}`,
				{ method: "DELETE" },
			);
			update(row.id, { content: json.content, source: json.source });
			setDirty((d) => ({ ...d, [row.id]: false }));
		});

	const onSaveDetails = (row: AgentWithPrompt) =>
		run(row.id, async () => {
			const draft = detailDrafts[row.id];
			if (!draft) return;
			const { agent } = await request<{ agent: AgentWithPrompt }>(
				`/api/agents/${encodeURIComponent(row.id)}`,
				jsonInit("PATCH", detailsPayload(draft)),
			);
			// Keep any unsaved instruction edits; take everything else from the server.
			update(row.id, { ...agent, content: row.content, source: row.source });
			setDetailDrafts((d) => ({ ...d, [row.id]: draftFromAgent(agent) }));
			setNotice(`Saved details for ${agent.name}.`);
		});

	const onDelete = (row: AgentWithPrompt) =>
		run(row.id, async () => {
			await request(`/api/agents/${encodeURIComponent(row.id)}`, { method: "DELETE" });
			setRows((prev) => prev.filter((r) => r.id !== row.id));
			if (row.builtIn) setRemoved((prev) => [...prev, row]);
			setOpenId(null);
			setNotice(
				row.builtIn
					? `Removed ${row.name}. You can restore it below; its documents are kept.`
					: `Deleted ${row.name}. Documents it generated are kept in their projects.`,
			);
		});

	const onRestore = (agent: AgentRecord) =>
		run(agent.id, async () => {
			const json = await request<{ agent: AgentWithPrompt }>(
				`/api/agents/${encodeURIComponent(agent.id)}/restore`,
				{ method: "POST" },
			);
			setRemoved((prev) => prev.filter((r) => r.id !== agent.id));
			// Keep built-ins listed ahead of custom agents.
			setRows((prev) => {
				const next = [...prev.filter((r) => r.id !== agent.id), json.agent];
				return [...next.filter((r) => r.builtIn), ...next.filter((r) => !r.builtIn)];
			});
			setNotice(`Restored ${agent.name}.`);
		});

	const onCreate = () =>
		run("__new__", async () => {
			const { agent } = await request<{ agent: AgentWithPrompt }>(
				"/api/agents",
				jsonInit("POST", { ...detailsPayload(createDraft), instructions: createInstructions }),
			);
			setRows((prev) => [...prev, agent]);
			setCreating(false);
			setCreateDraft(newAgentDraft());
			setCreateInstructions(INSTRUCTIONS_TEMPLATE);
			setOpenId(agent.id);
			setTab("instructions");
			setNotice(`Created ${agent.name}. It's now available in every project.`);
		});

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex gap-2">
					<span className="chip">{rows.length} active</span>
					<span className="chip">{rows.filter((r) => !r.builtIn).length} custom</span>
				</div>
				{!creating ? (
					<button
						type="button"
						className="btn-primary"
						onClick={() => {
							setCreating(true);
							setError(null);
							setNotice(null);
						}}
					>
						+ New agent
					</button>
				) : null}
			</div>

			{error ? (
				<div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
					{error}
				</div>
			) : null}
			{notice ? (
				<div className="rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 font-mono text-xs text-ok">{notice}</div>
			) : null}

			{creating ? (
				<section className="card space-y-5 border-accent/25 p-5">
					<div className="space-y-1">
						<p className="eyebrow">New agent</p>
						<p className="text-sm text-muted">
							Define what the user fills in and the instructions the model runs with. The agent shows up in every
							project.
						</p>
					</div>
					<AgentDetailsEditor
						idPrefix="new-agent"
						value={createDraft}
						onChange={setCreateDraft}
						categories={categories}
						disabled={busyId === "__new__"}
					/>
					<div className="space-y-1.5">
						<label htmlFor="new-agent-instructions" className="field-label">
							Instructions<span className="ml-1 text-accent">*</span>
						</label>
						<textarea
							id="new-agent-instructions"
							className="input h-80 resize-y font-mono text-xs leading-relaxed"
							spellCheck={false}
							value={createInstructions}
							disabled={busyId === "__new__"}
							onChange={(e) => setCreateInstructions(e.target.value)}
						/>
						<p className="text-xs text-faint">
							Sent as the system prompt. The user&apos;s field values (and project context, if enabled) are sent as the
							message.
						</p>
					</div>
					<div className="flex justify-end gap-2">
						<button
							type="button"
							className="btn-ghost px-3 py-1.5 text-xs"
							disabled={busyId === "__new__"}
							onClick={() => setCreating(false)}
						>
							Cancel
						</button>
						<button
							type="button"
							className="btn-primary px-3 py-1.5 text-xs"
							disabled={busyId === "__new__" || !createDraft.name.trim() || !createInstructions.trim()}
							onClick={() => void onCreate()}
						>
							{busyId === "__new__" ? "Creating…" : "Create agent"}
						</button>
					</div>
				</section>
			) : null}

			{rows.length === 0 ? (
				<p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-faint">
					No active agents. Create one, or restore a built-in agent below.
				</p>
			) : null}

			{groups.map(({ category, items }) => (
				<div key={category} className="space-y-2">
					<p className="eyebrow px-1">{category}</p>
					{items.map((row) => {
						const isOpen = openId === row.id;
						const isBusy = busyId === row.id;
						const activeTab: Tab = row.builtIn ? "instructions" : tab;
						const detailsDraft = detailDrafts[row.id] ?? draftFromAgent(row);
						return (
							<section
								key={row.id}
								className={`card overflow-hidden transition ${isOpen ? "border-accent/25" : "hover:border-line-strong"}`}
							>
								<button
									type="button"
									aria-expanded={isOpen}
									onClick={() => toggle(row)}
									className="flex w-full items-center gap-4 px-4 py-3.5 text-left"
								>
									<span className="code-chip">{row.code}</span>
									<div className="min-w-0 flex-1">
										<h2 className="truncate text-sm font-semibold">{row.name}</h2>
										<p className="truncate text-xs text-muted">{row.description || "No description"}</p>
									</div>
									{!row.builtIn ? (
										<span className="chip shrink-0 border-accent/30 bg-accent/10 text-accent">custom</span>
									) : row.source === "saved" ? (
										<span className="chip shrink-0 border-accent-2/30 bg-accent-2/10 text-accent-2">customized</span>
									) : (
										<span className="chip shrink-0">{row.source}</span>
									)}
									<span className={`font-mono text-xs text-faint transition ${isOpen ? "rotate-90" : ""}`}>›</span>
								</button>

								{isOpen ? (
									<div className="space-y-3 border-t border-line bg-black/20 p-4">
										{!row.builtIn ? (
											<div className="flex gap-1" role="tablist">
												{(["instructions", "details"] as const).map((t) => (
													<button
														key={t}
														type="button"
														role="tab"
														aria-selected={activeTab === t}
														onClick={() => setTab(t)}
														className={`rounded-md px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition ${
															activeTab === t ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"
														}`}
													>
														{t === "details" ? "Details & fields" : "Instructions"}
														{t === "instructions" && dirty[row.id] ? " •" : ""}
													</button>
												))}
											</div>
										) : null}

										{activeTab === "instructions" ? (
											<textarea
												aria-label={`${row.name} instructions`}
												className="input h-96 resize-y font-mono text-xs leading-relaxed"
												spellCheck={false}
												value={row.content}
												onChange={(e) => {
													update(row.id, { content: e.target.value });
													setDirty((d) => ({ ...d, [row.id]: true }));
												}}
											/>
										) : (
											<AgentDetailsEditor
												idPrefix={`agent-${row.id}`}
												value={detailsDraft}
												onChange={(next) => setDetailDrafts((d) => ({ ...d, [row.id]: next }))}
												categories={categories}
												disabled={isBusy}
											/>
										)}

										<div className="flex flex-wrap items-center justify-between gap-3">
											<div className="flex items-center gap-3">
												<ConfirmButton
													label={row.builtIn ? "Remove agent" : "Delete agent"}
													confirmLabel={row.builtIn ? "Confirm remove" : "Confirm delete"}
													disabled={isBusy}
													onConfirm={() => void onDelete(row)}
												/>
												<span className="font-mono text-[11px] text-faint">
													{activeTab === "instructions"
														? `${row.content.length.toLocaleString()} chars · ${row.id}`
														: `${detailsDraft.fields.length} fields · ${row.id}`}
												</span>
											</div>
											<div className="flex gap-2">
												{activeTab === "instructions" ? (
													<>
														{row.builtIn && row.source === "saved" ? (
															<button
																type="button"
																onClick={() => void onResetInstructions(row)}
																disabled={isBusy}
																className="btn-ghost px-3 py-1.5 text-xs"
															>
																Reset to default
															</button>
														) : null}
														<button
															type="button"
															onClick={() => void onSaveInstructions(row)}
															disabled={isBusy || !dirty[row.id]}
															className="btn-primary px-3 py-1.5 text-xs"
														>
															{isBusy ? "Saving…" : dirty[row.id] ? "Save instructions" : "No changes"}
														</button>
													</>
												) : (
													<button
														type="button"
														onClick={() => void onSaveDetails(row)}
														disabled={isBusy || !detailDrafts[row.id]}
														className="btn-primary px-3 py-1.5 text-xs"
													>
														{isBusy ? "Saving…" : "Save details"}
													</button>
												)}
											</div>
										</div>
									</div>
								) : null}
							</section>
						);
					})}
				</div>
			))}

			{removed.length > 0 ? (
				<div className="space-y-2">
					<p className="eyebrow px-1">Removed built-in agents</p>
					<ul className="card divide-y divide-line">
						{removed.map((agent) => (
							<li key={agent.id} className="flex items-center gap-4 px-4 py-3">
								<span className="code-chip border-line bg-surface-2 text-muted">{agent.code}</span>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm text-muted">{agent.name}</p>
									<p className="truncate text-xs text-faint">{agent.description}</p>
								</div>
								<button
									type="button"
									className="btn-ghost px-3 py-1.5 text-xs"
									disabled={busyId === agent.id}
									onClick={() => void onRestore(agent)}
								>
									{busyId === agent.id ? "Restoring…" : "Restore"}
								</button>
							</li>
						))}
					</ul>
				</div>
			) : null}
		</div>
	);
}
