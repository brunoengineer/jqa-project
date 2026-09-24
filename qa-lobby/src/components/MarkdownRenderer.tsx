import type { Element, Root, RootContent } from "hast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Models often put <br> inside table cells for multi-line steps. Render just that
// tag as a line break; all other raw HTML stays escaped.
function rehypeLineBreaks() {
	const br: Element = { type: "element", tagName: "br", properties: {}, children: [] };
	const visit = (node: Root | RootContent) => {
		if (!("children" in node)) return;
		node.children = node.children.map((child) => {
			if (child.type === "raw" && /^<br\s*\/?>$/i.test(child.value.trim())) return { ...br };
			visit(child);
			return child;
		}) as typeof node.children;
	};
	return (tree: Root) => visit(tree);
}

export function MarkdownRenderer(props: { markdown: string }) {
	return (
		<div className="text-[15px] leading-7 text-fg/90">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[rehypeLineBreaks]}
				components={{
					h1: (p) => (
						<h1
							className="mb-5 border-b border-line pb-3 text-2xl font-semibold tracking-tight text-fg"
							{...p}
						/>
					),
					h2: (p) => (
						<h2 className="mt-8 mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight text-fg before:h-4 before:w-1 before:rounded-full before:bg-gradient-to-b before:from-accent before:to-accent-2" {...p} />
					),
					h3: (p) => <h3 className="mt-6 mb-2 text-base font-semibold text-fg" {...p} />,
					h4: (p) => <h4 className="mt-4 mb-2 text-sm font-semibold text-fg" {...p} />,
					p: (p) => <p className="mb-3" {...p} />,
					strong: (p) => <strong className="font-semibold text-fg" {...p} />,
					ul: (p) => <ul className="mb-3 list-disc space-y-1 pl-5 marker:text-accent/70" {...p} />,
					ol: (p) => <ol className="mb-3 list-decimal space-y-1 pl-5 marker:font-mono marker:text-muted" {...p} />,
					li: (p) => <li className="pl-1" {...p} />,
					hr: () => <hr className="my-6 border-line" />,
					blockquote: (p) => (
						<blockquote className="mb-3 rounded-r-lg border-l-2 border-accent-2/60 bg-accent-2/5 py-1 pl-4 text-muted" {...p} />
					),
					code: ({ className, ...rest }) => (
						<code
							className={`rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-accent ${className ?? ""}`}
							{...rest}
						/>
					),
					pre: (p) => (
						<pre
							className="mb-4 overflow-auto rounded-lg border border-line bg-black/40 p-4 text-[13px] leading-6 [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-fg/90"
							{...p}
						/>
					),
					a: (p) => <a className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent" {...p} />,
					table: (p) => (
						<div className="mb-4 overflow-x-auto rounded-lg border border-line">
							<table className="w-full border-collapse text-sm" {...p} />
						</div>
					),
					thead: (p) => <thead className="bg-surface-2" {...p} />,
					th: (p) => (
						<th
							className="border-b border-line px-3 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-muted"
							{...p}
						/>
					),
					td: (p) => <td className="border-b border-line px-3 py-2 align-top" {...p} />,
					tr: (p) => <tr className="transition-colors hover:bg-surface" {...p} />,
				}}
			>
				{props.markdown}
			</ReactMarkdown>
		</div>
	);
}
