export type TaskDefinition = {
	id: string;
	name: string;
	description: string;
};

export const tasks: TaskDefinition[] = [
	{
		id: "create-bug-ticket",
		name: "Create Bug Ticket",
		description: "Generate a structured markdown bug report from a short description.",
	},
	{
		id: "create-task-ticket",
		name: "Create QA Task Ticket",
		description: "Generate a QA task ticket with scope, acceptance criteria, and implementation notes.",
	},
	{
		id: "create-test-approach",
		name: "Create Test Approach",
		description: "Generate a concise ISTQB-style test approach for a feature/ticket.",
	},
	{
		id: "create-test-plan",
		name: "Create Test Plan",
		description: "Generate a comprehensive test plan document for a feature/ticket.",
	},
	{
		id: "create-test-case",
		name: "Create Test Cases",
		description: "Generate manual test cases as a Markdown table for a feature/ticket.",
	},
	{
		id: "create-coverage-analysis",
		name: "Create Coverage Analysis",
		description: "Analyze requirements vs test cases and output a test coverage analysis report.",
	},
];
