import {
	Button,
	CloseButton,
	Container,
	Dialog,
	FileUpload,
	Flex,
	Image,
	Portal,
	Select,
	Stack,
	Text,
	createListCollection,
} from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { LuArrowDownToLine, LuRefreshCw, LuUpload } from "react-icons/lu";
import { extractJSON, identifySpecs, validateEPD } from "../lib/functions";
import { guardDocumentForLLM } from "../lib/guards";
import { htmlToMarkdown, pdfToMarkdown } from "../lib/pdf";
import { SidebarProps } from "../lib/types";

const models = createListCollection({
	items: [
		{ label: "Llama Maverick (r-chat)", value: "Llama-4-Maverick-17B-128E-Instruct-FP8", backend: "rchat" },
		{ label: "GPT OSS (r-chat)", value: "gpt-oss-120b", backend: "rchat" },
		{ label: "Nemotron (r-chat)", value: "NVIDIA-Nemotron-3-Super-120B-A12B-FP8", backend: "rchat" },
		{ label: "Gemini 2.5 Flash (Vertex)", value: "google/gemini-2.5-flash", backend: "vertex" },
		{ label: "Claude Opus 4.6 (Vertex)", value: "anthropic/claude-opus-4-6", backend: "vertex" },
	],
});

const Sidebar = ({
	apiUrl,
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
	const [model, setModel] = useState<string>("Llama-4-Maverick-17B-128E-Instruct-FP8");
	const [backend, setBackend] = useState<string>("rchat");

	const resetState = useCallback(() => {
		setMarkdown("");
		setMessages([]);
		setValidation("");
		setJsonOut(null);
		setIsEpdValid(null);
	}, [setMarkdown, setMessages, setValidation, setJsonOut, setIsEpdValid]);

	const onModelChange = (e: { value: string[]; items: { label: string; value: string; backend: string }[] }) => {
		const model = e.items[0];
		setModel(model.value);
		setBackend(model.backend);
	};

	const extractMarkdown = async (f: File): Promise<string> => {
		const ext = f.name.toLowerCase().split(".").pop();
		if (ext === "pdf") return pdfToMarkdown(await f.arrayBuffer());
		if (ext === "html" || ext === "htm") return htmlToMarkdown(await f.text());
		throw new Error("Please upload PDF or HTML.");
	};

	const llmParams = { apiUrl };

	const onFileChange = useCallback(
		async (files: File[]) => {
			const f = Array.isArray(files) ? files?.[0] : (files as any)?.item?.(0);
			if (!f) return;
			console.log("file changed");
			try {
				setStatus("extracting");
				resetState();

				let md: string;
				try {
					md = await extractMarkdown(f);
				} catch (err: any) {
					alert(err.message);
					setStatus("idle");
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

				const params = { apiUrl, model, backend };
				const raw = await validateEPD(params, safeText);
				const validity = typeof raw === "string" ? JSON.parse(raw) : raw;
				const { is_epd, category, epd_count, products } = validity;

				setIsEpdValid(is_epd);
				setStatus(is_epd ? "extracting" : "error");

				addMsg({ role: "assistant", content: `${validity ? "✅ Valid EPD" : "❌ Invalid EPD"}` });

				if (validity?.is_epd) {
					addMsg({ role: "assistant", content: `Product Category: ${category}` });
					addMsg({ role: "assistant", content: `Number of Products: ${epd_count}` });
					const specs_data = identifySpecs(category);
					await extractJSON(
						{ ...params, ajv, openEPDSchema },
						safeText,
						specs_data,
						{
							setJsonOut,
							addMsg,
							setValidation,
						},
						{ count: Number(epd_count) || (products?.length ?? 1), names: products },
					);
				}
				setStatus("done");
			} catch (e: any) {
				console.error(e.message);
				addMsg({ role: "assistant", content: e.message });
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
			model,
			backend,
		],
	);

	const onStartOver = useCallback(() => {
		setStatus("idle");
		setUploadKey((k) => k + 1);
		resetState();
	}, [setStatus, resetState]);

	const canStartOver = status === "done" || status === "error";

	return (
		<Container maxW={"20vw"} m={0} p={10}>
			<Stack direction="column">
				<Image src={"/logo.png"} htmlWidth={"264px"} alt="parsEPD logo" />
			</Stack>

			<Text mt={5}>
				Please upload your Environmental Product Declaration (EPD) files here. The system will extract and analyze its
				content using AI.
			</Text>
			<Stack direction="column" mt={5}>
				<Select.Root
					collection={models}
					size="lg"
					width={264}
					colorPalette="white"
					value={[model]}
					onValueChange={(e) => onModelChange(e)}
				>
					<Select.HiddenSelect />
					<Select.Label>Select Model</Select.Label>
					<Select.Control>
						<Select.Trigger>
							<Select.ValueText placeholder="Select model" />
						</Select.Trigger>
						<Select.IndicatorGroup>
							<Select.Indicator />
						</Select.IndicatorGroup>
					</Select.Control>
					<Portal>
						<Select.Positioner>
							<Select.Content>
								{models.items.map((m) => (
									<Select.Item item={m} key={m.value}>
										{m.label}
										<Select.ItemIndicator />
									</Select.Item>
								))}
							</Select.Content>
						</Select.Positioner>
					</Portal>
				</Select.Root>
			</Stack>

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
						<Button variant="solid" size="lg" color={"teal"} mt={5} disabled={!canStartOver} width={264}>
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
