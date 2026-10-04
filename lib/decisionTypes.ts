export type DecisionTypeId = "study" | "career" | "money" | "life" | "other";

export interface DecisionTypePlaceholders {
  decision: string;
  reasons: string;
  context: string;
}

export interface DecisionTypeExample {
  decision: string;
  reasons: string;
  context: string;
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
      decision: "e.g., Whether to choose the cloud computing elective or data science next semester",
      reasons: "e.g., Cloud seems widely applicable and friends say the professor explains concepts well",
      context: "e.g., Both are 4 credits; cloud has a weekly lab. Unsure about placement value. Registration closes Friday.",
    },
    example: {
      decision: "Whether to choose the cloud computing elective or the data science elective next semester",
      reasons: "Cloud jobs seem to be growing, and my friends say it is easier to score in.",
      context: "Both electives are 4 credits and the cloud one has a practical lab. I don't know which one placement companies prefer. Registration closes on Friday.",
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
      decision: "e.g., Whether to accept a 6-month startup internship or focus on campus placements",
      reasons: "e.g., Hands-on engineering work and working directly with experienced builders",
      context: "e.g., Stipend is 15,000 rupees a month. Unsure how hours fit my classes. NOC deadline is next week.",
    },
    example: {
      decision: "Whether to accept a 6-month internship, or continue with college only",
      reasons: "The stipend is good, the company is close to home, and it gives me industry experience.",
      context: "Stipend is 15,000 rupees per month. Working hours are 9 to 6. The role is listed as junior developer. I'm not sure how it fits with my college schedule. Semester exams are in 3 months.",
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
      decision: "e.g., Whether to buy a 70,000 rupee laptop now or wait for a festival sale",
      reasons: "e.g., Current machine crashes frequently during heavy coding builds",
      context: "e.g., Have 50,000 rupees saved, rest would be EMI. Unsure about interest rates. Need it in two months.",
    },
    example: {
      decision: "Whether to buy a 70,000 rupee laptop now or wait for a sale",
      reasons: "My current laptop is slow and a sale might not come soon.",
      context: "I have 50,000 rupees saved and the rest would be an EMI. I'm not sure what the interest rate would be. My internship starts in two months.",
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
      decision: "e.g., Whether to move into a rented flat near college or stay at home",
      reasons: "e.g., Save two hours of daily commute and gain focused study time",
      context: "e.g., Rent is 8,000 rupees monthly plus food. Haven't fully aligned with parents. Semester begins in six weeks.",
    },
    example: {
      decision: "Whether to move into a rented flat near my college or stay at home",
      reasons: "I would save two hours a day on travel and could focus more.",
      context: "Rent would be 8,000 rupees a month plus food. I haven't discussed it properly with my parents. The semester starts in six weeks.",
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
      decision: "e.g., Whether to join the college hackathon team or work on a solo project",
      reasons: "e.g., Team allows finishing bigger ideas, but solo allows total technical control",
      context: "e.g., Hackathon is 36 hours next month. Unsure how tasks get divided. Solo work has no hard deadline.",
    },
    example: {
      decision: "Whether to join the college hackathon team or keep working on my own project",
      reasons: "A team could finish more, but I like having full control of my project.",
      context: "The hackathon is 36 hours long and next month. My own project has no deadline. I don't know how the team would split the work.",
    },
  },
];

export function getDecisionTypeConfig(id: DecisionTypeId): DecisionTypeConfig {
  const found = DECISION_TYPES.find((t) => t.id === id);
  return found || DECISION_TYPES[1]; // default to career
}
