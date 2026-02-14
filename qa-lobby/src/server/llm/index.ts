import type { GenerateMarkdownInput, LlmProvider } from "./types";
import { generateWithOllama } from "./ollama";
import { generateWithOpenAi } from "./openai";

function getDefaultProvider(): LlmProvider {
	const raw = (process.env.LLM_PROVIDER || "ollama").toLowerCase();
	return raw === "openai" ? "openai" : "ollama";
}

export async function generateMarkdown(input: GenerateMarkdownInput): Promise<string> {
	const provider: LlmProvider = input.provider ?? getDefaultProvider();
	if (provider === "openai") {
		return generateWithOpenAi({ model: input.model, prompt: input.prompt });
	}
	return generateWithOllama({ model: input.model, prompt: input.prompt });
}
