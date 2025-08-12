import Ajv from "ajv";
import addFormats from "ajv-formats";
import React, { useEffect, useMemo, useState } from "react";
import "../public/nist-header-footer/nist-combined.css";
import "../public/nist-header-footer/nist-header-footer-v-2.0.js";
import { guardDocumentForLLM } from "./lib/guards";
import { type ChatMessage, chatCompletion } from "./lib/llm";
import { htmlToMarkdown, pdfToMarkdown } from "./lib/pdf";

// Prompts & Schema are referenced only – you’ll fill them in
import openEPDSchema from "../../llm/openepd_validation_schema.json";
import { extraction_prompt_json, filecheck_prompt, system_prompt } from "./lib/prompts";

export default function App() {
	const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_LLM_URL || "");
	const [apiKey, setApiKey] = useState(import.meta.env.VITE_RCHAT_API_KEY || "");
	const [model, setModel] = useState(import.meta.env.VITE_MODEL || "");

	const [busy, setBusy] = useState(false);
	const [markdown, setMarkdown] = useState("");
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [jsonOut, setJsonOut] = useState<any>(null);
	const [validation, setValidation] = useState<string>("");

	useEffect(() => {
		localStorage.setItem("pars_api_url", apiUrl);
		localStorage.setItem("pars_api_key", apiKey);
		localStorage.setItem("pars_model", model);
	}, [apiUrl, apiKey, model]);

	const ajv = useMemo(() => {
		const a = new Ajv({ allErrors: true, strict: false });
		addFormats(a);
		return a;
	}, []);

	function addMsg(m: ChatMessage) {
		setMessages((prev) => [...prev, m]);
	}

	async function onFileChange(file: File) {
		setBusy(true);
		try {
			const ext = file.name.toLowerCase().split(".").pop();
			let md = "";
			if (ext === "pdf") {
				md = await pdfToMarkdown(await file.arrayBuffer());
			} else if (ext === "html" || ext === "htm") {
				md = htmlToMarkdown(await file.text());
			} else {
				alert("Please upload PDF or HTML.");
				return;
			}
			const { safeText, report } = guardDocumentForLLM(md);
			if (report.is_suspicious) {
				addMsg({ role: "system", content: `⚠️ Potential injection sanitized (score ${report.score}).` });
				console.info("Injection report:", report);
			}
			setMarkdown(safeText);
			addMsg({ role: "system", content: "✅ EPD extracted & sanitized." });
		} catch (e: any) {
			alert(`Failed to extract: ${e?.message || e}`);
		} finally {
			setBusy(false);
		}
	}

	async function validateEPD() {
		if (!markdown) return;
		setBusy(true);
		try {
			const reply = await chatCompletion({
				apiUrl,
				apiKey,
				model,
				messages: [
					{ role: "system", content: filecheck_prompt },
					{ role: "user", content: markdown },
				],
			});
			addMsg({ role: "assistant", content: `EPD Validity Check: ${reply}` });
		} catch (e: any) {
			alert(e.message);
		} finally {
			setBusy(false);
		}
	}

	async function extractJSON() {
		if (!markdown) return;
		setBusy(true);
		try {
			const reply = await chatCompletion({
				apiUrl,
				apiKey,
				model,
				messages: [
					{ role: "system", content: extraction_prompt_json },
					{ role: "user", content: `<EPD_Content>\n${markdown}\n</EPD_Content>` },
				],
			});

			// Extract first {...}
			const match = reply.match(/\{[\s\S]*\}/);
			if (!match) throw new Error("No JSON object found in model output.");
			const raw = match[0];

			// Quick repair for common issues
			const repaired = raw.replace(/"--,/g, '"--"').replace(/:\s*--(?=[,}])/g, ': "--"');

			const obj = JSON.parse(repaired);

			// Validate with YOUR schema object
			const validate = ajv.compile(openEPDSchema as any);
			const valid = validate(obj);
			if (!valid) {
				console.warn("Ajv errors:", validate.errors);
				setValidation(`❌ Invalid JSON: ${validate.errors?.[0]?.message || "See console"}`);
			} else {
				setValidation("✅ JSON is valid according to the schema.");
			}

			setJsonOut(obj);
			addMsg({ role: "assistant", content: "openEPD JSON generated." });
		} catch (e: any) {
			alert(e.message);
		} finally {
			setBusy(false);
		}
	}

	function downloadJSON() {
		if (!jsonOut) return;
		const blob = new Blob([JSON.stringify(jsonOut, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "openepd.json";
		a.click();
		URL.revokeObjectURL(url);
	}

	return (
		<div className="container">
			<h1>parsEPD (Browser-only)</h1>
			<p className="badge">No server. Files never leave the browser.</p>

			<section className="card row">
				<h3>LLM Settings</h3>
				<div className="row row-3">
					{/* <input
						placeholder="OpenAI-compatible Base URL (e.g., https://api.openai.com/v1)"
						value={apiUrl}
						onChange={(e) => setApiUrl(e.target.value)}
					/>
					<input
						placeholder="API Key (stored in localStorage)"
						value={apiKey}
						onChange={(e) => setApiKey(e.target.value)}
					/> */}
					<label>Model</label>
					<input
						placeholder="Model (e.g., gpt-4o-mini)"
						value={model}
						onChange={(e) => setModel(e.target.value)}
						disabled={true}
					/>
				</div>
			</section>

			<section className="card row">
				<h3>Upload EPD (PDF or HTML)</h3>
				<input
					type="file"
					accept=".pdf,.htm,.html"
					onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0])}
				/>
				{busy && <div>Processing…</div>}
			</section>

			{markdown && (
				<section className="card">
					<h3>Extracted Markdown (sanitized)</h3>
					<textarea readOnly value={markdown} style={{ width: "100%", height: 220 }} />
				</section>
			)}

			<section className="row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
				<button className="card" onClick={validateEPD} disabled={!markdown || busy}>
					Validate EPD (LLM)
				</button>
				<button className="card" onClick={extractJSON} disabled={!markdown || busy}>
					Extract openEPD JSON (LLM)
				</button>
				<button className="card" onClick={downloadJSON} disabled={!jsonOut}>
					Download JSON
				</button>
			</section>

			{validation && (
				<section className="card">
					<strong>{validation}</strong>
				</section>
			)}

			<section className="card">
				<h3>Messages</h3>
				{messages.map((m, i) => (
					<div
						key={i}
						style={{
							padding: 8,
							margin: "6px 0",
							background: m.role === "assistant" ? "#f7f7ff" : "#f7fff7",
							borderRadius: 10,
						}}
					>
						<strong>{m.role.toUpperCase()}:</strong> {m.content}
					</div>
				))}
			</section>
		</div>
	);
}
