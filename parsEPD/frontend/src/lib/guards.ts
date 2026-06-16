// Prompt-injection guard (browser-only)
const ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;

export const INJECTION_PATTERNS: RegExp[] = [
	/\bignore (all|any|previous|earlier) (prompts|instructions|context)\b/i,
	/\boverride (all|any|the) (prompts|instructions|rules)\b/i,
	/\bdisregard (the|all|any) (instructions|previous messages|context)\b/i,
	/\bforget (the|all|any) (rules|previous instructions|system prompt)\b/i,
	/\breset (your )?(rules|instructions|memory)\b/i,
	/\bfrom now on,? you (will|should|must)\b/i,
	/\byou are now .*\b/i,
	/\bpretend to be\b/i,
	/\bignore the system prompt\b/i,
	/\bdo not follow (?:the )?schema\b/i,
	/\bexfiltrate\b|\bleak\b|\bdata exfiltration\b/i,
	/\bchange (?:the )?(role|rules|policy)\b/i,
	/\brole:\s*(system|developer|assistant)\b/i,
	/\bassistant:\b|\bsystem:\b|\bdeveloper:\b/i,
	/\bBEGIN (?:SYSTEM|DEVELOPER) PROMPT\b/i,
	/\btool_call\b|\bfunction_call\b/i,
	/```(?:python|bash|json|javascript)?/i,
	/https?:\/\/\S+/i,
	/\b(gist\.github|pastebin\.com|drive\.google|dropbox\.com)\b/i,
	/\b[A-Za-z0-9+/=]{100,}\b/,
];

export function normalizeText(s = "") {
	try {
		s = s.normalize("NFKC");
	} catch {}
	s = s.replace(ZERO_WIDTH, "");
	s = s.replace(/[ \t]+/g, " ");
	s = s.replace(/\r?\n\s*\n+/g, "\n\n");
	return s.trim();
}

export function detectPromptInjection(text = "") {
	const norm = normalizeText(text);
	const matches: { pattern: string; sample: string }[] = [];
	for (const rx of INJECTION_PATTERNS) {
		const m = norm.match(rx);
		if (m) matches.push({ pattern: rx.source, sample: m[0] });
	}
	const score = Math.min(100, matches.length * 10);
	return { is_suspicious: score >= 10, score, matches, normalized_text: norm };
}

export function redactInjection(text = "") {
	const norm = normalizeText(text);
	return norm
		.split("\n")
		.map((ln) => (INJECTION_PATTERNS.some((rx) => rx.test(ln)) ? "[[redacted: potential prompt-injection]]" : ln))
		.join("\n")
		.trim();
}

export function guardDocumentForLLM(text = "", threshold = 20) {
	const report = detectPromptInjection(text);
	return {
		safeText: report.score >= threshold ? redactInjection(text) : report.normalized_text,
		report,
	};
}

// export function fixJSONSyntax(jsonString: string) {
// 	if (!jsonString || typeof jsonString !== "string") {
// 		throw new Error("Input must be a non-empty string");
// 	}

// 	let fixed = jsonString.trim();

// 	// Remove any trailing commas before closing brackets/braces
// 	fixed = fixed.replace(/,(\s*[}\]])/g, "$1");

// 	// Add missing commas between object properties
// 	// Matches: "value" followed by whitespace and then a quote (start of next property)
// 	fixed = fixed.replace(/("\s*)\s+"/g, '$1, "');

// 	// Add missing commas between array elements
// 	// Matches: ] or } or "value" followed by whitespace and then [ or { or "
// 	fixed = fixed.replace(/([}\]"]\s*)\s+([{\["'])/g, "$1, $2");

// 	// Add missing colons after property names
// 	// Matches: "property" followed by whitespace and then a value (not a colon)
// 	fixed = fixed.replace(/("\s*)\s+([^:,}\]\s])/g, "$1: $2");

// 	// Fix missing quotes around property names
// 	// Matches: word characters not already quoted followed by colon
// 	fixed = fixed.replace(/([^"\s{,]\w+)(\s*):/g, '"$1"$2:');

// 	// Add missing opening/closing braces for objects
// 	if (!fixed.match(/^\s*{/) && fixed.includes(":")) {
// 		fixed = "{" + fixed;
// 	}
// 	if (!fixed.match(/}\s*$/) && fixed.startsWith("{")) {
// 		fixed = fixed + "}";
// 	}

// 	// Add missing opening/closing brackets for arrays
// 	if (!fixed.match(/^\s*\[/) && fixed.includes(",") && !fixed.includes(":")) {
// 		fixed = "[" + fixed;
// 	}
// 	if (!fixed.match(/\]\s*$/) && fixed.startsWith("[")) {
// 		fixed = fixed + "]";
// 	}

// 	// Clean up multiple consecutive commas
// 	fixed = fixed.replace(/,+/g, ",");

// 	// Clean up spaces around colons and commas
// 	fixed = fixed.replace(/\s*:\s*/g, ": ");
// 	fixed = fixed.replace(/\s*,\s*/g, ", ");

// 	return fixed;
// }

export const fixIncompleteJSON = (jsonString: string) => {
	let fixed = jsonString;

	// 1. Fix: "key": "value",". → "key": "value",
	// Removes period after comma
	fixed = fixed.replace(/,"\./g, ",");

	// 2. Fix: "key": "value"," → "key": "value",
	// Removes trailing comma-quote
	fixed = fixed.replace(/,"\s*$/gm, ",");

	// 3. Fix: "key": "value",. → "key": "value",
	// Removes period after comma (without quotes)
	fixed = fixed.replace(/,\.\s*$/gm, ",");
	fixed = fixed.replace(/,\./g, ",");

	// 4. Fix: "key": "value". → "key": "value"
	// Removes period after closing quote
	fixed = fixed.replace(/"\.\s*([,}\]])/g, '"$1');
	fixed = fixed.replace(/"\.\s*$/gm, '"');

	// 5. Fix: trailing comma before closing brace/bracket
	// "key": "value",} → "key": "value"}
	fixed = fixed.replace(/,(\s*[}\]])/g, "$1");

	// 6. Fix: double commas
	// "key": "value",, → "key": "value",
	fixed = fixed.replace(/,+/g, ",");

	// 7. Fix: period before comma
	// "key": "value"., → "key": "value",
	fixed = fixed.replace(/"\.\s*,/g, '",');

	// 8. Fix: missing comma between properties
	// "key": "value" "key2" → "key": "value", "key2"
	fixed = fixed.replace(/"(\s+)"/g, '", "');

	// 9. Fix: missing comma after closing brace/bracket
	// } "key" → }, "key"
	// ] "key" → ], "key"
	fixed = fixed.replace(/([}\]])(\s+)"/g, '$1, "');

	// 10. Fix: missing comma after value before opening brace/bracket
	// "value" { → "value", {
	// "value" [ → "value", [
	fixed = fixed.replace(/"(\s+)([{\[])/g, '", $2');

	// 11. Fix: period inside quotes followed by comma
	// This is trickier - we need to preserve periods in URLs/text
	// Only fix if it's clearly a formatting error (period right before closing quote)
	// "url": "http://example.com/",". → "url": "http://example.com/"
	fixed = fixed.replace(/("\s*,\s*)"\./g, "$1");

	// 12. Fix: stray periods between structural elements
	fixed = fixed.replace(/\.\s*([,}\]])/g, "$1");
	fixed = fixed.replace(/([,{[])\s*\./g, "$1");

	// 13. Fix: incomplete closing - missing final brace/bracket
	const openBraces = (fixed.match(/\{/g) || []).length;
	const closeBraces = (fixed.match(/\}/g) || []).length;
	const openBrackets = (fixed.match(/\[/g) || []).length;
	const closeBrackets = (fixed.match(/\]/g) || []).length;

	// Add missing closing braces
	for (let i = 0; i < openBraces - closeBraces; i++) {
		fixed += "}";
	}

	// Add missing closing brackets
	for (let i = 0; i < openBrackets - closeBrackets; i++) {
		fixed += "]";
	}

	// 14. Clean up whitespace around structural characters
	fixed = fixed
		.replace(/\s*:\s*/g, ": ")
		.replace(/\s*,\s*/g, ", ")
		.replace(/\{\s+/g, "{")
		.replace(/\s+\}/g, "}")
		.replace(/\[\s+/g, "[")
		.replace(/\s+\]/g, "]");

	return fixed;
};
