export type Project = {
	id: string;
	name: string;
	createdAt: string;
};

export type OutputDocument = {
	id: string;
	projectId: string;
	taskId: string;
	title?: string;
	input: unknown;
	createdAt: string;
	markdown: string;
};

export type OutputMetadata = Omit<OutputDocument, "markdown"> & {
	schemaVersion?: number;
};
