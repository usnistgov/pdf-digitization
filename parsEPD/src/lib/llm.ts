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
			stream: true,
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`LLM proxy error ${res.status}: ${text}`);
	}

	const reader = res.body!.getReader();
	const decoder = new TextDecoder();
	let content = "";
	let buf = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buf += decoder.decode(value, { stream: true });

		const lines = buf.split("\n");
		buf = lines.pop()!;

		for (const line of lines) {
			if (!line.startsWith("data:")) continue;
			const data = line.slice(5).trim();
			if (data === "[DONE]") continue;
			try {
				const parsed = JSON.parse(data);
				const delta = parsed.choices?.[0]?.delta?.content;
				if (delta) content += delta;
			} catch {}
		}
	}

	return content;
}
