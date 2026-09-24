"use client";

import { useEffect, useId, useState } from "react";

import { providers } from "@/lib/providers";
import type { LlmProvider, ProviderModels } from "@/server/llm/types";

export function ModelBar(props: {
	provider: LlmProvider;
	model: string;
	onProviderChange: (p: LlmProvider) => void;
	onModelChange: (m: string) => void;
}) {
	const listId = useId();
	const [status, setStatus] = useState<Record<string, ProviderModels>>({});
	const current = status[props.provider];

	useEffect(() => {
		let cancelled = false;
		fetch(`/api/llm/models?provider=${props.provider}`, { cache: "no-store" })
			.then((r) => r.json() as Promise<ProviderModels>)
			.catch(() => ({ available: false, models: [], message: "Could not check provider" }))
			.then((data) => {
				if (!cancelled) setStatus((s) => ({ ...s, [props.provider]: data }));
			});
		return () => {
			cancelled = true;
		};
	}, [props.provider]);

	// Ollama and Copilot report the exact models you can use; flag a mismatch.
	const listIsExhaustive = props.provider === "ollama" || props.provider === "copilot";
	const modelMissing =
		listIsExhaustive && current?.available && current.models.length > 0 && !current.models.includes(props.model.trim());

	const dot = !current
		? "bg-faint animate-pulse"
		: current.available
			? "bg-ok shadow-[0_0_8px] shadow-ok/70"
			: "bg-warn";

	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-center gap-3">
				<div role="radiogroup" aria-label="Provider" className="flex rounded-lg border border-line bg-black/30 p-0.5">
					{providers.map((p) => {
						const active = p.id === props.provider;
						return (
							<button
								key={p.id}
								type="button"
								role="radio"
								aria-checked={active}
								title={p.hint}
								onClick={() => props.onProviderChange(p.id)}
								className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
									active ? "bg-surface-2 text-fg shadow-[inset_0_0_0_1px] shadow-line-strong" : "text-muted hover:text-fg"
								}`}
							>
								{p.label}
							</button>
						);
					})}
				</div>

				<label className="flex min-w-[220px] flex-1 items-center gap-2">
					<span className="field-label shrink-0">Model</span>
					<input
						value={props.model}
						onChange={(e) => props.onModelChange(e.target.value)}
						list={listId}
						spellCheck={false}
						className="input py-1.5 font-mono text-xs"
					/>
					<datalist id={listId}>
						{current?.models.map((m) => <option key={m} value={m} />)}
					</datalist>
				</label>
			</div>

			<p className="flex items-center gap-2 font-mono text-[11px] text-muted">
				<span className={`inline-block size-1.5 rounded-full ${dot}`} />
				{!current
					? "Checking provider…"
					: current.available
						? (current.message ?? `Ready · ${current.models.length} model${current.models.length === 1 ? "" : "s"} available`)
						: current.message}
			</p>

			{modelMissing ? (
				<div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-warn">
					<span>&ldquo;{props.model}&rdquo; isn&apos;t available — use:</span>
					{current.models.slice(0, 4).map((m) => (
						<button
							key={m}
							type="button"
							onClick={() => props.onModelChange(m)}
							className="rounded border border-warn/30 bg-warn/10 px-1.5 py-0.5 text-warn transition hover:bg-warn/20"
						>
							{m}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}
