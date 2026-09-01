// Claude API integration for RSA app
// Handles two AI touchpoints: belief suggestions (Step B) and rewrite feedback (Step D)

const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

export async function callClaude(
  system: string,
  userText: string,
  maxTokens: number = 500
): Promise<string> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/claude`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system,
        messages: [{ role: 'user', content: userText }],
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json() as any;
    return data.content || '';
  } catch (err) {
    return `Couldn't reach the AI just now — try again, or continue with your own thinking.`;
  }
}

// Step B: Get belief suggestions
export async function suggestBeliefs(situation: string, stepA: string): Promise<string[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/suggest-beliefs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        situation,
        stepA,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json() as any;
    return data.suggestions || [];
  } catch {
    return [];
  }
}

// Step D: Check if a rewrite passes the failed rules
export async function checkRewrite(
  originalBelief: string,
  failedRuleIds: string[],
  rewrite: string,
  ruleDescriptions: Record<string, string>
): Promise<string> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/check-rewrite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originalBelief,
        failedRuleIds,
        rewrite,
        ruleDescriptions,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json() as any;
    return data.feedback || 'Unable to provide feedback at this time.';
  } catch {
    return `Couldn't reach the AI just now — try again, or continue with your own thinking.`;
  }
}
