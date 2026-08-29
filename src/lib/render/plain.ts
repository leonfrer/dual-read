/** Collapse internal newlines to spaces so hard-wrapped dumps read as prose. */
export function renderPlainText(text: string): string {
	return text
		.replace(/[ \t]*\n[ \t]*/g, ' ')
		.replace(/ {2,}/g, ' ')
		.trim();
}
