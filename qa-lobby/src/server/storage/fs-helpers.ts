import fs from "node:fs/promises";
import path from "node:path";

export async function ensureDir(dirPath: string): Promise<void> {
	await fs.mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
	try {
		const raw = await fs.readFile(filePath, "utf8");
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

export async function readTextFile(filePath: string): Promise<string | null> {
	try {
		return await fs.readFile(filePath, "utf8");
	} catch {
		return null;
	}
}

export async function writeJsonFile(
	filePath: string,
	value: unknown,
): Promise<void> {
	await ensureDir(path.dirname(filePath));
	const json = JSON.stringify(value, null, 2);
	// Write to a temp file and rename, so a crash or overlapping write can't leave a half-written file.
	const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
	await fs.writeFile(tmpPath, json, "utf8");
	await fs.rename(tmpPath, filePath);
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
	await ensureDir(path.dirname(filePath));
	await fs.writeFile(filePath, content, "utf8");
}
