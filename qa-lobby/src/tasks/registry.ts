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
];
