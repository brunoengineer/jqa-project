"use client";

import { useSyncExternalStore } from "react";

import { getProviderInfo, providers } from "@/lib/providers";
import { isLlmProvider, type LlmProvider } from "@/server/llm/types";

// Provider and per-provider model choices are remembered in localStorage.
const PROVIDER_KEY = "qaLobby.llm.provider";
const modelKey = (provider: LlmProvider) => `qaLobby.llm.model.${provider}`;
const CHANGE_EVENT = "qaLobby:llm-settings";

function read(key: string): string | null {
	try {
		return window.localStorage.getItem(key);
	} catch {
		return null;
	}
}

function write(key: string, value: string) {
	try {
		window.localStorage.setItem(key, value);
	} catch {
		// ignore (private mode, blocked storage)
	}
	window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
	window.addEventListener(CHANGE_EVENT, onChange);
	window.addEventListener("storage", onChange);
	return () => {
		window.removeEventListener(CHANGE_EVENT, onChange);
		window.removeEventListener("storage", onChange);
	};
}

const DEFAULT_PROVIDER: LlmProvider = providers[0].id;

function getProviderSnapshot(): LlmProvider {
	const saved = read(PROVIDER_KEY);
	return isLlmProvider(saved) ? saved : DEFAULT_PROVIDER;
}

export function useLlmSettings() {
	const provider = useSyncExternalStore(subscribe, getProviderSnapshot, () => DEFAULT_PROVIDER);
	const defaultModel = getProviderInfo(provider)?.defaultModel ?? "";
	const model = useSyncExternalStore(
		subscribe,
		() => read(modelKey(provider)) ?? defaultModel,
		() => defaultModel,
	);

	return {
		provider,
		model,
		setProvider: (next: LlmProvider) => write(PROVIDER_KEY, next),
		setModel: (next: string) => write(modelKey(provider), next),
	};
}
