import { ChatMessage } from "./types";

export async function chatCompletion(opts: {
	apiUrl: string;
	apiKey?: string;
	model: string;
	messages: ChatMessage[];
	temperature: number;
	max_tokens?: number;
	top_p: number;
	backend?: string;
	// Backend proxy configuration
	backendUrl?: string;
}) {
	const {
		apiUrl,
		apiKey,
		model,
		messages,
		temperature = 0,
		max_tokens = 16384,
		top_p = 1,
		backend = "generic",
		backendUrl,
	} = opts;

	const baseUrl = backendUrl || apiUrl;
	if (!baseUrl) {
		throw new Error("Either backendUrl or apiUrl is required for LLM requests");
	}

	const proxyUrl = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

	const res = await fetch(proxyUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model,
			messages,
			temperature,
			max_tokens,
			top_p,
			backend,
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`LLM proxy error ${res.status}: ${text}`);
	}
	const json = await res.json();
	return json?.choices?.[0]?.message?.content ?? "";
}
