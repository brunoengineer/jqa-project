#!/usr/bin/env node
// Imports QA agent prompts from a local qa-agent-hub clone into ./prompts.
//
// Source of truth: <hub>/.claude/commands/<agent>.md + <hub>/.claude/CLAUDE.md
// Usage: npm run sync:agents [-- --hub <path-to-qa-agent-hub>]
//        (or set QA_AGENT_HUB_PATH; default: ../../qa-agent-hub)
//
// Each generated prompt = the agent's role line + the shared guidance sections
// it references + its task/output sections. Sections that only make sense in an
// interactive chat tool ("If No Input Provided", "File Output") are dropped,
// because QA Lobby always sends input and saves the output itself. "Chat Response"
// becomes "Author Notes": in QA Lobby the response *is* the saved document, so the
// hub's chat-only "Before you post" list goes at the end of it, below a divider.

import fs from "node:fs/promises";
import path from "node:path";

// Agents that work as one-shot "text in → Markdown out" generations.
// Excluded on purpose: write-tests, test-stability-check, automation-health-check,
// pr-description, slack-review-request (they need direct access to a codebase or
// git repository, or must execute tests).
const AGENTS = [
	"jira-bug",
	"bulk-jira-bugs",
	"jira-task",
	"root-cause-triage",
	"test-approach",
	"test-plan",
	"test-suggestions",
	"exploratory-test-charter",
	"coverage-analysis",
	"automation-gap-analysis",
	"release-readiness",
	"pr-review",
];

const DROPPED_SECTIONS = [/^If No Input Provided/i, /File Output/i];

// Rewrites for sections whose wording assumes a chat with a separate saved file.
const SECTION_REWRITES = [
	{
		heading: /^Chat Response$/i,
		rename: "Author Notes",
		replace: [
			[/ exactly as saved/g, ""],
			[/\(chat only, not in the file\)/g, "at the end of the document, below a `---` line,"],
		],
	},
];

// If any of these survive the transform, the hub wording changed and this script needs updating.
const FORBIDDEN_OUTPUT = [/\$ARGUMENTS/, /chat only/i, /not in the file/i, /qa-agent-hub\/response/i, /^## Chat Response/m];

// Lines that conflict with how QA Lobby renders and stores output.
const DROPPED_LINES = [
	/Return the response in a (Markdown )?code block/i,
	/filename|slug|saved file/i,
];

const LOBBY_RULES = `## Output Rules

- This is a single-shot generation: never ask follow-up questions or wait for more input, even where the instructions above say to ask. When a detail is missing, make a reasonable assumption and mark it \`(assumed)\` where it appears; do not add a separate assumptions section.
- Start with a single H1 title, using the title format from the Output Format when it gives one.
- Respond with the final Markdown document only — no preamble, no closing remarks, and do not wrap the whole response in a code block.
`;

function parseArgs(argv) {
	const i = argv.indexOf("--hub");
	return i >= 0 ? argv[i + 1] : undefined;
}

/**
 * Split Markdown into top-level "## " sections, ignoring headings inside code fences.
 * Fences nest the CommonMark way: a fence opened with 4 backticks is only closed by a bare
 * line of at least 4 backticks, so a ```mermaid block inside a ````markdown block is fine.
 */
function splitSections(markdown) {
	const lines = markdown.replace(/\r\n/g, "\n").split("\n");
	const sections = [{ heading: null, lines: [] }];
	let fence = null; // { char, length } of the currently open fence
	for (const line of lines) {
		const f = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
		if (f && !fence) {
			fence = { char: f[1][0], length: f[1].length };
		} else if (f && f[1][0] === fence.char && f[1].length >= fence.length && !f[2].trim()) {
			fence = null;
		}
		const m = !fence && !f && line.match(/^## (.+?)\s*$/);
		if (m) {
			sections.push({ heading: m[1], lines: [line] });
		} else {
			sections[sections.length - 1].lines.push(line);
		}
	}
	return sections;
}

function sectionText(section) {
	return section.lines.join("\n").trim();
}

function rewriteSection(section) {
	const rule = SECTION_REWRITES.find((r) => r.heading.test(section.heading));
	if (!rule) return section;
	let text = section.lines.slice(1).join("\n");
	for (const [re, to] of rule.replace) text = text.replace(re, to);
	return { heading: rule.rename, lines: [`## ${rule.rename}`, ...text.split("\n")] };
}

function transformCommand(command, guidance) {
	const sections = splitSections(command);
	const preamble = sections[0].lines;

	// "Apply QA Core Guidance, ... and Jira QA Guidance from CLAUDE.md."
	const applyIdx = preamble.findIndex((l) => /from CLAUDE\.md/i.test(l));
	const applyLine = applyIdx >= 0 ? preamble[applyIdx] : "";
	const guidanceBlocks = [...guidance]
		.filter(([name]) => applyLine.includes(name))
		.map(([, text]) => text);
	if (applyLine && guidanceBlocks.length === 0) {
		throw new Error(`No known guidance sections referenced in: ${applyLine}`);
	}

	const role = preamble
		.filter((_, i) => i !== applyIdx)
		.join("\n")
		.trim();

	const body = sections
		.slice(1)
		.filter((s) => !DROPPED_SECTIONS.some((re) => re.test(s.heading)))
		.map(rewriteSection)
		.map(sectionText)
		.join("\n\n")
		.replace(/When `\$ARGUMENTS` is provided, /g, "Using the input below, ")
		.replace(/`\$ARGUMENTS`/g, "the input");

	return (
		[role, ...guidanceBlocks, body, LOBBY_RULES]
			.join("\n\n")
			.split("\n")
			.filter((l) => !DROPPED_LINES.some((re) => re.test(l)))
			.join("\n")
			.replace(/\n{3,}/g, "\n\n")
			.trim() + "\n"
	);
}

async function main() {
	const appRoot = process.cwd();
	const hub = path.resolve(
		appRoot,
		parseArgs(process.argv) ?? process.env.QA_AGENT_HUB_PATH ?? path.join("..", "..", "qa-agent-hub"),
	);
	const claudeDir = path.join(hub, ".claude");

	const claudeMd = await fs.readFile(path.join(claudeDir, "CLAUDE.md"), "utf8").catch(() => {
		throw new Error(`Could not read ${path.join(claudeDir, "CLAUDE.md")} — pass --hub <path-to-qa-agent-hub>`);
	});
	const guidance = new Map(
		splitSections(claudeMd)
			.filter((s) => s.heading)
			.map((s) => [s.heading, sectionText(s).replace(/\n-{3,}\s*$/, "").trim()]),
	);

	const outDir = path.join(appRoot, "prompts");
	await fs.mkdir(outDir, { recursive: true });

	for (const agent of AGENTS) {
		const src = path.join(claudeDir, "commands", `${agent}.md`);
		const command = await fs.readFile(src, "utf8");
		const prompt = transformCommand(command, guidance);
		const leftover = FORBIDDEN_OUTPUT.find((re) => re.test(prompt));
		if (leftover) {
			throw new Error(`${agent}: chat/file-specific wording survived the transform (${leftover}); update sync-agents.mjs`);
		}
		await fs.writeFile(path.join(outDir, `${agent}.md`), prompt, "utf8");
		console.log(`✓ ${agent}`);
	}
	console.log(`\nSynced ${AGENTS.length} agents from ${hub}`);
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
