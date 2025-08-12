import re
import unicodedata
from typing import Dict, List, Tuple

# --- 1) Normalization: remove sneaky characters & normalize unicode ---
ZERO_WIDTH = r"[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]"  # zws, rtl/ltr marks, etc.

def normalize_text(s: str) -> str:
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(ZERO_WIDTH, "", s)
    # collapse excessive whitespace
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\r?\n\s*\n+", "\n\n", s)
    return s.strip()

# --- 2) Injection patterns: phrases/structures we don't allow ---
INJECTION_PATTERNS = [
    r"\bignore (all|any|previous|earlier) (prompts|instructions|context)\b",
    r"\boverride (all|any|the) (prompts|instructions|rules)\b",
    r"\bdisregard (the|all|any) (instructions|previous messages|context)\b",
    r"\bforget (the|all|any) (rules|previous instructions|system prompt)\b",
    r"\breset (your )?(rules|instructions|memory)\b",
    r"\bfrom now on,? you (will|should|must)\b",
    r"\byou are now (?:.*)\b",               # role reassignment
    r"\bpretend to be\b",
    r"\bignore the system prompt\b",
    r"\bdo not follow (?:the )?schema\b",
    r"\boutput (?:raw )?markdown code fences\b",
    r"\bexfiltrate\b|\bleak\b|\bdata exfiltration\b",
    r"\bchange (?:the )?(role|rules|policy)\b",
    r"\brole:\s*(system|developer|assistant)\b",
    r"\bassistant:\b|\bsystem:\b|\bdeveloper:\b",   # role spoofing
    r"\bBEGIN (?:SYSTEM|DEVELOPER) PROMPT\b",
    r"\btool_call\b|\bfunction_call\b",             # tool hijack attempts
    r"```(?:python|bash|json|javascript)?",         # fence forcing
    # External payloads / obfuscation
    r"https?://\S+",                                # external links
    r"\b(gist\.github|pastebin\.com|drive\.google|dropbox\.com)\b",
    r"\bdata:text/plain;base64,",
    r"\b[A-Za-z0-9+/=]{100,}\b",                    # long base64 blobs
]

INJECTION_REGEXES = [re.compile(p, re.IGNORECASE | re.MULTILINE) for p in INJECTION_PATTERNS]

# --- 3) Detector: returns score + matches for logging/decisions ---
def detect_prompt_injection(text: str) -> Dict:
    raw = text or ""
    norm = normalize_text(raw)
    matches: List[Tuple[str, str]] = []
    for rx in INJECTION_REGEXES:
        for m in rx.finditer(norm):
            # capture a small snippet for logs
            start = max(0, m.start() - 40)
            end   = min(len(norm), m.end() + 40)
            snippet = norm[start:end]
            matches.append((rx.pattern, snippet))
    # simple scoring: number of unique patterns matched, capped
    score = min(100, len(matches) * 10)
    return {
        "is_suspicious": score >= 10,
        "score": score,
        "match_count": len(matches),
        "matches": matches,
        "normalized_text": norm,
    }

# --- 4) Redactor: removes/neutralizes lines containing injection cues ---
def redact_injection(text: str) -> str:
    norm = normalize_text(text or "")
    lines = norm.splitlines()
    keep: List[str] = []
    for ln in lines:
        if any(rx.search(ln) for rx in INJECTION_REGEXES):
            # drop or neutralize the line entirely
            keep.append("[[redacted: potential prompt-injection line removed]]")
        else:
            keep.append(ln)
    cleaned = "\n".join(keep).strip()
    # Optional: hard fence all content as data
    return cleaned

# --- 5) Gate: one call to use before sending to the LLM ---
def guard_document_for_llm(doc_text: str, threshold: int = 20) -> Tuple[str, Dict]:
    """
    Returns (clean_text, report). If report['is_suspicious'] and score >= threshold,
    the redacted text is returned; else the normalized text.
    """
    # print(doc_text)
    report = detect_prompt_injection(doc_text)
    print(report)
    if report["score"] >= threshold:
        return redact_injection(doc_text), report
    else:
        return report["normalized_text"]
