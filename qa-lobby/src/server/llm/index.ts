import { generateWithClaude, listClaudeModels } from "./claude";
import { generateWithClaudeCode, listClaudeCodeModels } from "./claude-code";
import { generateWithCopilot, listCopilotModels } from "./copilot";
import { generateWithOllama, listOllamaModels } from "./ollama";
import { generateWithOpenAi, listOpenAiModels } from "./openai";
import { isLlmProvider, type GenerateMarkdownInput, type LlmProvider, type ProviderModels } from "./types";

export * from "./types";

function getDefaultProvider(): LlmProvider {
	const raw = (process.env.LLM_PROVIDER || "ollama").toLowerCase();
	return isLlmProvider(raw) ? raw : "ollama";
}

export async function generateMarkdown(input: GenerateMarkdownInput): Promise<string> {
	const provider = input.provider ?? getDefaultProvider();
	const args = { model: input.model, system: input.system, prompt: input.prompt };
	switch (provider) {
		case "claude-code":
			return generateWithClaudeCode(args);
		case "claude":
			return generateWithClaude(args);
		case "copilot":
			return generateWithCopilot(args);
		case "openai":
			return generateWithOpenAi(args);
		case "ollama":
			return generateWithOllama(args);
	}
}

export async function listModels(provider: LlmProvider): Promise<ProviderModels> {
	switch (provider) {
		case "claude-code":
			return listClaudeCodeModels();
		case "claude":
			return listClaudeModels();
		case "copilot":
			return listCopilotModels();
		case "openai":
			return listOpenAiModels();
		case "ollama":
			return listOllamaModels();
	}
}
