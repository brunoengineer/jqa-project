"use client";

import { useEffect, useState } from "react";

export type Provider = "ollama" | "openai";

const LS_PROVIDER_KEY = "qaLobby.llm.provider";
const LS_MODEL_KEY = "qaLobby.llm.model";

function isProvider(value: unknown): value is Provider {
	return value === "ollama" || value === "openai";
}

export function useLlmSettings(defaults?: { provider?: Provider; model?: string }) {
	const [provider, setProvider] = useState<Provider>(defaults?.provider ?? "ollama");
	const [model, setModel] = useState<string>(defaults?.model ?? "llama3.1");

	useEffect(() => {
		try {
			const savedProvider = window.localStorage.getItem(LS_PROVIDER_KEY);
			const savedModel = window.localStorage.getItem(LS_MODEL_KEY);
			if (isProvider(savedProvider)) setProvider(savedProvider);
			if (typeof savedModel === "string" && savedModel.trim()) setModel(savedModel);
		} catch {
			// ignore
		}
	}, []);

	function persistProvider(next: Provider) {
		try {
			window.localStorage.setItem(LS_PROVIDER_KEY, next);
		} catch {
			// ignore
		}
	}

	function persistModel(next: string) {
		try {
			window.localStorage.setItem(LS_MODEL_KEY, next);
		} catch {
			// ignore
		}
	}

	function onChangeProvider(next: Provider) {
		setProvider(next);
		persistProvider(next);
	}

	function onChangeModel(next: string) {
		setModel(next);
		persistModel(next);
	}

	return {
		provider,
		model,
		setProvider: onChangeProvider,
		setModel: onChangeModel,
		persistNow: () => {
			persistProvider(provider);
			persistModel(model);
		},
	};
}
