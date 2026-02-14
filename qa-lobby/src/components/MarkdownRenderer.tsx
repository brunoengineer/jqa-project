import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownRenderer(props: { markdown: string }) {
	return (
		<div className="text-sm leading-6 text-zinc-800 dark:text-zinc-200">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					h1: (p) => (
						<h1 className="text-sm font-semibold mb-2" {...p} />
					),
					h2: (p) => (
						<h2 className="text-sm font-semibold mt-4 mb-2" {...p} />
					),
					h3: (p) => (
						<h3 className="text-sm font-semibold mt-3 mb-2" {...p} />
					),
					p: (p) => <p className="mb-2" {...p} />,
					ul: (p) => <ul className="mb-2 list-disc pl-5" {...p} />,
					ol: (p) => <ol className="mb-2 list-decimal pl-5" {...p} />,
					li: (p) => <li className="mb-1" {...p} />,
					blockquote: (p) => (
						<blockquote
							className="border-l-2 border-black/[.12] pl-3 italic dark:border-white/15"
							{...p}
						/>
					),
					code: ({ className, ...rest }) => (
						<code
							className={`rounded px-1 py-0.5 font-mono text-[0.85em] bg-black/[.06] dark:bg-white/10 ${className ?? ""}`}
							{...rest}
						/>
					),
					pre: (p) => (
						<pre
							className="mb-3 overflow-auto rounded-md border border-black/[.08] bg-black/[.03] p-3 dark:border-white/10 dark:bg-white/5"
							{...p}
						/>
					),
					a: (p) => (
						<a className="underline underline-offset-2" {...p} />
					),
					table: (p) => (
						<div className="mb-3 overflow-auto">
							<table className="w-full border-collapse" {...p} />
						</div>
					),
					th: (p) => (
						<th
							className="border border-black/[.08] px-2 py-1 text-left font-semibold dark:border-white/10"
							{...p}
						/>
					),
					td: (p) => (
						<td
							className="border border-black/[.08] px-2 py-1 align-top dark:border-white/10"
							{...p}
						/>
					),
				}}
			>
				{props.markdown}
			</ReactMarkdown>
		</div>
	);
}
