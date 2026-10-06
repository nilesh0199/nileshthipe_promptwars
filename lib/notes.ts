export interface NoteItem {
  title: string;
  investigationItem: string;
}

export interface FormatNotesInput {
  decisionSummary: string;
  items: NoteItem[];
  notes?: string | null;
  closingNote: string;
}

/**
 * Pure function that formats a user's decision notes into clean plain text.
 * Uses exact headings and newline structure without trailing whitespace,
 * markdown, or HTML tags.
 */
export function formatNotes({
  decisionSummary,
  items,
  notes,
  closingNote,
}: FormatNotesInput): string {
  const trimmedSummary = decisionSummary.trim();
  const trimmedClosing = closingNote.trim();
  const trimmedNotes = (notes ?? "").trim();

  let itemsSection: string;
  if (!items || items.length === 0) {
    itemsSection = "Nothing selected. I haven't marked any finding as worth investigating yet.";
  } else {
    itemsSection = items
      .map((item, index) => `${index + 1}. ${item.investigationItem.trim()} (${item.title.trim()})`)
      .join("\n");
  }

  const thinkingSection = trimmedNotes.length > 0 ? trimmedNotes : "Nothing written yet.";

  return [
    "Perspectra: my notes",
    "",
    "Decision",
    trimmedSummary,
    "",
    "Things I want to investigate",
    itemsSection,
    "",
    "Where my thinking is now",
    thinkingSection,
    "",
    "Closing thought",
    trimmedClosing,
  ].join("\n");
}
