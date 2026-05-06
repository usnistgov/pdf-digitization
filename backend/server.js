require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleAuth } = require("google-auth-library");

const app = express();
const PORT = process.env.VITE_PORT || 5000;

app.use(cors());
app.use(express.json());

const callRChat = async (model, messages, temperature, max_tokens, top_p, stream = false) => {
	const apiUrl = process.env.VITE_LLM_URL;
	const apiKey = process.env.VITE_RCHAT_API_KEY;
	if (!apiUrl) throw new Error("LLM_API_URL not configured");
	if (!apiKey) throw new Error("RCHAT API KEY not configured");

	const res = await fetch(`${apiUrl.replace(/\/+$/, "")}/chat/completions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({ model, messages, temperature, max_tokens, top_p, stream }),
	});
	if (!res.ok) throw new Error(`RChat error ${res.status}: ${await res.text()}`);
	return { response: res, isStream: stream };
};

// ---------- Vertex auth (shared) ----------
const vertexAuth = new GoogleAuth({
	scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

const getVertexToken = async () => {
	const t = await vertexAuth.getAccessToken();
	const token = typeof t === "string" ? t : t?.token;
	if (!token) throw new Error("Failed to obtain Vertex access token");
	return token;
};

const vertexHost = (location) =>
	location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;

const isClaudeModel = (model) => /^(anthropic\/)?claude/i.test(model);

// ---------- Vertex: Gemini via OpenAI-compat ----------
const callVertexGemini = async (model, messages, temperature, max_tokens) => {
	const location = process.env.VITE_VERTEX_LOCATION;
	const projectId = process.env.VITE_VERTEX_PROJECT_ID;
	if (!projectId) throw new Error("project id not configured");
	if (!location) throw new Error("vertex location not configured");

	const accessToken = await getVertexToken();
	const url = `https://${vertexHost(location)}/v1/projects/${projectId}/locations/${location}/endpoints/openapi/chat/completions`;
	const vertexModel = model.includes("/") ? model : `google/${model}`;

	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${accessToken}`,
		},
		body: JSON.stringify({ model: vertexModel, messages, temperature, max_tokens, stream: false }),
	});
	if (!res.ok) throw new Error(`vertex (gemini) error ${res.status}: ${await res.text()}`);
	return res.json(); // already OpenAI-shaped
};

// ---------- Vertex: Claude ----------
const splitSystem = (messages) => {
	const sys = messages
		.filter((m) => m.role === "system")
		.map((m) => m.content)
		.join("\n\n");
	const rest = messages.filter((m) => m.role !== "system");
	return { system: sys || undefined, messages: rest };
};

// Convert Anthropic response → OpenAI chat.completion shape
const anthropicToOpenAI = (resp, requestedModel) => {
	const text = (resp.content || [])
		.filter((c) => c.type === "text")
		.map((c) => c.text)
		.join("");
	const stopMap = { end_turn: "stop", max_tokens: "length", stop_sequence: "stop", tool_use: "tool_calls" };
	return {
		id: resp.id,
		object: "chat.completion",
		created: Math.floor(Date.now() / 1000),
		model: resp.model || requestedModel,
		choices: [
			{
				index: 0,
				message: { role: "assistant", content: text },
				finish_reason: stopMap[resp.stop_reason] || "stop",
			},
		],
		usage: {
			prompt_tokens: resp.usage?.input_tokens ?? 0,
			completion_tokens: resp.usage?.output_tokens ?? 0,
			total_tokens: (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0),
		},
	};
};

const callVertexClaude = async (model, messages, temperature, max_tokens) => {
	const location = process.env.VITE_VERTEX_CLAUDE_LOCATION || process.env.VITE_VERTEX_LOCATION;
	const projectId = process.env.VITE_VERTEX_PROJECT_ID;
	if (!projectId) throw new Error("project id not configured");
	if (!location) throw new Error("vertex location not configured");

	const accessToken = await getVertexToken();
	// Strip optional "anthropic/" prefix if frontend sends it
	const modelId = model.replace(/^anthropic\//, "");
	const url = `https://${vertexHost(location)}/v1/projects/${projectId}/locations/${location}/publishers/anthropic/models/${modelId}:rawPredict`;

	const { system, messages: msgs } = splitSystem(messages);

	const body = {
		anthropic_version: "vertex-2023-10-16",
		messages: msgs,
		max_tokens, // REQUIRED by Anthropic
		temperature,
		...(system && { system }),
	};

	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${accessToken}`,
		},
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(`vertex (claude) error ${res.status}: ${await res.text()}`);
	const data = await res.json();
	return anthropicToOpenAI(data, modelId);
};

app.post("/chat/completions", async (req, res) => {
	try {
		const { model, messages, temperature = 0, max_tokens = 4096, top_p = 1, backend = "rchat", stream = false } = req.body;
		console.log(model, backend, stream ? "(streaming)" : "");

		if (backend === "vertex") {
			const data = isClaudeModel(model)
				? await callVertexClaude(model, messages, temperature, max_tokens)
				: await callVertexGemini(model, messages, temperature, max_tokens);
			return res.json(data);
		}

		const result = await callRChat(model, messages, temperature, max_tokens, top_p, stream);

		if (!stream) {
			const data = await result.response.json();
			return res.json(data);
		}

		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.flushHeaders();

		const reader = result.response.body.getReader();
		const decoder = new TextDecoder();

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				res.write(decoder.decode(value, { stream: true }));
			}
		} finally {
			res.end();
		}
	} catch (error) {
		console.error("Proxy error:", error);
		if (!res.headersSent) {
			res.status(500).json({ error: error.message });
		} else {
			res.end();
		}
	}
});

app.get("/health", (req, res) => {
	res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
	console.log(`LLM Proxy server running on port ${PORT}`);
});
