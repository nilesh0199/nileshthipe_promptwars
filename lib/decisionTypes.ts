export type DecisionTypeId = "study" | "career" | "money" | "life" | "other";

export interface DecisionTypePlaceholders {
  decision: string;
  options: string;
  reasons: string;
  knownFacts: string;
  uncertainties: string;
  constraints: string;
}

export interface DecisionTypeExample {
  decision: string;
  options: string;
  reasons: string;
  knownFacts: string;
  uncertainties: string;
  constraints: string;
}

export interface DecisionTypeConfig {
  id: DecisionTypeId;
  label: string;
  shortDescription: string;
  lenses: string[];
  placeholders: DecisionTypePlaceholders;
  example: DecisionTypeExample;
  showAdviceNote: boolean;
}

export const DECISION_TYPES: DecisionTypeConfig[] = [
  {
    id: "study",
    label: "Study and academics",
    shortDescription: "Courses, electives, higher studies, college choices",
    showAdviceNote: false,
    lenses: [
      "workload and exam or attendance impact",
      "usefulness and recognition of the credential or skill",
      "prerequisites and fit with current level",
      "cost and time commitment",
      "what it keeps open or closes off later",
    ],
    placeholders: {
      decision: "e.g., Whether to choose the cloud computing elective or data science next term",
      options: "e.g., Take cloud computing, or take data science",
      reasons: "e.g., Cloud seems widely applicable and friends say the professor explains concepts well",
      knownFacts: "e.g., Both are 4 credits. Cloud has a practical lab component twice a week",
      uncertainties: "e.g., Not sure which course placement interviewers value more",
      constraints: "e.g., Elective registration portal closes this Friday at 5 PM",
    },
    example: {
      decision: "Whether to choose a cloud computing elective or a data science elective next semester",
      options: "Cloud computing, or data science",
      reasons: "Cloud jobs seem to be growing, and my friends say it is easier to score in.",
      knownFacts: "Both electives are 4 credits. The cloud one has a practical lab.",
      uncertainties: "I don't know which one the placement companies prefer.",
      constraints: "Registration closes on Friday.",
    },
  },
  {
    id: "career",
    label: "Career and work",
    shortDescription: "Internships, job offers, switching, freelance vs placement",
    showAdviceNote: false,
    lenses: [
      "quality of learning and mentorship",
      "schedule and workload alongside other commitments",
      "growth path and chance of a longer-term role",
      "real costs such as commute and time versus pay",
      "what it keeps open or closes off later",
    ],
    placeholders: {
      decision: "e.g., Whether to take an off-campus 6-month internship or focus on campus placements",
      options: "e.g., Join the startup internship, or stay on campus for regular placement drives",
      reasons: "e.g., Direct hands-on engineering work and working alongside experienced developers",
      knownFacts: "e.g., Stipend is 15,000 rupees per month; office is a 40-minute commute each way",
      uncertainties: "e.g., Wondering how many hours per week will be expected during crunch time",
      constraints: "e.g., Need to submit internship NOC to college by the end of next week",
    },
    example: {
      decision: "Whether to accept a 6-month internship",
      options: "Accept the internship, or continue with college only",
      reasons: "The stipend is good, the company is close to home, and it gives me industry experience.",
      knownFacts: "Stipend is 15,000 rupees per month. Working hours are 9 to 6. The role is listed as junior developer.",
      uncertainties: "I'm not sure how it fits with my college schedule.",
      constraints: "Semester exams are in 3 months.",
    },
  },
  {
    id: "money",
    label: "Money",
    shortDescription: "Big purchases, loans, saving, investing",
    showAdviceNote: true,
    lenses: [
      "total cost over time including hidden costs",
      "what the money would otherwise be used for",
      "how reversible the decision is",
      "risk if income or expenses change",
      "who else is affected",
    ],
    placeholders: {
      decision: "e.g., Whether to buy a 70,000 rupee laptop now or wait for the festive sale",
      options: "e.g., Buy immediately on EMI, or save up and wait for discounts",
      reasons: "e.g., Current machine crashes frequently during heavy coding builds",
      knownFacts: "e.g., I currently have 50,000 rupees saved in my student bank account",
      uncertainties: "e.g., Unclear whether interest fees and card charges will increase the total cost",
      constraints: "e.g., My final-year project development starts in two weeks",
    },
    example: {
      decision: "Whether to buy a 70,000 rupee laptop now or wait for a sale",
      options: "Buy now, or wait",
      reasons: "My current laptop is slow and a sale might not come soon.",
      knownFacts: "I have 50,000 rupees saved. The rest would be an EMI.",
      uncertainties: "I'm not sure what the EMI interest rate would be.",
      constraints: "My internship starts in two months.",
    },
  },
  {
    id: "life",
    label: "Life and relationships",
    shortDescription: "Moving, living arrangements, family, friends",
    showAdviceNote: false,
    lenses: [
      "who else is affected and whether they know",
      "how reversible it is and how long the commitment lasts",
      "conflicting priorities",
      "practical logistics",
      "effect on wellbeing",
    ],
    placeholders: {
      decision: "e.g., Whether to shift to a rented apartment near college or continue living at home",
      options: "e.g., Move into a flat with two classmates, or commute from home every day",
      reasons: "e.g., Saving 90 minutes of daily commute and gaining personal independence",
      knownFacts: "e.g., Monthly share is 8,000 rupees plus utility bills",
      uncertainties: "e.g., Haven't had a full conversation with family about household expectations",
      constraints: "e.g., The landlord needs a deposit agreement signed by Sunday",
    },
    example: {
      decision: "Whether to move into a rented flat near my college instead of staying at home",
      options: "Move out, or stay at home",
      reasons: "I would save two hours a day on travel and could focus more.",
      knownFacts: "Rent would be 8,000 rupees a month plus food.",
      uncertainties: "I haven't discussed it properly with my parents.",
      constraints: "The semester starts in six weeks.",
    },
  },
  {
    id: "other",
    label: "Something else",
    shortDescription: "Anything that doesn't fit the others",
    showAdviceNote: false,
    lenses: [
      "what the person is trying to achieve",
      "who is affected",
      "what is reversible",
      "what information is missing",
    ],
    placeholders: {
      decision: "e.g., Whether to join the campus hackathon organizing team or work on a solo portfolio project",
      options: "e.g., Commit to the event committee, or build my independent portfolio app",
      reasons: "e.g., Working with the organizing group offers networking, but solo work gives deep focus",
      knownFacts: "e.g., Event demands 10 hours a week for the next four weeks",
      uncertainties: "e.g., Not sure how tasks are delegated among the committee heads",
      constraints: "e.g., Mid-term assessments start in three weeks",
    },
    example: {
      decision: "Whether to join the college hackathon team or keep working on my own project",
      options: "Join the team, or continue alone",
      reasons: "A team could finish more, but I like having full control of my project.",
      knownFacts: "The hackathon is 36 hours long. My own project has no deadline.",
      uncertainties: "I don't know how the team would split the work.",
      constraints: "The hackathon is next month.",
    },
  },
];

export function getDecisionTypeConfig(id: DecisionTypeId): DecisionTypeConfig {
  const found = DECISION_TYPES.find((t) => t.id === id);
  return found || DECISION_TYPES[1]; // default to career
}
