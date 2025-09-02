import { Button, CloseButton, Container, Dialog, FileUpload, Image, Portal, Stack, Text } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { LuRefreshCw, LuUpload } from "react-icons/lu";
import { guardDocumentForLLM } from "../lib/guards";
import { chatCompletion } from "../lib/llm";
import { htmlToMarkdown, pdfToMarkdown } from "../lib/pdf";
import { extraction_prompt_json, filecheck_prompt, system_prompt } from "../lib/prompts";
import { SidebarProps } from "../lib/types";

const Sidebar = ({
	apiUrl,
	apiKey,
	model,
	status,
	setStatus,
	setMarkdown,
	setIsEpdValid,
	setMessages,
	setValidation,
	setJsonOut,
	addMsg,
	ajv,
	openEPDSchema,
}: SidebarProps) => {
	const [uploadKey, setUploadKey] = useState(0);

	const validateEPD = useCallback(
		async (safeText: string) => {
			console.log("Validating EPD...");

			setStatus("validating_epd");

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
			setStatus(ok ? "done" : "error");
			return ok;
		},
		[setStatus, addMsg, setIsEpdValid],
	);

	const extractJSON = useCallback(
		async (safeText: string) => {
			console.log("extracting json...");
			// if (!markdown) return;
			setStatus("extracting_json");

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
			let raw = match[0];

			// Quick repair for common issues
			raw = raw
				// Fix trailing commas
				.replace(/,\s*([}\]])/g, "$1")
				// Fix unquoted values that should be strings
				.replace(/:\s*--(?=[,}])/g, ": null")
				// Fix numbers that might be strings but should be numbers
				.replace(/:\s*"(\d+\.?\d*)"/g, (match: any, num: string) => {
					// Only convert if it's a valid number

					const parsed = parseFloat(num);
					return isNaN(parsed) ? match : `: ${parsed}`;
				});

			// const obj = JSON.parse(repaired);
			let obj;
			try {
				obj = JSON.parse(raw);
			} catch (parseError: any) {
				console.error("JSON Parse Error:", parseError);
				throw new Error(`Failed to parse JSON: ${parseError.message}`);
			}

			setJsonOut(obj);
			addMsg({ role: "assistant", content: "✅ openEPD JSON generated." });
			addMsg({ role: "assistant", content: "Validating openEPD schema." });

			try {
				const validate = ajv.compile(openEPDSchema as any);
				const valid = validate(obj);

				if (!valid) {
					console.log("AJV Validation Errors:", validate.errors);
					const errorDetails = validate.errors
						?.map((err) => `${err.instancePath || "root"}: ${err.message} (received: ${JSON.stringify(err.data)})`)
						.join("\n");

					setValidation(`⚠️ Schema validation warning:\n${errorDetails}`);
					addMsg({ role: "assistant", content: `⚠️ Schema validation warning. Verify output.` });
				} else {
					setValidation("✅ JSON is valid according to the schema.");
					addMsg({ role: "assistant", content: "✅ openEPD JSON validated." });
				}
			} catch (schemaError: any) {
				console.error("Schema Compilation Error:", schemaError);
				setValidation(`❌ Schema error: ${schemaError.message}`);
				addMsg({ role: "assistant", content: "❌ Schema compilation failed." });
			}

			addMsg({ role: "assistant", content: "✅ JSON is available for download." });
		},
		[apiUrl, apiKey, model, setStatus, setJsonOut, addMsg, ajv, openEPDSchema, setValidation],
	);

	const onFileChange = useCallback(
		async (files: File[]) => {
			const f = Array.isArray(files) ? files?.[0] : (files as any)?.item?.(0);
			if (!f) return;
			console.log("file changed");
			try {
				setStatus("extracting");

				// reset state on file upload
				setMarkdown("");
				setMessages([]);
				setValidation("");
				setJsonOut(null);
				setIsEpdValid(null);

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
				setStatus("sanitizing");
				const { safeText, report } = guardDocumentForLLM(md);
				if (report.is_suspicious) {
					addMsg({ role: "system", content: `⚠️ Potential injection sanitized.` });
					console.info("Injection report:", report);
				}
				setMarkdown(safeText);
				addMsg({ role: "system", content: "✅ EPD extracted & sanitized." });
				const validity = await validateEPD(safeText);
				setIsEpdValid(validity);
				setStatus(validity ? "extracting" : "error");
				addMsg({ role: "assistant", content: `EPD Validity Check: ${validity ? "✅ Valid EPD" : "❌ Invalid EPD"}` });
				if (validity) await extractJSON(safeText);
				setStatus("done");
			} catch (e: any) {
				setStatus("error");
			}
		},
		[setStatus, setMarkdown, setMessages, setValidation, setJsonOut, addMsg, validateEPD, extractJSON, setIsEpdValid],
	);

	const onStartOver = useCallback(() => {
		setStatus("idle");
		setUploadKey((k) => k + 1);
		setMarkdown("");
		setMessages([]);
		setJsonOut(null);
		setValidation("");
		setIsEpdValid(null);
	}, [setStatus, setMarkdown, setMessages, setJsonOut, setValidation]);

	return (
		<Container maxW={"20vw"} m={0} p={10}>
			<Text textStyle="xl" fontWeight={800}>
				<Stack direction="column">
					<Image src={"/logo.png"} htmlWidth={"145px"} />
				</Stack>
			</Text>
			<br />
			<Text>
				Please upload your Environmental Product Declaration (EPD) files here. The system will extract and analyze its
				content using AI.
			</Text>
			<br />
			<FileUpload.Root
				key={uploadKey}
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
					<Button variant="solid" size="lg" color={"teal"} m={0}>
						<LuUpload /> Upload file (PDF or HTML)
					</Button>
				</FileUpload.Trigger>
				<FileUpload.List />
			</FileUpload.Root>
			<br />
			<Dialog.Root placement={"center"} motionPreset="slide-in-bottom" role="alertdialog">
				<Dialog.Trigger asChild>
					<Button variant="solid" size="lg" color={"teal"} m={0} disabled={!(status === "done" || status === "error")}>
						<LuRefreshCw />
						Start Over
					</Button>
				</Dialog.Trigger>
				<Portal>
					<Dialog.Backdrop />
					<Dialog.Positioner>
						<Dialog.Content style={{ color: "white" }}>
							<Dialog.Header>
								<Dialog.Title>Start Over</Dialog.Title>
							</Dialog.Header>
							<Dialog.Body>
								This will clear the uploaded file, messages, extracted markdown, and the generated JSON. This action
								cannot be undone.
							</Dialog.Body>
							<Dialog.Footer>
								<Dialog.ActionTrigger asChild>
									<Button variant="outline">No</Button>
								</Dialog.ActionTrigger>
								<Dialog.ActionTrigger asChild>
									<Button colorPalette="red" onClick={onStartOver}>
										Start Over
									</Button>
								</Dialog.ActionTrigger>
							</Dialog.Footer>
							<Dialog.CloseTrigger asChild>
								<CloseButton size="sm" />
							</Dialog.CloseTrigger>
						</Dialog.Content>
					</Dialog.Positioner>
				</Portal>
			</Dialog.Root>
		</Container>
	);
};

export default Sidebar;
