import { jsonrepair } from "jsonrepair";
import { chatCompletion } from "./llm";
import openEPDSchema from "./openepd_validation_schema.json";
import { epd_analysis_prompt, extraction_prompt_json_single } from "./prompts";
import specs from "./specs";

interface CallLLMParams {
	apiUrl: string;
	model: string;
	backend: string;
	response_format?: { type: string; json_schema?: any };
}

interface ValidateEPDResult {
	is_epd: boolean;
	category: string;
	epd_count: Number;
	products?: string[];
}

interface ExtractJSONParams extends CallLLMParams {
	ajv: any;
	openEPDSchema: any;
}

const callLLM = async (params: CallLLMParams, systemPrompts: string[], userPrompt: string): Promise<string> => {
	const instructions = systemPrompts.map((prompt) => ({ role: "system", content: prompt }));
	return chatCompletion({
		apiUrl: params.apiUrl,
		model: params.model,
		temperature: 0,
		top_p: 1,
		messages: [...instructions, { role: "user", content: userPrompt }] as any,
		backend: params.backend,
		...(params.response_format && { response_format: params.response_format }),
	});
};

export const validateEPD = async (params: CallLLMParams, safeText: string) => {
	console.log("Validating EPD...");
	let reply = await callLLM(
		{ ...params, response_format: { type: "json_object" } },
		[epd_analysis_prompt],
		safeText,
	);
	return parseFirstObject(reply, "EPD analysis");
};

export const identifySpecs = (product_category: string) => {
	const pc = product_category?.toLowerCase() ?? "";

	const key = pc.includes("asphalt")
		? "asphalt"
		: pc.includes("concrete")
			? "ready mix concrete"
			: pc.includes("cement")
				? "cement"
				: pc.includes("gypsum")
					? "gypsum"
					: pc;
	return (specs as Record<string, string>)[key] ?? "";
};

const parseFirstObject = (reply: string, label: string) => {
	const m = reply.match(/\{[\s\S]*\}/);
	if (!m) throw new Error(`No JSON object found for ${label}.`);
	return JSON.parse(jsonrepair(m[0]));
};

const extractOneProduct = async (
	params: ExtractJSONParams,
	safeText: string,
	specs: string,
	target: { index: number; total: number; name?: string },
): Promise<any> => {
	const reply = await callLLM(
		{ ...params, response_format: { type: "json_schema", json_schema: { name: "openepd", strict: false, schema: openEPDSchema } } },
		[extraction_prompt_json_single(openEPDSchema, specs, target)],
		`<epd_content>\n${safeText}\n</epd_content>`,
	);
	return parseFirstObject(reply, target.name ?? `product ${target.index}`);
};

export const extractJSON = async (
	params: ExtractJSONParams,
	safeText: string,
	specs: string,
	callbacks: {
		setJsonOut: (obj: any) => void;
		addMsg: (msg: { role: string; content: string }) => void;
		setValidation: (v: { valid: boolean; errors: string[] }[]) => void;
	},
	expected: { count: number; names?: string[] } = { count: 1 },
): Promise<void> => {
	const { setJsonOut, addMsg, setValidation } = callbacks;
	const names = expected.names ?? [];
	const count = Math.max(1, Number(expected.count) || names.length || 1);

	console.log("extracting json...");

	addMsg({
		role: "assistant",
		content: `Extracting ${count} product${count > 1 ? "s" : ""} from the EPD...`,
	});

	const targets = Array.from({ length: count }, (_, i) => ({
		index: i + 1,
		total: count,
		name: names[i],
	}));

	// One focused call per product: always yields `count` objects and never produces a response large enough to truncate.
	const settled = await Promise.allSettled(targets.map((t) => extractOneProduct(params, safeText, specs, t)));

	const arr: any[] = [];
	settled.forEach((r, i) => {
		if (r.status === "fulfilled") {
			arr.push(r.value);
		} else {
			console.error(`Extraction failed for product ${i + 1}:`, r.reason);
			addMsg({
				role: "assistant",
				content: `⚠️ Could not extract product ${i + 1}${names[i] ? ` (${names[i]})` : ""}.`,
			});
		}
	});

	if (arr.length === 0) throw new Error("No products could be extracted from the EPD.");

	if (arr.length !== count) {
		addMsg({
			role: "assistant",
			content: `⚠️ Detected ${count} product(s) but extracted ${arr.length}. Please verify the output.`,
		});
	}

	setJsonOut(arr);
	addMsg({ role: "assistant", content: "✅ openEPD JSON generated." });
	addMsg({ role: "assistant", content: "Validating openEPD schema." });

	try {
		const validate = params.ajv.compile(params.openEPDSchema);

		const results = arr.map((obj) => {
			const valid = validate(obj) as boolean;
			const errors = valid
				? []
				: (validate.errors ?? []).map(
						(err: any) => `${err.instancePath || "root"}: ${err.message} (received: ${JSON.stringify(err.data)})`,
					);
			return { valid, errors };
		});

		setValidation(results);

		const anyInvalid = results.some((r) => !r.valid);
		if (anyInvalid) {
			addMsg({ role: "assistant", content: `⚠️ Schema validation warning. Verify output.` });
		} else {
			addMsg({ role: "assistant", content: "✅ openEPD JSON validated." });
		}
	} catch (schemaError: any) {
		console.error("Schema Compilation Error:", schemaError);
		setValidation(arr.map(() => ({ valid: false, errors: [`Schema error: ${schemaError.message}`] })));
		addMsg({ role: "assistant", content: "❌ Schema compilation failed." });
	}

	addMsg({ role: "assistant", content: "✅ JSON is available for download." });
};
