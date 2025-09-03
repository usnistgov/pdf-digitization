import {
	Alert,
	Box,
	Button,
	Center,
	CloseButton,
	Container,
	Flex,
	HStack,
	ScrollArea,
	Spinner,
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

import { ChatMessage, Status } from "./lib/types";

import openEPDSchema from "../src/lib/openepd_validation_schema.json";
import Disclaimer from "./components/Disclaimer";

const status_text = {
	extracting: "Extracting text from document...",
	sanitizing: "Sanitizing extracted text...",
	validating_epd: "Checking if document is a valid EPD...",
	extracting_json: "Extracting JSON from EPD...",
	done: "Done!",
	error: "Error occurred. Please try again.",
	idle: "Idle. Please upload a document.",
};

export default function App() {
	// LLM Config
	const apiUrl = import.meta.env.VITE_LLM_URL;
	const apiKey = import.meta.env.VITE_RCHAT_API_KEY;
	const model = import.meta.env.VITE_MODEL;

	// State sidebar will update
	const [status, setStatus] = useState<Status>("idle");
	const [isEpdValid, setIsEpdValid] = useState<boolean | null>(null);
	const [markdown, setMarkdown] = useState<string>("");
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
				<Flex>
					<Sidebar // config
						apiUrl={apiUrl}
						apiKey={apiKey}
						model={model}
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
										<Flex justifyContent="flex-end" flexGrow={1}>
											<Button color="teal" variant="solid" onClick={downloadJSON} disabled={!jsonOut}>
												<LuArrowDownToLine /> Download JSON
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
				</Flex>
				<Disclaimer />
			</Container>
		</Theme>
	);
}
