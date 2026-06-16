import * as pdfjsLib from "pdfjs-dist";
import TurndownService from "turndown";

// Use worker URL (vite will bundle and serve it)
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;

export async function pdfToMarkdown(arrayBuffer: ArrayBuffer): Promise<string> {
	const loadingTask = (pdfjsLib as any).getDocument({ data: arrayBuffer });
	const pdf = await loadingTask.promise;
	let text = "";
	for (let i = 1; i <= pdf.numPages; i++) {
		const page = await pdf.getPage(i);
		const content = await page.getTextContent();
		const strings = content.items.map((it: any) => (typeof it.str === "string" ? it.str : "")).join(" ");
		text += strings + "\n\n";
	}
	const td = new TurndownService({ headingStyle: "atx" });
	return td.turndown(text);
}

export function htmlToMarkdown(html: string): string {
	const td = new TurndownService({ headingStyle: "atx" });
	return td.turndown(html || "");
}
