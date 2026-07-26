function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function textToHtml(text: string): string {
  return escapeHtml(text)
    .split("\n")
    .map((line) => line || "&nbsp;")
    .join("<br>");
}
