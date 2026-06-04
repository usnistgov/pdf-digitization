export type Status = "idle" | "extracting" | "sanitizing" | "validating_epd" | "extracting_json" | "done" | "error";
import Ajv from "ajv";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ValidationResult = { valid: boolean; errors: string[] };

export type SidebarProps = {
	// LLM config
	apiUrl: string;

	// State and setters (lifted into App)
	status: Status;
	setStatus: (s: Status) => void;
	setMarkdown: (s: string) => void;
	setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
	setValidation: (v: ValidationResult[]) => void;
	setJsonOut: (v: any) => void;
	addMsg: (m: ChatMessage) => void;
	setIsEpdValid: (e: any) => void;
	downloadJSON: () => void;
	jsonOut: any;

	// Schema / validator
	ajv: Ajv;
	openEPDSchema: any;
};
