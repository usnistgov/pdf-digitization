import { ChatMessage } from "./types";

export async function chatCompletion(opts: {
	apiUrl: string;
	apiKey?: string;
	model: string;
	messages: ChatMessage[];
	temperature: number;
	max_tokens?: number;
	top_p: number;
}) {
	const { apiUrl, apiKey, model, messages, temperature = 0, max_tokens = 4096, top_p = 1 } = opts;
	const res = await fetch(`${apiUrl.replace(/\/+$/, "")}/chat/completions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
		},
		body: JSON.stringify({ model, messages, temperature, max_tokens, stream: false, top_p }),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`LLM error ${res.status}: ${text}`);
	}
	const json = await res.json();
	return json?.choices?.[0]?.message?.content ?? "";
}
