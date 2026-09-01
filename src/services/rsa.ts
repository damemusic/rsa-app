export const RULES = [
  { id: 'reality', label: 'Is it based on objective reality?' },
  { id: 'health', label: 'Does it protect my life and health?' },
  { id: 'goals', label: 'Does it help me reach my goals?' },
  { id: 'conflict', label: 'Does it help me avoid needless conflict?' },
  { id: 'emotion', label: 'Does it reduce unwanted emotional distress?' },
];

export const STEPS = ['A', 'B', 'C', 'D', 'E'];

export const STEP_LABELS = {
  A: 'Activating Event',
  B: 'Beliefs',
  C: 'Consequences',
  D: 'Disputation',
  E: 'Effect',
};

export const STEP_DESCRIPTIONS = {
  A: 'What happened? Stick to the facts — no opinions or judgments yet.',
  B: 'What were you thinking? Your self-talk in the moment.',
  C: 'How did you feel and act? The emotions and behaviors that followed.',
  D: 'Test your beliefs. Do they pass the 5 Rules for Rational Thinking?',
  E: 'How do things change when you think about it differently?',
};

export interface Belief {
  id: string;
  text: string;
  ruleAnswers: Record<string, boolean>;
  rewrite: string;
  aiFeedback: string;
  aiFeedbackLoading: boolean;
  aiFeedbackError: string;
}

export interface RSAEntry {
  id: string;
  timestamp: number;
  situation: string;
  a: string;
  beliefs: Belief[];
  emotions: string[];
  behavior: string;
  effect: string;
  action: string;
}

const CRISIS_PATTERNS = [
  /suicid/i,
  /kill myself|kill me|end it all/i,
  /hang myself|strangle|overdose/i,
  /hurt myself|self harm|cut myself/i,
  /no reason to live|don't want to live/i,
  /better off dead|world would be better/i,
];

export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some(pattern => pattern.test(text));
}

export function checkBelief(ruleAnswers: Record<string, boolean>): string[] {
  const failed = RULES
    .filter(rule => ruleAnswers[rule.id] === false)
    .map(rule => rule.id);
  return failed;
}

export function freshRSA(): RSAEntry {
  return {
    id: `rsa-${Date.now()}`,
    timestamp: Date.now(),
    situation: '',
    a: '',
    beliefs: [],
    emotions: [],
    behavior: '',
    effect: '',
    action: '',
  };
}

export function serializeRSA(entry: RSAEntry): string {
  return JSON.stringify(entry);
}

export function deserializeRSA(json: string): RSAEntry {
  return JSON.parse(json);
}
