import { Button, CloseButton, Container, Dialog, FileUpload, Flex, Image, Portal, Stack, Text } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { LuArrowDownToLine, LuRefreshCw, LuUpload } from "react-icons/lu";
import { extractJSON, identifyPC, identifyProductNumbers, identifySpecs, validateEPD } from "../lib/functions";
import { guardDocumentForLLM } from "../lib/guards";
import { htmlToMarkdown, pdfToMarkdown } from "../lib/pdf";
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
	downloadJSON,
	jsonOut,
}: SidebarProps) => {
	const [uploadKey, setUploadKey] = useState(0);

	const llmParams = { apiUrl, apiKey, model };

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

				const validity = await validateEPD(llmParams, safeText);
				setIsEpdValid(validity);
				setStatus(validity ? "extracting" : "error");
				addMsg({ role: "assistant", content: `${validity ? "✅ Valid EPD" : "❌ Invalid EPD"}` });
				if (validity) {
					const product_category = await identifyPC(llmParams, safeText);
					addMsg({ role: "assistant", content: `Product Category: ${product_category}` });
					const number_of_products = await identifyProductNumbers(llmParams, safeText);
					addMsg({ role: "assistant", content: `Number of Products: ${number_of_products}` });
					const specs_data = identifySpecs(product_category);
					await extractJSON({ ...llmParams, ajv, openEPDSchema }, safeText, specs_data, {
						setJsonOut,
						addMsg,
						setValidation,
					});
				}
				setStatus("done");
			} catch (e: any) {
				setStatus("error");
			}
		},
		[
			setStatus,
			setMarkdown,
			setMessages,
			setValidation,
			setJsonOut,
			addMsg,
			setIsEpdValid,
			llmParams,
			ajv,
			openEPDSchema,
		],
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
			<Stack direction="column">
				<Image src={"/logo.png"} htmlWidth={"264px"} alt="parsEPD logo" />
			</Stack>

			<Text mt={5}>
				Please upload your Environmental Product Declaration (EPD) files here. The system will extract and analyze its
				content using AI.
			</Text>

			<FileUpload.Root
				key={uploadKey}
				maxW="md"
				alignItems="left"
				mt={5}
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
			<Flex direction={"column"}>
				<Dialog.Root placement={"center"} motionPreset="slide-in-bottom" role="alertdialog">
					<Dialog.Trigger asChild>
						<Button
							variant="solid"
							size="lg"
							color={"teal"}
							mt={5}
							disabled={!(status === "done" || status === "error")}
							width={264}
						>
							<LuRefreshCw />
							Start Over
						</Button>
					</Dialog.Trigger>
					<Portal>
						<Dialog.Backdrop />
						<Dialog.Positioner>
							<Dialog.Content style={{ color: "teal", fontWeight: "600" }}>
								<Dialog.Header>
									<Dialog.Title>Start Over</Dialog.Title>
								</Dialog.Header>
								<Dialog.Body>
									This will clear the uploaded file, messages, extracted markdown, and the generated JSON. This action
									cannot be undone.
								</Dialog.Body>
								<Dialog.Footer>
									<Dialog.ActionTrigger asChild>
										<Button variant="outline" style={{ color: "teal", fontWeight: "600" }}>
											No
										</Button>
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

				<Button color="teal" variant="solid" onClick={downloadJSON} disabled={!jsonOut} mt={5} size={"lg"} width={264}>
					<LuArrowDownToLine /> Download JSON
				</Button>
			</Flex>
		</Container>
	);
};

export default Sidebar;
