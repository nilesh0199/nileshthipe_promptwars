export const LIMITS = {
  decision: {
    max: 300,
    min: 3,
    required: true,
  },
  reasons: {
    max: 600,
    min: 3,
    required: true,
  },
  context: {
    max: 800,
    min: 0,
    required: false,
  },
} as const;
