import { Box, Button, Container, FileUpload, HStack, List, Spinner, Text } from "@chakra-ui/react";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { JsonEditor, githubLightTheme } from "json-edit-react";
import React, { useEffect, useMemo, useState } from "react";
import { LuArrowDownToLine, LuUpload } from "react-icons/lu";
import "../public/nist-header-footer/nist-combined.css";
import "../public/nist-header-footer/nist-header-footer-v-2.0.js";
import Header from "./components/Header";
import { guardDocumentForLLM } from "./lib/guards";
import { type ChatMessage, chatCompletion } from "./lib/llm";
import { htmlToMarkdown, pdfToMarkdown } from "./lib/pdf";

import openEPDSchema from "../../llm/openepd_validation_schema.json";
import Disclaimer from "./components/Disclaimer";
import { extraction_prompt_json, filecheck_prompt, system_prompt } from "./lib/prompts";

export default function App() {
	const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_LLM_URL || "");
	const [apiKey, setApiKey] = useState(import.meta.env.VITE_RCHAT_API_KEY || "");
	const [model, setModel] = useState(import.meta.env.VITE_MODEL || "");

	const [status, setStatus] = useState("idle");
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

	const addMsg = (m: ChatMessage) => {
		setMessages((prev) => [...prev, m]);
	};

	const validateEPD = async (safeText: string) => {
		console.log("Validating EPD...");
		// if (!markdown) return;
		setStatus("Validating EPD...");
		try {
			const reply = await chatCompletion({
				apiUrl,
				apiKey,
				model,
				messages: [
					{ role: "system", content: system_prompt },
					{ role: "system", content: filecheck_prompt },
					{ role: "user", content: safeText },
				],
			});
			addMsg({ role: "assistant", content: `EPD Validity Check: ${reply}` });
			const ok = /valid epd/i.test(reply);
			if (!ok) throw new Error("EPD validity check failed.");
			return ok;
		} catch (e: any) {
			alert(e.message);
		} finally {
			setStatus("idle");
		}
	};

	const extractJSON = async (safeText: string) => {
		console.log("extracting json...");
		// if (!markdown) return;
		setStatus("Extracting JSON...");
		try {
			const reply = await chatCompletion({
				apiUrl,
				apiKey,
				model,
				messages: [
					{ role: "system", content: extraction_prompt_json },
					{ role: "user", content: `<EPD_Content>\n${safeText}\n</EPD_Content>` },
				],
			});

			// Extract first {...}
			const match = reply.match(/\{[\s\S]*\}/);
			if (!match) throw new Error("No JSON object found in model output.");
			const raw = match[0];

			// Quick repair for common issues
			const repaired = raw.replace(/"--,/g, '"--"').replace(/:\s*--(?=[,}])/g, ': "--"');

			const obj = JSON.parse(repaired);
			setJsonOut(obj);
			addMsg({ role: "assistant", content: "openEPD JSON generated." });
			addMsg({ role: "assistant", content: "Validating openEPD schema." });

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
			addMsg({ role: "assistant", content: "openEPD JSON validated." });
			addMsg({ role: "assistant", content: jsonOut });
		} catch (e: any) {
			alert(e.message);
		} finally {
			setStatus("idle");
		}
	};

	const onFileChange = async (files: File[]) => {
		const f = Array.isArray(files) ? files?.[0] : files?.item(0);
		if (status != "idle") setStatus("Processing…");
		console.log("file changed");
		try {
			// reset state on file upload
			setMarkdown("");
			setMessages([]);
			setValidation("");
			setJsonOut(null);

			const ext = f.name.toLowerCase().split(".").pop();
			let md = "";

			if (ext === "pdf") {
				md = await pdfToMarkdown(await f.arrayBuffer());
			} else if (ext === "html" || ext === "htm") {
				md = htmlToMarkdown(await f.text());
			} else {
				alert("Please upload PDF or HTML.");
				return;
			}
			addMsg({ role: "system", content: "Markdown extracted." });

			// sanitize
			const { safeText, report } = guardDocumentForLLM(md);
			if (report.is_suspicious) {
				addMsg({ role: "system", content: `⚠️ Potential injection sanitized (score ${report.score}).` });
				console.info("Injection report:", report);
			}
			setMarkdown(safeText);
			addMsg({ role: "system", content: "✅ EPD extracted & sanitized." });
			const validity = await validateEPD(safeText);
			addMsg({ role: "assistant", content: `EPD Validity Check: ${validity ? "✅ Valid EPD" : "❌ Invalid EPD"}` });
			await extractJSON(safeText);
		} catch (e: any) {
			alert(`Failed to extract: ${e?.message || e}`);
		} finally {
			setStatus("done");
			console.log("Comleted processing file:", f.name);
		}
	};

	const downloadJSON = () => {
		if (!jsonOut) return;
		const blob = new Blob([JSON.stringify(jsonOut, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "openepd.json";
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<Container maxW={"container.xl"} fluid p={0}>
			<Header />
			<Container style={{ padding: "50px", minHeight: "73vh" }}>
				<Text textStyle="4xl">parsEPD: Digitize Your EPDs</Text>
				<br />
				<Text textStyle="sm">
					parsEPD converts an EPD from PDF or HTML format to a standardized, machine-readable JSON format (openEPD)
					using a large language model (LLM) for the parsing and conversion. For details about the process, please see
					the ParsEPD User Guide.
				</Text>
				<br />
				<List.Root textStyle="md">Steps to Use ParsEPD:</List.Root>
				<List.Root>
					<List.Item textStyle="md">
						Upload your PDF formatted EPD – ParsEPD automatically Watch as parsEPD validates that the PDF is an EPD,
						identifies, its product category, and then creates and displays the openEPD file.
					</List.Item>
					<List.Item textStyle="md">View the openEPD file in the chat. </List.Item>
					<List.Item textStyle="md">Download the openEPD File using the “Download” button in the chat. </List.Item>
					<List.Item textStyle="md">
						The user can remove or replace the EPD as well as start over using options provided in left hand column.{" "}
					</List.Item>
					<List.Item textStyle="md">Only the most recent uploaded EPD is available for conversion.</List.Item>
				</List.Root>
				<br />
				{/* <section className="card row">
				<h3>LLM Settings</h3>
				<div className="row row-3">
					<input
						placeholder="OpenAI-compatible Base URL (e.g., https://api.openai.com/v1)"
						value={apiUrl}
						onChange={(e) => setApiUrl(e.target.value)}
					/>
					<input
						placeholder="API Key (stored in localStorage)"
						value={apiKey}
						onChange={(e) => setApiKey(e.target.value)}
					/>
					<label>Model</label>
					<input
						placeholder="Model (e.g., gpt-4o-mini)"
						value={model}
						onChange={(e) => setModel(e.target.value)}
						disabled={true}
					/>
				</div>
			</section> */}
				<Box>
					<Text textStyle={"lg"}>Upload EPD (PDF or HTML)</Text>
					<FileUpload.Root
						p="5"
						maxW="md"
						alignItems="left"
						maxFiles={1}
						maxFileSize={5 * 1024 * 1024} // 5MB
						onFileChange={(uploads) => {
							const files = uploads.acceptedFiles;
							const list = Array?.isArray(files) ? files : Array?.from(files ?? []);
							if (!list.length) return;
							void onFileChange(list);
						}}
					>
						<FileUpload.HiddenInput accept=".pdf,.htm,.html" />
						<FileUpload.Trigger asChild>
							<Button variant="solid" size="lg">
								<LuUpload /> Upload file
							</Button>
						</FileUpload.Trigger>
						<FileUpload.List />
					</FileUpload.Root>
				</Box>

				{markdown && (
					<section className="card">
						<h3>Extracted Markdown (sanitized)</h3>
						<textarea readOnly value={markdown} style={{ width: "100%", height: 220 }} />
					</section>
				)}

				{markdown && (
					<section className="card">
						<HStack>
							<h3>Messages</h3>
							{jsonOut && (
								<section className="row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
									<Button colorPalette="teal" variant="subtle" onClick={downloadJSON} disabled={!jsonOut}>
										<LuArrowDownToLine /> Download JSON
									</Button>
								</section>
							)}
						</HStack>
						{status !== "done" && status !== "idle" && <Spinner size="lg" />}
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
				)}

				{jsonOut && (
					<JsonEditor
						data={jsonOut}
						restrictEdit={true}
						restrictDelete={true}
						restrictAdd={true}
						viewOnly={true}
						collapse={1}
						rootName="openEPD"
						theme={githubLightTheme}
					/>
				)}

				{validation && (
					<section className="card">
						<strong>{validation}</strong>
					</section>
				)}
			</Container>
			<Disclaimer />
		</Container>
	);
}
