import {
	Alert,
	Box,
	Button,
	Center,
	CloseButton,
	Container,
	Flex,
	HStack,
	List,
	ScrollArea,
	Spinner,
	Tabs,
	Text,
	Theme,
} from "@chakra-ui/react";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { JsonEditor, githubDarkTheme } from "json-edit-react";
import { useEffect, useMemo, useState } from "react";
import { LuArrowDownToLine } from "react-icons/lu";
import "../public/nist-header-footer/nist-combined.css";
import "../public/nist-header-footer/nist-header-footer-v-2.0.js";
import Header from "./components/Header";
import Nav from "./components/Navigation";
import Sidebar from "./components/Sidebar";

import { strToU8, zipSync } from "fflate";
import { ChatMessage, Status, ValidationResult } from "./lib/types";

import Disclaimer from "./components/Disclaimer";
import openEPDSchema from "./lib/openepd_validation_schema.json";

const modelLabels: Record<string, string> = {
	"Llama-4-Maverick-17B-128E-Instruct-FP8": "Llama Maverick (r-chat)",
	"gpt-oss-120b": "GPT OSS (r-chat)",
	"NVIDIA-Nemotron-3-Super-120B-A12B-FP8": "Nemotron (r-chat)",
	"google/gemini-2.5-flash": "Gemini 2.5 Flash (Vertex)",
	"anthropic/claude-opus-4-6": "Claude Opus 4.6 (Vertex)",
};

const status_text = {
	extracting: "Extracting text from EPD...",
	sanitizing: "Sanitizing extracted text...",
	validating_epd: "Checking if document is a valid EPD...",
	extracting_json: "Extracting JSON from EPD...",
	done: "Done!",
	error: "Error occurred. Please try again.",
	idle: "Idle. Please upload a document.",
};

export default function App() {
	// LLM Config
	const apiUrl = import.meta.env.VITE_API_URL;

	// State sidebar will update
	const [status, setStatus] = useState<Status>("idle");
	const [isEpdValid, setIsEpdValid] = useState<boolean | null>(null);
	const [markdown, setMarkdown] = useState<string>("");
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [jsonOut, setJsonOut] = useState<any>(null);
	const [validation, setValidation] = useState<ValidationResult[]>([]);
	const [model, setModel] = useState<string>("Llama-4-Maverick-17B-128E-Instruct-FP8");
	const [backend, setBackend] = useState<string>("rchat");

	useEffect(() => {
		localStorage.setItem("pars_api_url", apiUrl);
	}, [apiUrl]);

	const ajv = useMemo(() => {
		const a = new Ajv({ allErrors: true, strict: false });
		addFormats(a);
		return a;
	}, []);

	const addMsg = (m: ChatMessage) => {
		setMessages((prev) => [...prev, m]);
	};

	const downloadJSON = () => {
		if (!jsonOut) return;
		const arr = Array.isArray(jsonOut) ? jsonOut : [jsonOut];
		const a = document.createElement("a");
		if (arr.length === 1) {
			const product = arr[0];
			const name = product?.name ?? product?.product_name ?? "product_1";
			const safe = String(name)
				.replace(/[^a-zA-Z0-9_\-]/g, "_")
				.slice(0, 80);
			const blob = new Blob([JSON.stringify(product, null, 2)], { type: "application/json" });
			a.href = URL.createObjectURL(blob);
			a.download = `${safe}_parsEPD.json`;
		} else {
			const files: Record<string, Uint8Array> = {};
			arr.forEach((product: any, i: number) => {
				const name = product?.name ?? product?.product_name ?? `product_${i + 1}`;
				const safe = String(name)
					.replace(/[^a-zA-Z0-9_\-]/g, "_")
					.slice(0, 80);
				files[`${safe}.json`] = strToU8(JSON.stringify(product, null, 2));
			});
			const blob = new Blob([zipSync(files)], { type: "application/zip" });
			a.href = URL.createObjectURL(blob);
			a.download = "parsEPD.zip";
		}
		a.click();
		URL.revokeObjectURL(a.href);
	};

	return (
		<Theme appearance="dark">
			<Container maxW={"container.xl"} fluid p={0}>
				<Nav />
				<Flex>
					<Sidebar // config
						apiUrl={apiUrl}
						// state + setters that the sidebar pipeline will update
						status={status}
						setStatus={setStatus}
						setMarkdown={setMarkdown}
						setMessages={setMessages}
						setValidation={setValidation}
						setJsonOut={setJsonOut}
						addMsg={addMsg}
						ajv={ajv}
						openEPDSchema={openEPDSchema as any}
						setIsEpdValid={setIsEpdValid}
						jsonOut={jsonOut}
						downloadJSON={downloadJSON}
						model={model}
						setModel={setModel}
						backend={backend}
						setBackend={setBackend}
					/>
					<Container style={{ padding: "50px 150px", minHeight: "75vh", maxHeight: "75vh", overflowY: "auto" }}>
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
								{isEpdValid === false && (
									<Alert.Root status="error" variant="solid">
										<Alert.Indicator />
										<Alert.Content>
											<Alert.Title>Error</Alert.Title>
											<Alert.Description>The file is not an EPD.</Alert.Description>
										</Alert.Content>
										<CloseButton pos="relative" top="-2" insetEnd="-2" />
									</Alert.Root>
								)}
								<br />
								<HStack>
									<Text fontSize={"lg"} fontWeight={"semibold"}>
										Messages
									</Text>
									{jsonOut && (
										<Flex justifyContent="flex-end" flexGrow={1} alignItems="center" gap={3}>
											<Text fontSize={"sm"} color={"teal"} fontWeight={"semibold"}>
												Model: {modelLabels[model] ?? model}
											</Text>
											<Button color="teal" variant="solid" onClick={downloadJSON} disabled={!jsonOut}>
												<LuArrowDownToLine />
												{Array.isArray(jsonOut) && jsonOut.length > 1 ? "Download ZIP" : "Download JSON"}
											</Button>
										</Flex>
									)}
								</HStack>
								{status !== "done" && (
									<Box pos="absolute" inset="0" bg="bg/80">
										<Center h="full">
											<Spinner color="teal.500" size="xl" /> &nbsp; {status_text[status]}
										</Center>
									</Box>
								)}
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

						{jsonOut && Array.isArray(jsonOut) && (
							<Tabs.Root mt={5} defaultValue={"0"} lazyMount>
								<Tabs.List>
									{jsonOut.map((item, index) => (
										<Tabs.Trigger key={index} value={index.toString()}>
											{item?.product_name && item.product_name !== "--" ? item.product_name : `Product ${index + 1}`}
										</Tabs.Trigger>
									))}
								</Tabs.List>
								{jsonOut.map((item, index: number) => {
									const vr = validation[index];
									return (
										<Tabs.Content key={index} value={index.toString()}>
											<JsonEditor
												data={item}
												restrictEdit={true}
												restrictDelete={true}
												restrictAdd={true}
												viewOnly={true}
												collapse={1}
												rootName="openEPD"
												theme={githubDarkTheme}
												maxWidth={"100%"}
											/>
											{vr && (
												<Container
													border={"1px"}
													borderColor={vr.valid ? "green.600" : "yellow.600"}
													borderRadius={10}
													mt={3}
													mb={3}
													p={3}
												>
													<Text fontWeight={"bold"} color={vr.valid ? "green.400" : "yellow.400"}>
														{vr.valid ? "✅ Schema valid" : "⚠️ Schema validation warnings"}
													</Text>
													<List.Root>
														{!vr.valid && vr.errors.map((e, i) => <List.Item key={i}>{e}</List.Item>)}
													</List.Root>
												</Container>
											)}
										</Tabs.Content>
									);
								})}
							</Tabs.Root>
						)}
					</Container>
				</Flex>
				<Disclaimer />
			</Container>
		</Theme>
	);
}
