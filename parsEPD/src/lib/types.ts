export type Status = "idle" | "extracting" | "sanitizing" | "validating_epd" | "extracting_json" | "done" | "error";
import Ajv from "ajv";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type SidebarProps = {
	// LLM config
	apiUrl: string;
	apiKey?: string;
	model: string;

	// State and setters (lifted into App)
	status: Status;
	setStatus: (s: Status) => void;
	setMarkdown: (s: string) => void;
	setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
	setValidation: (s: string) => void;
	setJsonOut: (v: any) => void;
	addMsg: (m: ChatMessage) => void;
	setIsEpdValid: (e: any) => void;

	// Schema / validator
	ajv: Ajv;
	openEPDSchema: any;
};
