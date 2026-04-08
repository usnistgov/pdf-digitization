require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.VITE_PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const callRChat = async (model, messages, temperature, max_tokens, top_p) => {
	const apiUrl = process.env.VITE_LLM_URL;
	const apiKey = process.env.VITE_RCHAT_API_KEY;
	if (!apiUrl) throw new Error("LLM_API_URL not configured");
	if (!apiKey) throw new Error("RCHAT API KEY not configured");

	const res = await fetch(`${apiUrl.replace(/\/+$/, "")}/chat/completions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(apiKey && { Authorization: `Bearer ${apiKey}` }),
		},
		body: JSON.stringify({ model, messages, temperature, max_tokens, top_p, stream: false }),
	});
	if (!res.ok) throw new Error(`RChat error ${res.status}: ${await res.text()}`);
	return res.json();
};

const callVertex = async (model, messages, temperature, max_tokens) => {
	const apiKey = process.env.VITE_VERTEX_API_KEY;
	const location = process.env.VITE_VERTEX_LOCATION;
	const projectId = process.env.VITE_PROJECT_ID;
	if (!apiKey) throw new Error("vertex api key not configured");
	if (!projectId) throw new Error("project id not configured");

	const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/endpoints/openapi/chat/completions`;

	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({ model, messages, temperature, max_tokens, stream: false }),
	});

	if (!res.ok) throw new Error(`vertex API error ${res.status}: ${await res.text()}`);
	return res.json();
};

// Proxy endpoint for LLM chat completions
app.post("/chat/completions", async (req, res) => {
	try {
		const { model, messages, temperature = 0, max_tokens = 4096, top_p = 1, backend = "rchat" } = req.body;
		console.log(model, backend);

		let data;
		if (backend === "vertex") {
			data = await callVertex(model, messages, temperature, max_tokens);
		} else {
			data = await callRChat(model, messages, temperature, max_tokens, top_p);
		}

		res.json(data);
	} catch (error) {
		console.error("Proxy error:", error);
		res.status(500).json({ error: "Internal proxy error" });
	}
});

// Health check endpoint
app.get("/health", (req, res) => {
	res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
	console.log(`LLM Proxy server running on port ${PORT}`);
});
