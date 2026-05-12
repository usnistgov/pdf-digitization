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
	backendUrl?: string;
	stream?: boolean;
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
		stream = false,
	} = opts;

	const baseUrl = backendUrl || apiUrl;
	if (!baseUrl) {
		throw new Error("Either backendUrl or apiUrl is required for LLM requests");
	}

	const proxyUrl = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

	const res = await fetch(proxyUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			model,
			messages,
			temperature,
			max_tokens,
			top_p,
			backend,
			...(stream && { stream: true }),
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`LLM proxy error ${res.status}: ${text}`);
	}

	if (!stream) {
		const json = await res.json();
		return json?.choices?.[0]?.message?.content ?? "";
	}

	const reader = res.body?.getReader();
	if (!reader) throw new Error("No response body for streaming");

	const decoder = new TextDecoder();
	let content = "";
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() ?? "";

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || !trimmed.startsWith("data: ")) continue;
			const data = trimmed.slice(6);
			if (data === "[DONE]") break;

			try {
				const parsed = JSON.parse(data);
				const delta = parsed?.choices?.[0]?.delta?.content;
				if (delta) content += delta;
			} catch {
				// skip malformed chunks
			}
		}
	}

	return content;
}
