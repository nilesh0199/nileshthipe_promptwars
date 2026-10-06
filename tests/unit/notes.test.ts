import { describe, it, expect } from "vitest";
import { formatNotes } from "@/lib/notes";

describe("formatNotes (lib/notes.ts)", () => {
  it("formats notes with multiple items and user reflections exactly as specified", () => {
    const output = formatNotes({
      decisionSummary: "Choosing whether to accept the senior engineering offer in Berlin.",
      items: [
        {
          title: "Relocation costs",
          investigationItem: "Check rental listings and tax implications in Berlin",
        },
        {
          title: "Career trajectory",
          investigationItem: "Ask hiring manager about internal promotion path",
        },
      ],
      notes: "Leaning towards the offer, but need to check housing market first.",
      closingNote: "Take your time evaluating these trade-offs.",
    });

    const expected = [
      "Perspectra: my notes",
      "",
      "Decision",
      "Choosing whether to accept the senior engineering offer in Berlin.",
      "",
      "Things I want to investigate",
      "1. Check rental listings and tax implications in Berlin (Relocation costs)",
      "2. Ask hiring manager about internal promotion path (Career trajectory)",
      "",
      "Where my thinking is now",
      "Leaning towards the offer, but need to check housing market first.",
      "",
      "Closing thought",
      "Take your time evaluating these trade-offs.",
    ].join("\n");

    expect(output).toBe(expected);
  });

  it("handles empty items with the exact specification string", () => {
    const output = formatNotes({
      decisionSummary: "Deciding on grad school vs industry job.",
      items: [],
      notes: "Still exploring options.",
      closingNote: "Every choice offers valuable experience.",
    });

    const expected = [
      "Perspectra: my notes",
      "",
      "Decision",
      "Deciding on grad school vs industry job.",
      "",
      "Things I want to investigate",
      "Nothing selected. I haven't marked any finding as worth investigating yet.",
      "",
      "Where my thinking is now",
      "Still exploring options.",
      "",
      "Closing thought",
      "Every choice offers valuable experience.",
    ].join("\n");

    expect(output).toBe(expected);
  });

  it("handles empty or whitespace-only notes with the exact specification string", () => {
    const outputNull = formatNotes({
      decisionSummary: "Buying vs leasing a car.",
      items: [
        {
          title: "Depreciation rates",
          investigationItem: "Compare 3-year resale values",
        },
      ],
      notes: null,
      closingNote: "Weigh financial predictability against flexibility.",
    });

    expect(outputNull).toContain("Where my thinking is now\nNothing written yet.");

    const outputSpaces = formatNotes({
      decisionSummary: "Buying vs leasing a car.",
      items: [
        {
          title: "Depreciation rates",
          investigationItem: "Compare 3-year resale values",
        },
      ],
      notes: "   \n  \t  ",
      closingNote: "Weigh financial predictability against flexibility.",
    });

    expect(outputSpaces).toContain("Where my thinking is now\nNothing written yet.");
  });

  it("preserves item ordering and consecutive numbering", () => {
    const items = [
      { title: "Item A", investigationItem: "Check A" },
      { title: "Item B", investigationItem: "Check B" },
      { title: "Item C", investigationItem: "Check C" },
      { title: "Item D", investigationItem: "Check D" },
    ];

    const output = formatNotes({
      decisionSummary: "Summary",
      items,
      notes: "Notes",
      closingNote: "Closing",
    });

    expect(output).toContain("1. Check A (Item A)");
    expect(output).toContain("2. Check B (Item B)");
    expect(output).toContain("3. Check C (Item C)");
    expect(output).toContain("4. Check D (Item D)");
  });

  it("trims inputs and has no trailing spaces on any line", () => {
    const output = formatNotes({
      decisionSummary: "  Padded decision summary  \n ",
      items: [
        {
          title: "  Padded title  ",
          investigationItem: "  Padded item  ",
        },
      ],
      notes: "  Padded user notes  \n\n ",
      closingNote: "  Padded closing note   ",
    });

    const lines = output.split("\n");
    for (const line of lines) {
      expect(line).toBe(line.trimEnd());
    }

    expect(output).not.toContain("   ");
  });

  it("contains no markdown formatting characters like asterisks, hashtags, or HTML brackets", () => {
    const output = formatNotes({
      decisionSummary: "Deciding on job",
      items: [{ title: "Title", investigationItem: "Step" }],
      notes: "Thinking notes",
      closingNote: "Closing note",
    });

    expect(output).not.toMatch(/<[^>]+>/); // no HTML
    expect(output).not.toContain("**");
    expect(output).not.toContain("##");
  });
});
