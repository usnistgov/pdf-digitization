import { Button, Container, FileUpload, Flex, HStack, ScrollArea, Spinner, Text, Theme } from "@chakra-ui/react";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { JsonEditor, githubDarkTheme } from "json-edit-react";
import React, { useEffect, useMemo, useState } from "react";
import { LuArrowDownToLine, LuUpload } from "react-icons/lu";
import "../public/nist-header-footer/nist-combined.css";
import "../public/nist-header-footer/nist-header-footer-v-2.0.js";
import Header from "./components/Header";
import Nav from "./components/Navigation";
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
			addMsg({ role: "assistant", content: "✅ openEPD JSON generated." });
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
			addMsg({ role: "assistant", content: "✅ openEPD JSON validated." });
			addMsg({ role: "assistant", content: "✅ JSON is available for download." });
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
		<Theme appearance="dark">
			<Container maxW={"container.xl"} fluid p={0}>
				<Nav />
				<Container style={{ padding: "50px 150px", minHeight: "73vh" }}>
					<Header />
					<br />
					{/* <Container >
				<h3>LLM Settings</h3>
				<div >
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
			</Container> */}

					<FileUpload.Root
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
						<Flex justifyContent="center" alignItems="center" flexDirection={"row"} gap={5}>
							<FileUpload.HiddenInput accept=".pdf,.htm,.html" />
							<FileUpload.Trigger asChild>
								<Button variant="solid" size="lg" color={"teal"} m={0}>
									<LuUpload /> Upload file (PDF or HTML)
								</Button>
							</FileUpload.Trigger>
							<FileUpload.List />
						</Flex>
					</FileUpload.Root>

					{markdown && (
						<Container p={5} style={{ border: "1px solid #2e2e2e", borderRadius: 10 }} mt={5} mb={5}>
							<Text fontSize={"lg"} fontWeight={"bold"} mb={3} color={"teal"}>
								Extracted Markdown
							</Text>
							<ScrollArea.Root height="8rem" variant={"always"}>
								<ScrollArea.Viewport>
									<ScrollArea.Content paddingEnd="3" textStyle="md">
										{markdown}
									</ScrollArea.Content>
								</ScrollArea.Viewport>
								<ScrollArea.Scrollbar />
							</ScrollArea.Root>
						</Container>
					)}

					{markdown && (
						<Container style={{ border: "1px solid #2e2e2e", borderRadius: 10 }} pt={3} pb={3} mb={3}>
							<HStack>
								<Text fontSize={"lg"} fontWeight={"semibold"}>
									Messages
								</Text>
								{jsonOut && (
									<Flex justifyContent="flex-end" flexGrow={1}>
										<Button
											color="teal"
											variant="outline"
											onClick={downloadJSON}
											disabled={!jsonOut}
											// style={{ backgroundColor: "#000", border: "1px solid #2e2e2e" }}
										>
											<LuArrowDownToLine /> Download JSON
										</Button>
									</Flex>
								)}
							</HStack>
							{status !== "done" && status !== "idle" && <Spinner size="lg" />}
							{messages.map((m, i) => (
								<Text
									key={i}
									style={{
										padding: 8,
										margin: "6px 0",
										background: "#000",
										borderBottom: "1px solid #2e2e2e",
									}}
								>
									<Flex>
										<Text fontWeight={"semibold"} fontSize={"lg"} color={"teal.500"}>
											{m.role.toUpperCase()}:&nbsp;
										</Text>
										<Text>{m.content}</Text>
									</Flex>
								</Text>
							))}
						</Container>
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
							theme={githubDarkTheme}
							maxWidth={"100%"}
						/>
					)}

					{validation && (
						<Container border={"1px"} borderColor={"gray.200"} borderRadius={10} mt={5}>
							<strong>{validation}</strong>
						</Container>
					)}
				</Container>
				<Disclaimer />
			</Container>
		</Theme>
	);
}
