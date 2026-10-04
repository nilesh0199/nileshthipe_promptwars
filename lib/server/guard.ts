import type { ModelAnalysis } from "../schema";

export interface DirectivePattern {
  category: string;
  regex: RegExp;
}

export const DIRECTIVE_PATTERNS: DirectivePattern[] = [
  { category: "you_should", regex: /\byou\s+should\b/i },
  { category: "you_must", regex: /\byou\s+must\b/i },
  { category: "you_ought_to", regex: /\byou\s+ought\s+to\b/i },
  { category: "you_need_to", regex: /\byou\s+need\s+to\b/i },
  { category: "you_have_to", regex: /\byou\s+have\s+to\b/i },
  { category: "i_recommend", regex: /\bi\s+recommend\b/i },
  { category: "i_suggest_you", regex: /\bi\s+suggest\s+you\b/i },
  { category: "i_would_suggest", regex: /\bi\s+would\s+suggest\b/i },
  { category: "the_best_option", regex: /\bthe\s+best\s+option\b/i },
  { category: "the_best_choice", regex: /\bthe\s+best\s+choice\b/i },
  { category: "the_right_choice", regex: /\bthe\s+right\s+choice\b/i },
  { category: "the_better_option", regex: /\bthe\s+better\s+option\b/i },
  { category: "my_advice", regex: /\bmy\s+advice\b/i },
  { category: "go_ahead_and", regex: /\bgo\s+ahead\s+and\b/i },
  { category: "dont_do_it", regex: /\bdon['’]t\s+do\s+it\b/i },
];

/**
 * Scans all string values in ModelAnalysis EXCEPT evidence_quotes.
 * Returns an array of matched category names (never the matched text itself).
 */
export function containsDirectiveLanguage(modelAnalysis: ModelAnalysis): string[] {
  const stringsToScan: string[] = [];

  if (modelAnalysis.decision_summary) {
    stringsToScan.push(modelAnalysis.decision_summary);
  }
  if (modelAnalysis.closing_note) {
    stringsToScan.push(modelAnalysis.closing_note);
  }

  if (Array.isArray(modelAnalysis.premortem_questions)) {
    for (const q of modelAnalysis.premortem_questions) {
      if (typeof q === "string") stringsToScan.push(q);
    }
  }

  if (Array.isArray(modelAnalysis.reasoning_map)) {
    for (const rm of modelAnalysis.reasoning_map) {
      if (rm.stated_reason) stringsToScan.push(rm.stated_reason);
      if (rm.rests_on) stringsToScan.push(rm.rests_on);
      if (rm.evidence_given) stringsToScan.push(rm.evidence_given);
    }
  }

  if (Array.isArray(modelAnalysis.findings)) {
    for (const f of modelAnalysis.findings) {
      if (f.title) stringsToScan.push(f.title);
      if (f.observation) stringsToScan.push(f.observation);
      // evidence_quotes is intentionally EXCLUDED because it contains verbatim user words
      if (f.evidence_paraphrase) stringsToScan.push(f.evidence_paraphrase);
      if (f.why_it_matters) stringsToScan.push(f.why_it_matters);
      if (f.reflection_question) stringsToScan.push(f.reflection_question);
      if (f.investigation_item) stringsToScan.push(f.investigation_item);
    }
  }

  const matchedCategories = new Set<string>();

  for (const text of stringsToScan) {
    for (const pattern of DIRECTIVE_PATTERNS) {
      if (pattern.regex.test(text)) {
        matchedCategories.add(pattern.category);
      }
    }
  }

  return Array.from(matchedCategories);
}
