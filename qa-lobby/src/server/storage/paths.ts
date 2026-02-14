import path from "node:path";

export function getDataRoot(): string {
	// In Next.js, server-side code runs with cwd at the app root (qa-lobby).
	return path.join(process.cwd(), "data");
}

export function getProjectsIndexPath(): string {
	return path.join(getDataRoot(), "projects.json");
}

export function getProjectDir(projectId: string): string {
	return path.join(getDataRoot(), "projects", projectId);
}

export function getProjectMetaPath(projectId: string): string {
	return path.join(getProjectDir(projectId), "project.json");
}

export function getProjectOutputsDir(projectId: string): string {
	return path.join(getProjectDir(projectId), "outputs");
}

export function getOutputMetaPath(projectId: string, outputId: string): string {
	return path.join(getProjectOutputsDir(projectId), `${outputId}.json`);
}

export function getOutputMarkdownPath(
	projectId: string,
	outputId: string,
): string {
	return path.join(getProjectOutputsDir(projectId), `${outputId}.md`);
}
