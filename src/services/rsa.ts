export const RULES = [
  {
    id: 'reality',
    label: 'Is it true?',
    hint: 'Can you prove it with facts? Or are you guessing?'
  },
  {
    id: 'health',
    label: 'Is it good for me?',
    hint: 'Does it keep you safe and healthy? Or make things worse?'
  },
  {
    id: 'goals',
    label: 'Does it help me?',
    hint: 'Does it move you toward what you want? Or pull you away?'
  },
  {
    id: 'conflict',
    label: 'Does it help my relationships?',
    hint: 'Does it make things better with people? Or create problems?'
  },
  {
    id: 'emotion',
    label: 'Does it make me feel better?',
    hint: 'Does it help you feel calmer and less stressed?'
  },
];

export const STEPS = ['A', 'B', 'C', 'D', 'E'];

export const STEP_LABELS = {
  A: 'What Happened',
  B: 'What I Thought',
  C: 'How I Felt',
  D: 'Fix It',
  E: 'New Way to Think',
};

export const STEP_DESCRIPTIONS = {
  A: 'What happened? Just the facts — no opinions yet.',
  B: 'What did you think in that moment? The words in your head.',
  C: 'What did you feel and do? Your emotions and actions.',
  D: 'Test your thoughts. Do they pass the 5 rules?',
  E: 'How do things look different with your new thought?',
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
  status?: 'completed' | 'in_progress';
  lastUpdated?: number;
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
