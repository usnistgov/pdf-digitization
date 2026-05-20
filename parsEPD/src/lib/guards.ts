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
