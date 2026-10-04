import type {
  ModelAnalysis,
  AnalyzeRequest,
  Finding,
  ReasoningEntry,
  EvidenceSpan,
  FindingBasis,
} from "../schema";

function cleanQuote(rawQuote: string): string {
  let q = rawQuote.trim();
  // Strip surrounding quotes
  q = q.replace(/^["'“”‘’«»]+|["'“”‘’«»]+$/g, "").trim();
  // Strip leading/trailing ellipses
  q = q.replace(/^(\.\.\.|…)+|(\.\.\.|…)+$/g, "").trim();
  // Strip surrounding quotes again if wrapped inside ellipses
  q = q.replace(/^["'“”‘’«»]+|["'“”‘’«»]+$/g, "").trim();
  return q;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildQuoteRegex(cleanQ: string): RegExp | null {
  const words = cleanQ.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const wordPatterns = words.map((w) => {
    let esc = escapeRegex(w);
    esc = esc.replace(/['’‘]/g, "['’‘]");
    esc = esc.replace(/["“”]/g, '["“”]');
    esc = esc.replace(/[-—–−]/g, "[-—–−]");
    return esc;
  });

  return new RegExp(wordPatterns.join("\\s+"), "i");
}

interface MatchCandidate {
  field: "decision" | "reasons" | "context";
  content: string;
}

/**
 * Verifies and grounds quotes from ModelAnalysis against the user's input.
 * Searches decision, reasons, and context in order.
 * Downgrades stated findings with 0 verified spans to inferred.
 * Assigns ids f1.. and r1.. in sequence.
 */
export function groundFindings(
  modelAnalysis: ModelAnalysis,
  input: AnalyzeRequest
): {
  reasoningMap: ReasoningEntry[];
  findings: Finding[];
  quotesDropped: number;
} {
  let quotesDropped = 0;

  const fieldsToSearch: MatchCandidate[] = [
    { field: "decision", content: input.decision || "" },
    { field: "reasons", content: input.reasons || "" },
    { field: "context", content: input.context || "" },
  ];

  // Assign ids r1, r2, ... in order
  const reasoningMap: ReasoningEntry[] = (modelAnalysis.reasoning_map || []).map(
    (entry, index) => ({
      id: `r${index + 1}`,
      stated_reason: entry.stated_reason,
      rests_on: entry.rests_on,
      evidence_given: entry.evidence_given,
    })
  );

  // Ground findings and assign ids f1, f2, ... in order
  const findings: Finding[] = (modelAnalysis.findings || []).map(
    (finding, index) => {
      const verifiedEvidence: EvidenceSpan[] = [];
      const quotes = finding.evidence_quotes || [];

      for (const rawQuote of quotes) {
        if (!rawQuote || typeof rawQuote !== "string") {
          quotesDropped += 1;
          continue;
        }

        const cleaned = cleanQuote(rawQuote);
        if (cleaned.length < 4) {
          quotesDropped += 1;
          continue;
        }

        const regex = buildQuoteRegex(cleaned);
        if (!regex) {
          quotesDropped += 1;
          continue;
        }

        let foundMatch = false;

        for (const candidate of fieldsToSearch) {
          const match = regex.exec(candidate.content);
          if (match && match.index !== undefined) {
            const start = match.index;
            const end = match.index + match[0].length;
            const originalText = candidate.content.slice(start, end);

            verifiedEvidence.push({
              field: candidate.field,
              start,
              end,
              text: originalText,
            });
            foundMatch = true;
            break; // Matched in this field; do not duplicate across other fields
          }
        }

        if (!foundMatch) {
          quotesDropped += 1;
        }
      }

      // If basis was stated but no verified evidence spans remain, downgrade to inferred
      let finalBasis: FindingBasis = finding.basis;
      if (finalBasis === "stated" && verifiedEvidence.length === 0) {
        finalBasis = "inferred";
      }

      return {
        id: `f${index + 1}`,
        type: finding.type,
        title: finding.title,
        observation: finding.observation,
        evidence: verifiedEvidence,
        evidence_paraphrase: finding.evidence_paraphrase,
        basis: finalBasis,
        category: finding.category,
        why_it_matters: finding.why_it_matters,
        reflection_question: finding.reflection_question,
        investigation_item: finding.investigation_item,
      };
    }
  );

  return {
    reasoningMap,
    findings,
    quotesDropped,
  };
}
