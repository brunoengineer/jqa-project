"use client";

import { useEffect, useId, useState } from "react";

type MermaidApi = typeof import("mermaid").default;

// Mermaid is large (~1 MB), so it is loaded only when a document actually contains a diagram,
// and initialized once per page.
let mermaidPromise: Promise<MermaidApi> | null = null;

function loadMermaid(): Promise<MermaidApi> {
	mermaidPromise ??= import("mermaid").then(({ default: mermaid }) => {
		mermaid.initialize({
			startOnLoad: false,
			// "strict" sanitizes labels and disables click handlers/scripts in diagrams.
			securityLevel: "strict",
			theme: "base",
			darkMode: true,
			fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
			// Matches the app's dark palette (see globals.css).
			themeVariables: {
				background: "transparent",
				primaryColor: "#12161f",
				primaryTextColor: "#e7e9ef",
				primaryBorderColor: "#22d3ee",
				secondaryColor: "#1a1730",
				secondaryTextColor: "#e7e9ef",
				secondaryBorderColor: "#a78bfa",
				tertiaryColor: "#0d1017",
				tertiaryTextColor: "#e7e9ef",
				tertiaryBorderColor: "#5b6072",
				lineColor: "#8a90a2",
				textColor: "#e7e9ef",
				mainBkg: "#12161f",
				nodeBorder: "#22d3ee",
				clusterBkg: "#0d1017",
				clusterBorder: "#5b6072",
				edgeLabelBackground: "#07080c",
				noteBkgColor: "#1a1730",
				noteTextColor: "#e7e9ef",
				noteBorderColor: "#a78bfa",
				actorBkg: "#12161f",
				actorBorder: "#22d3ee",
				actorTextColor: "#e7e9ef",
				signalColor: "#8a90a2",
				signalTextColor: "#e7e9ef",
				labelBoxBkgColor: "#12161f",
				labelTextColor: "#e7e9ef",
				fontSize: "14px",
			},
		});
		return mermaid;
	});
	return mermaidPromise;
}

type RenderState = { status: "loading" } | { status: "ok"; svg: string } | { status: "error"; message: string };

/** Renders a Mermaid code block as a diagram, with a toggle to see the source. Falls back to the code on error. */
export function MermaidDiagram(props: { code: string }) {
	const reactId = useId();
	const [state, setState] = useState<RenderState>({ status: "loading" });
	const [showCode, setShowCode] = useState(false);

	useEffect(() => {
		let cancelled = false;
		// Mermaid uses the id in CSS selectors, so it must be a plain identifier.
		const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

		(async () => {
			try {
				const mermaid = await loadMermaid();
				// Parse first: a failed render() can leave a stray error graphic in <body>.
				await mermaid.parse(props.code);
				const { svg } = await mermaid.render(id, props.code);
				if (!cancelled) setState({ status: "ok", svg });
			} catch (e) {
				document.getElementById(`d${id}`)?.remove();
				if (!cancelled) {
					setState({ status: "error", message: e instanceof Error ? e.message.split("\n")[0] : "Invalid diagram" });
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [props.code, reactId]);

	const source = (
		<pre className="overflow-auto p-4 text-[13px] leading-6 text-fg/90">
			<code className="font-mono">{props.code}</code>
		</pre>
	);

	return (
		<figure className="mb-4 overflow-hidden rounded-lg border border-line bg-black/40">
			<div className="flex items-center justify-between gap-3 border-b border-line px-3 py-1.5">
				<span className="font-mono text-[11px] uppercase tracking-wider text-faint">
					{state.status === "error" ? "Diagram · could not render" : "Diagram"}
				</span>
				{state.status === "ok" ? (
					<button
						type="button"
						onClick={() => setShowCode((v) => !v)}
						className="font-mono text-[11px] text-muted transition hover:text-accent"
					>
						{showCode ? "Show diagram" : "Show code"}
					</button>
				) : null}
			</div>

			{state.status === "loading" ? (
				<div className="px-4 py-8 text-center font-mono text-xs text-faint">Rendering diagram…</div>
			) : state.status === "error" ? (
				<>
					<p className="border-b border-line bg-warn/5 px-4 py-2 font-mono text-[11px] text-warn">{state.message}</p>
					{source}
				</>
			) : showCode ? (
				source
			) : (
				<div
					className="flex justify-center overflow-x-auto p-4 [&_svg]:h-auto [&_svg]:max-w-full"
					// Output of mermaid.render with securityLevel "strict" (sanitized by Mermaid's DOMPurify pass).
					dangerouslySetInnerHTML={{ __html: state.svg }}
				/>
			)}
		</figure>
	);
}
