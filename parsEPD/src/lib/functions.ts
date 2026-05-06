import { jsonrepair } from "jsonrepair";
import { chatCompletion } from "./llm";
import { category_prompt, extraction_prompt_json, filecheck_prompt, system_prompt } from "./prompts";
import specs from "./specs";

interface CallLLMParams {
	apiUrl: string;
	model: string;
	backend: string;
}

const callLLM = async (
	params: CallLLMParams,
	systemPrompt: string[],
	userPrompt: string,
	backend: string,
	stream = false,
): Promise<string> => {
	const instructions = systemPrompt.map((prompt) => {
		return { role: "system", content: prompt };
	});
	console.log(params);
	let res = await chatCompletion({
		apiUrl: params.apiUrl,
		model: params.model,
		temperature: 0,
		top_p: 1,
		//@ts-ignore
		messages: [...instructions, { role: "user", content: userPrompt }],
		backend,
		stream,
	});
	return res;
};

export const validateEPD = async (
	params: CallLLMParams,
	safeText: string,
	model: string,
	backend: string,
): Promise<boolean> => {
	console.log("Validating EPD...");
	// console.log(system_prompt(safeText));
	const reply = await callLLM(params, [system_prompt(safeText), filecheck_prompt], safeText, backend);
	const ok = /valid epd/i.test(reply) && !/not an epd/i.test(reply);
	return ok;
};

export const identifyPC = async (
	params: CallLLMParams,
	safeText: string,
	model: string,
	backend: string,
): Promise<string> => {
	console.log("Identifying product category...");
	const reply = await callLLM(params, [system_prompt(safeText), category_prompt], safeText, backend);
	console.log(reply);
	return reply;
};

export const identifyProductNumbers = async (
	params: CallLLMParams,
	safeText: string,
	model: string,
	backend: string,
): Promise<string> => {
	console.log("Identifying number of products...");
	const reply = await callLLM(
		params,
		[
			system_prompt(safeText),
			"Some EPDs might have more than one product. Identify how many products are declared in this EPD.",
		],
		safeText,
		backend,
	);
	console.log(reply);
	return reply;
};

export const identifySpecs = (product_category: string) => {
	product_category = product_category?.toLowerCase();
	if (product_category === "asphalt" || product_category === "asphalt mixtures") {
		product_category = "asphalt";
	}
	//@ts-ignore
	return specs[product_category?.toLowerCase()];
};

interface ExtractJSONParams extends CallLLMParams {
	ajv: any;
	openEPDSchema: any;
}

export const extractJSON = async (
	params: ExtractJSONParams,
	safeText: string,
	specs: string,
	callbacks: {
		setJsonOut: (obj: any) => void;
		addMsg: (msg: { role: string; content: string }) => void;
		setValidation: (msg: string) => void;
	},
	model: string,
	backend: string,
): Promise<void> => {
	console.log("extracting json...");
	const reply = await callLLM(
		params,
		[extraction_prompt_json(specs, params.openEPDSchema)],
		`<epd_content>\n${safeText}\n</epd_content>`,
		backend,
		true,
	);

	// Extract first {...} then repair any truncated/malformed JSON
	const match = reply.match(/\{[\s\S]*\}/);
	if (!match) throw new Error("No JSON object found in model output.");

	let obj;
	try {
		obj = JSON.parse(jsonrepair(match[0]));
	} catch (parseError: any) {
		console.error("JSON Parse Error:", parseError);
		throw new Error(`Failed to parse JSON: ${parseError.message}`);
	}

	callbacks.setJsonOut([obj]);
	callbacks.addMsg({ role: "assistant", content: "✅ openEPD JSON generated." });
	callbacks.addMsg({ role: "assistant", content: "Validating openEPD schema." });

	try {
		const validate = params.ajv.compile(params.openEPDSchema as any);
		const valid = validate(obj);

		if (!valid) {
			console.log("AJV Validation Errors:", validate.errors);
			const errorDetails = validate.errors
				?.map((err: any) => `${err.instancePath || "root"}: ${err.message} (received: ${JSON.stringify(err.data)})`)
				.join("\n");

			callbacks.setValidation(`⚠️ Schema validation warning:\n${errorDetails}`);
			callbacks.addMsg({ role: "assistant", content: `⚠️ Schema validation warning. Verify output.` });
		} else {
			callbacks.setValidation("✅ JSON is valid according to the schema.");
			callbacks.addMsg({ role: "assistant", content: "✅ openEPD JSON validated." });
		}
	} catch (schemaError: any) {
		console.error("Schema Compilation Error:", schemaError);
		callbacks.setValidation(`❌ Schema error: ${schemaError.message}`);
		callbacks.addMsg({ role: "assistant", content: "❌ Schema compilation failed." });
	}

	callbacks.addMsg({ role: "assistant", content: "✅ JSON is available for download." });
};
