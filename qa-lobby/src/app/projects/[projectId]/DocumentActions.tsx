"use client";

import { useState } from "react";

function slugify(text: string): string {
	return (
		text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 60) || "document"
	);
}

export function DocumentActions(props: { markdown: string; title: string; createdAt: string }) {
	const [copied, setCopied] = useState(false);

	async function onCopy() {
		await navigator.clipboard.writeText(props.markdown);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}

	function onDownload() {
		const blob = new Blob([props.markdown], { type: "text/markdown;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${props.createdAt.slice(0, 10)}-${slugify(props.title)}.md`;
		a.click();
		URL.revokeObjectURL(url);
	}

	return (
		<>
			<button type="button" onClick={onCopy} className="btn-ghost px-2.5 py-1 text-xs">
				{copied ? "Copied ✓" : "Copy MD"}
			</button>
			<button type="button" onClick={onDownload} className="btn-ghost px-2.5 py-1 text-xs">
				Download .md
			</button>
		</>
	);
}
