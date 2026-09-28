"use client";

import { useActionState, useState } from "react";

import { PROJECT_CONTEXT_MAX_CHARS } from "@/lib/project-context";

export type SaveContextState = { ok?: boolean; error?: string };

function preview(text: string): string {
	const line = text
		.split(/\r?\n/)
		.map((l) => l.replace(/^#+\s*/, "").trim())
		.find(Boolean);
	return line ? line.slice(0, 120) : "";
}

export function ProjectContextPanel(props: {
	initialContext: string;
	saveAction: (prev: SaveContextState, formData: FormData) => Promise<SaveContextState>;
}) {
	const [text, setText] = useState(props.initialContext);
	const [saved, setSaved] = useState(props.initialContext);
	// Read once: expanded when empty, collapsed when set; afterwards the user toggles it.
	const [initiallyOpen] = useState(!props.initialContext);
	const [state, formAction, isPending] = useActionState(async (prev: SaveContextState, formData: FormData) => {
		const next = await props.saveAction(prev, formData);
		if (!next.error) setSaved(String(formData.get("context") ?? "").trim());
		return next;
	}, {});

	const dirty = text.trim() !== saved;
	const count = text.trim().length;
	const nearLimit = count > PROJECT_CONTEXT_MAX_CHARS * 0.9;

	return (
		<details className="card group" open={initiallyOpen}>
			<summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 sm:px-6 [&::-webkit-details-marker]:hidden">
				<span
					className={`size-1.5 shrink-0 rounded-full ${saved ? "bg-ok shadow-[0_0_8px] shadow-ok" : "bg-line-strong"}`}
				/>
				<span className="eyebrow shrink-0">Project context</span>
				<span className="min-w-0 flex-1 truncate text-sm text-muted">
					{saved ? preview(saved) : "Not set. Describe the project so every agent can use it."}
				</span>
				{saved ? <span className="chip hidden shrink-0 sm:inline-flex">used by all agents</span> : null}
				<span aria-hidden className="shrink-0 font-mono text-xs text-faint transition group-open:rotate-90">
					›
				</span>
			</summary>

			<form action={formAction} className="space-y-3 border-t border-line px-5 py-4 sm:px-6">
				<p className="text-sm text-muted">
					Paste or write what an agent should know about this project: what the product does, key domain terms,
					components, environments, user roles, risky areas, and team conventions (severity scale, ticket format).
					It&apos;s added to every agent run in this project.
				</p>
				<textarea
					name="context"
					value={text}
					onChange={(e) => setText(e.target.value)}
					maxLength={PROJECT_CONTEXT_MAX_CHARS}
					rows={10}
					placeholder={
						"e.g. Checkout service for an online grocery store.\n" +
						"- Users: guests, members, store admins\n" +
						"- Environments: dev, staging (daily deploy), prod\n" +
						"- Payments via Adyen; promo codes are a frequent source of bugs\n" +
						"- Severity: S1 blocks checkout, S2 wrong totals, S3 cosmetic"
					}
					className="input resize-y leading-relaxed"
				/>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<p className={`font-mono text-[11px] tabular-nums ${nearLimit ? "text-warn" : "text-faint"}`}>
						{count.toLocaleString()} / {PROJECT_CONTEXT_MAX_CHARS.toLocaleString()} characters
					</p>
					<div className="flex items-center gap-3">
						{state.error ? (
							<span className="font-mono text-[11px] text-danger">{state.error}</span>
						) : !dirty && state.ok ? (
							<span className="font-mono text-[11px] text-ok">Saved</span>
						) : null}
						<button type="submit" disabled={!dirty || isPending} className="btn-ghost px-3 py-1.5 text-xs">
							{isPending ? "Saving…" : "Save context"}
						</button>
					</div>
				</div>
			</form>
		</details>
	);
}
