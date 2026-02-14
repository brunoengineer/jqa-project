"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Provider = "ollama" | "openai";

const LS_PROVIDER_KEY = "qaLobby.llm.provider";
const LS_MODEL_KEY = "qaLobby.llm.model";

function isProvider(value: unknown): value is Provider {
	return value === "ollama" || value === "openai";
}

function buildBugTicketPrompt(input: {
	description: string;
	title?: string;
	stepsToReproduce?: string;
	expectedBehavior?: string;
	actualBehavior?: string;
}): string {
	const lines: string[] = [];
	lines.push(
		"You are a QA assistant. Produce a high-quality bug ticket in Markdown.",
	);
	lines.push("Use clear headings and bullet lists.");
	lines.push("Do not include any non-Markdown wrappers.");
	lines.push("");
	lines.push("## Title");
	lines.push(input.title?.trim() ? input.title.trim() : "(Infer a concise title)");
	lines.push("");
	lines.push("## Description");
	lines.push(input.description.trim());

	if (input.stepsToReproduce?.trim()) {
		lines.push("");
		lines.push("## Steps to Reproduce");
		lines.push(input.stepsToReproduce.trim());
	}
	if (input.expectedBehavior?.trim()) {
		lines.push("");
		lines.push("## Expected Behavior");
		lines.push(input.expectedBehavior.trim());
	}
	if (input.actualBehavior?.trim()) {
		lines.push("");
		lines.push("## Actual Behavior");
		lines.push(input.actualBehavior.trim());
	}

	lines.push("");
	lines.push("## Environment");
	lines.push("- App/version: (unknown)");
	lines.push("- Browser: (unknown)");
	lines.push("- OS: (unknown)");
	lines.push("");
	lines.push("## Notes / Attachments");
	lines.push("- (Optional)");

	return lines.join("\n");
}

export function BugTicketForm(props: { projectId: string }) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const [provider, setProvider] = useState<Provider>("ollama");
	const [model, setModel] = useState<string>("llama3.1");
	const [title, setTitle] = useState<string>("");
	const [description, setDescription] = useState<string>("");
	const [stepsToReproduce, setStepsToReproduce] = useState<string>("");
	const [expectedBehavior, setExpectedBehavior] = useState<string>("");
	const [actualBehavior, setActualBehavior] = useState<string>("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function persistProvider(next: Provider) {
		try {
			window.localStorage.setItem(LS_PROVIDER_KEY, next);
		} catch {
			// ignore
		}
	}

	function persistModel(next: string) {
		try {
			window.localStorage.setItem(LS_MODEL_KEY, next);
		} catch {
			// ignore
		}
	}

	useEffect(() => {
		try {
			const savedProvider = window.localStorage.getItem(LS_PROVIDER_KEY);
			const savedModel = window.localStorage.getItem(LS_MODEL_KEY);
			if (isProvider(savedProvider)) setProvider(savedProvider);
			if (typeof savedModel === "string" && savedModel.trim()) setModel(savedModel);
		} catch {
			// ignore
		}
	}, []);

	const canSubmit = useMemo(() => {
		return description.trim().length > 0 && model.trim().length > 0 && !isLoading;
	}, [description, model, isLoading]);

	async function onGenerate() {
		setIsLoading(true);
		setError(null);
		try {
			persistProvider(provider);
			persistModel(model);

			const prompt = buildBugTicketPrompt({
				title,
				description,
				stepsToReproduce,
				expectedBehavior,
				actualBehavior,
			});

			const genRes = await fetch("/api/llm/generate", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					provider,
					model,
					taskId: "create-bug-ticket",
					prompt,
				}),
			});

			const genText = await genRes.text();
			if (!genRes.ok) {
				let msg = `LLM error (${genRes.status})`;
				try {
					const parsed = JSON.parse(genText) as { error?: string };
					if (parsed.error) msg = parsed.error;
				} catch {
					// ignore
				}
				throw new Error(msg);
			}

			const genJson = JSON.parse(genText) as { markdown: string };
			const markdown = typeof genJson.markdown === "string" ? genJson.markdown : "";
			if (!markdown.trim()) {
				throw new Error("LLM returned empty markdown");
			}

			const derivedTitle = (() => {
				const explicit = title.trim();
				if (explicit) return explicit;
				const firstLine = description
					.trim()
					.replace(/\s+/g, " ")
					.slice(0, 80)
					.trim();
				return firstLine || undefined;
			})();

			const saveRes = await fetch(`/api/projects/${props.projectId}/outputs`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					taskId: "create-bug-ticket",
					title: derivedTitle,
					input: {
						provider,
						model,
						title: derivedTitle,
						description,
						stepsToReproduce: stepsToReproduce || undefined,
						expectedBehavior: expectedBehavior || undefined,
						actualBehavior: actualBehavior || undefined,
					},
					markdown,
				}),
			});

			const saveText = await saveRes.text();
			if (!saveRes.ok) {
				let msg = `Save error (${saveRes.status})`;
				try {
					const parsed = JSON.parse(saveText) as { error?: string };
					if (parsed.error) msg = parsed.error;
				} catch {
					// ignore
				}
				throw new Error(msg);
			}

			const saveJson = JSON.parse(saveText) as { output?: { id?: string } };
			const newOutputId = saveJson.output?.id;

			router.refresh();
			if (newOutputId) {
				const next = new URLSearchParams(searchParams);
				next.set("taskId", "create-bug-ticket");
				next.set("outputId", newOutputId);
				router.push(`?${next.toString()}`);
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-3">
				<label className="flex items-center gap-2">
					<span className="text-sm font-medium">Provider</span>
					<select
						value={provider}
						onChange={(e) => {
							const next = e.target.value as Provider;
							setProvider(next);
							persistProvider(next);
						}}
						className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:focus:ring-white/20"
					>
						<option value="ollama">Ollama</option>
						<option value="openai">OpenAI</option>
					</select>
				</label>

				<label className="flex flex-1 items-center gap-2 min-w-[240px]">
					<span className="text-sm font-medium">Model</span>
					<input
						value={model}
						onChange={(e) => {
							const next = e.target.value;
							setModel(next);
							persistModel(next);
						}}
						placeholder={provider === "ollama" ? "e.g. llama3.1" : "e.g. gpt-4.1-mini"}
						className="flex-1 rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:focus:ring-white/20"
					/>
				</label>
			</div>

			<div className="space-y-2">
				<label className="block text-sm font-medium">Description</label>
				<textarea
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					required
					rows={6}
					className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:focus:ring-white/20"
					placeholder="What happened? What’s broken?"
				/>
			</div>

			<details className="rounded-md border border-black/[.08] p-3 dark:border-white/10">
				<summary className="cursor-pointer text-sm font-medium">
					Optional fields
				</summary>
				<div className="mt-3 space-y-3">
					<div className="space-y-1">
						<label className="block text-sm font-medium">Title</label>
						<input
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:focus:ring-white/20"
							placeholder="Short summary"
						/>
					</div>
					<div className="space-y-1">
						<label className="block text-sm font-medium">Steps to reproduce</label>
						<textarea
							value={stepsToReproduce}
							onChange={(e) => setStepsToReproduce(e.target.value)}
							rows={4}
							className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:focus:ring-white/20"
						/>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-1">
							<label className="block text-sm font-medium">Expected behavior</label>
							<textarea
								value={expectedBehavior}
								onChange={(e) => setExpectedBehavior(e.target.value)}
								rows={4}
								className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:focus:ring-white/20"
							/>
						</div>
						<div className="space-y-1">
							<label className="block text-sm font-medium">Actual behavior</label>
							<textarea
								value={actualBehavior}
								onChange={(e) => setActualBehavior(e.target.value)}
								rows={4}
								className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:focus:ring-white/20"
							/>
						</div>
					</div>
				</div>
			</details>

			{error ? (
				<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
			) : null}

			<button
				type="button"
				onClick={onGenerate}
				disabled={!canSubmit}
				className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
			>
				{isLoading ? "Generating…" : "Generate"}
			</button>
		</div>
	);
}
