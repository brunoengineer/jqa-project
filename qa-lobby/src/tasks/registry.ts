// Agent definitions. Prompt templates live in prompts/<id>.md and are synced
// from qa-agent-hub with `npm run sync:agents`.

export type TaskField = {
	id: string;
	label: string;
	placeholder?: string;
	required?: boolean;
	/** Textarea height in rows. Omit for a single-line input. */
	rows?: number;
	/** Allow attaching plain-text files whose contents are appended to this field. */
	allowFiles?: boolean;
};

export type TaskCategory = "Tickets" | "Test design" | "Analysis" | "Review";

export type TaskDefinition = {
	id: string;
	name: string;
	description: string;
	category: TaskCategory;
	/** Short monospace tag shown in the UI. */
	code: string;
	fields: TaskField[];
};

export const taskCategories: TaskCategory[] = ["Tickets", "Test design", "Analysis", "Review"];

export const tasks: TaskDefinition[] = [
	{
		id: "jira-bug",
		name: "Jira Bug",
		description: "Jira-ready bug report with expected/actual result, repro steps, and labels.",
		category: "Tickets",
		code: "BUG",
		fields: [
			{ id: "issue", label: "What happened?", required: true, rows: 5, placeholder: "Describe the defect, including any error messages." },
			{ id: "expected", label: "What did you expect?", rows: 3 },
			{ id: "steps", label: "Steps to reproduce", rows: 4, placeholder: "If known" },
		],
	},
	{
		id: "bulk-jira-bugs",
		name: "Bulk Jira Bugs",
		description: "Separate bug tickets from an issue list, test report, or triage notes.",
		category: "Tickets",
		code: "BLK",
		fields: [
			{ id: "issues", label: "Issues, report, or triage notes", required: true, rows: 10, allowFiles: true },
			{ id: "context", label: "Environment or release context", rows: 2 },
			{ id: "merge", label: "Merge similar items or keep separate?", placeholder: "e.g. Merge duplicates" },
		],
	},
	{
		id: "jira-task",
		name: "Jira Task",
		description: "QA task for automation, execution, or maintenance with acceptance criteria.",
		category: "Tickets",
		code: "TSK",
		fields: [
			{ id: "task", label: "What needs to be done?", required: true, rows: 5 },
			{ id: "component", label: "Feature / component" },
			{ id: "priority", label: "Deadline or priority" },
		],
	},
	{
		id: "test-approach",
		name: "Test Approach",
		description: "Short ISTQB-aligned approach: scope, levels, techniques, environment, risks, exit criteria.",
		category: "Test design",
		code: "APR",
		fields: [
			{ id: "ticket", label: "Ticket or feature description", required: true, rows: 10, allowFiles: true, placeholder: "Paste the Jira ticket content or describe what needs to be tested." },
		],
	},
	{
		id: "test-plan",
		name: "Test Plan",
		description: "Structured, comprehensive QA test plan for a feature or module.",
		category: "Test design",
		code: "PLN",
		fields: [
			{ id: "feature", label: "Feature / module name", required: true },
			{ id: "description", label: "What it does", required: true, rows: 6, allowFiles: true },
			{ id: "constraints", label: "Requirements or constraints", rows: 3 },
		],
	},
	{
		id: "test-suggestions",
		name: "Test Cases",
		description: "Manual test cases as a Markdown table with techniques.",
		category: "Test design",
		code: "TCS",
		fields: [
			{ id: "feature", label: "Feature or requirement to test", required: true, rows: 6, allowFiles: true },
			{ id: "flows", label: "Specific user flows or scenarios", rows: 3 },
			{ id: "constraints", label: "Constraints", placeholder: "Browser, device, user roles" },
		],
	},
	{
		id: "exploratory-test-charter",
		name: "Exploratory Charter",
		description: "Time-boxed exploratory mission with target risks, tours, and heuristics.",
		category: "Test design",
		code: "EXP",
		fields: [
			{ id: "area", label: "Feature, module, or risk area", required: true, rows: 4 },
			{ id: "constraints", label: "Environment, device, or user-role constraints", rows: 2 },
			{ id: "changes", label: "Recent changes or suspected weak points", rows: 3 },
		],
	},
	{
		id: "coverage-analysis",
		name: "Coverage Analysis",
		description: "Map test cases against requirements: coverage estimate, gaps, recommendations.",
		category: "Analysis",
		code: "COV",
		fields: [
			{ id: "requirements", label: "Requirements", required: true, rows: 8, allowFiles: true, placeholder: "Use cases, user stories, or requirements (CSV, table, or plain list)." },
			{ id: "testCases", label: "Test cases", required: true, rows: 8, allowFiles: true, placeholder: "Existing test cases (CSV, table, or plain list)." },
			{ id: "notes", label: "Notes", rows: 2, placeholder: "Assumptions, known gaps, naming conventions" },
		],
	},
	{
		id: "automation-gap-analysis",
		name: "Automation Gaps",
		description: "Highest-value automation opportunities and a recommended order.",
		category: "Analysis",
		code: "AUT",
		fields: [
			{ id: "scope", label: "Feature, module, or scope area", required: true, rows: 3 },
			{ id: "coverage", label: "Current manual and automated coverage", required: true, rows: 6, allowFiles: true },
			{ id: "painPoints", label: "Pain points, risks, or high-value flows", rows: 3 },
		],
	},
	{
		id: "root-cause-triage",
		name: "Root Cause Triage",
		description: "Classify the likely cause of a failure with evidence and next steps.",
		category: "Analysis",
		code: "RCA",
		fields: [
			{ id: "summary", label: "Failing test, defect, or issue summary", required: true, rows: 4 },
			{ id: "evidence", label: "Error output, logs, or screenshots description", rows: 8, allowFiles: true },
			{ id: "environment", label: "Affected environment and recent changes", rows: 2 },
		],
	},
	{
		id: "release-readiness",
		name: "Release Readiness",
		description: "Go / go-with-risks / no-go recommendation with follow-up actions.",
		category: "Review",
		code: "REL",
		fields: [
			{ id: "release", label: "Release, feature, or rollout name", required: true },
			{ id: "status", label: "Test execution status", required: true, rows: 5, allowFiles: true },
			{ id: "risks", label: "Open defects, known risks, scope notes", rows: 5 },
		],
	},
	{
		id: "pr-review",
		name: "PR Review",
		description: "Approval-risk report with confirmed issues and proposed inline comments.",
		category: "Review",
		code: "PRR",
		fields: [
			{ id: "url", label: "Pull request URL", placeholder: "https://github.com/org/repo/pull/123" },
			{ id: "diff", label: "Diff", required: true, rows: 12, allowFiles: true, placeholder: "Paste the raw .diff content" },
			{ id: "comments", label: "Existing review comments", rows: 3 },
		],
	},
];

// Task ids used before the qa-agent-hub sync, so older saved documents still group correctly.
const legacyTaskIds: Record<string, string> = {
	"create-bug-ticket": "jira-bug",
	"create-task-ticket": "jira-task",
	"create-test-approach": "test-approach",
	"create-test-plan": "test-plan",
	"create-test-case": "test-suggestions",
	"create-coverage-analysis": "coverage-analysis",
};

export function resolveTaskId(taskId: string): string {
	return legacyTaskIds[taskId] ?? taskId;
}

export function getTask(taskId: string | undefined): TaskDefinition | undefined {
	if (!taskId) return undefined;
	const id = resolveTaskId(taskId);
	return tasks.find((t) => t.id === id);
}
