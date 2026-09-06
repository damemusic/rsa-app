import { useRSAStore } from '../stores/useRSAStore';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function buildUserContext(): string {
  const store = useRSAStore.getState();
  const { userProfile, aiProfile, entries } = store;

  let context = 'User Profile Context:\n\n';

  // Add basic profile if available
  if (userProfile) {
    context += '**Profile Summary:**\n';
    Object.entries(userProfile).forEach(([key, value]) => {
      if (typeof value === 'string') {
        context += `- ${key}: ${value}\n`;
      } else if (Array.isArray(value)) {
        context += `- ${key}: ${value.join(', ')}\n`;
      }
    });
    context += '\n';
  }

  // Add family members
  if (aiProfile.familyMembers.length > 0) {
    context += '**Family & Relationships:**\n';
    aiProfile.familyMembers.forEach(member => {
      context += `- ${member.name} (${member.role}): ${member.relationshipQuality} relationship, ${member.interactionFrequency}\n`;
      if (member.anxietyTriggers) {
        context += `  Triggers: ${member.anxietyTriggers}\n`;
      }
    });
    context += '\n';
  }

  // Add the Reaction Assessment answers. These are the whole point of the
  // assessment — they were being collected and stored but never reached the
  // model, so the AI behaved as if the user had never filled it in.
  if (aiProfile.scenarioResponses.length > 0) {
    context += '**How They React (from the Reaction Assessment):**\n';
    // Newest answers first, capped so a long assessment cannot crowd out the
    // rest of the context.
    const responses = [...aiProfile.scenarioResponses]
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 15);
    responses.forEach(r => {
      context += `- Scenario: ${r.scenario}\n`;
      context += `  Their reaction: ${r.userResponse}\n`;
    });
    context += '\n';
  }

  // Add reaction patterns
  if (aiProfile.reactionPatterns.length > 0) {
    context += '**Reaction Patterns:**\n';
    aiProfile.reactionPatterns.forEach(pattern => {
      context += `- ${pattern}\n`;
    });
    context += '\n';
  }

  // Add recent check-ins (5 most recent).
  // An entry with nothing filled in yet carries no signal, so skip those rather
  // than feeding the model blank bullets.
  const meaningfulEntries = entries.filter(
    entry =>
      (entry.situation && entry.situation.trim()) ||
      (entry.beliefs && entry.beliefs.length > 0) ||
      (entry.emotions && entry.emotions.length > 0)
  );
  if (meaningfulEntries.length > 0) {
    context += '**Recent Check-Ins:**\n';
    // Newest first. slice(-5) took the OLDEST five, since the backend already
    // returns entries newest-first.
    const recent = [...meaningfulEntries]
      .sort((a, b) => (b.lastUpdated || b.timestamp || 0) - (a.lastUpdated || a.timestamp || 0))
      .slice(0, 5);
    recent.forEach(entry => {
      if (entry.situation) {
        context += `\n- Situation: ${entry.situation.substring(0, 200)}\n`;
      } else {
        context += `\n- Check-in (${entry.status === 'in_progress' ? 'in progress' : 'completed'})\n`;
      }
      if (entry.beliefs?.length > 0) {
        context += `  Beliefs: ${entry.beliefs.map(b => b.text).join('; ')}\n`;
      }
      if (entry.emotions?.length > 0) {
        context += `  Emotions: ${entry.emotions.join(', ')}\n`;
      }
      if (entry.effect) {
        context += `  New perspective: ${entry.effect.substring(0, 200)}\n`;
      }
    });
    context += '\n';
  }

  return context;
}

export async function sendAIMessage(
  userMessage: string,
  conversationHistory: Message[],
  currentPhase?: string
): Promise<string> {
  console.log('[AIConversation] sendAIMessage called with:', { userMessage, historyLength: conversationHistory.length, currentPhase });

  const userContext = buildUserContext();
  console.log('[AIConversation] User context built, length:', userContext.length);

  const phaseGuidance = currentPhase ? `\nCurrent phase: ${currentPhase}. Ask a single focused question appropriate for this phase.` : '';

  const systemPrompt = `You are a straightforward, supportive coach helping someone build resilience and clear thinking. You work with them to examine their thoughts, test them against reality, and make better decisions. You have access to their personal profile, relationships, stress patterns, and past check-ins.

${userContext}

Guidelines:
- Be real, direct, and non-judgmental
- **Ask ONE focused question per response.** Wait for their answer before asking the next question. Do not bundle multiple questions together.
- Keep responses concise and conversational (1-2 paragraphs max)
- Reference their specific situation, family relationships, or past check-ins when relevant
- Acknowledge and validate their response before moving to the next question
- Guide them through the process sequentially (Situation → Facts → Thoughts → Beliefs → Emotions → Reframe → New perspective)
- Match their pace - don't rush. Focus on helping them see one thing clearly at a time${phaseGuidance}`;

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://rsa-backend-production-7b95.up.railway.app';
  console.log('[AIConversation] Backend URL:', backendUrl);

  try {
    console.log('[AIConversation] Making fetch request to /api/claude');
    const response = await fetch(`${backendUrl}/api/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: systemPrompt,
        messages: [
          ...conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          { role: 'user' as const, content: userMessage },
        ],
        max_tokens: 1000,
      }),
    });

    console.log('[AIConversation] Response status:', response.status);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json() as any;
    console.log('[AIConversation] Response data received:', { contentLength: data.content?.length });
    return data.content || '';
  } catch (error) {
    console.error('[AIConversation] Error:', error);
    return "I'm having trouble connecting right now. Please try again in a moment.";
  }
}

export function generateInitialGreeting(): string {
  const store = useRSAStore.getState();
  const { userProfile, aiProfile } = store;

  let greeting = "I'm here to help you talk things through and think clearly. ";

  if (userProfile && Object.keys(userProfile).length > 0) {
    greeting += "I've reviewed your profile and know what stresses you out. ";
  }

  if (aiProfile.familyMembers.length > 0) {
    greeting += `I understand family relationships matter to you. `;
  }

  greeting += "What's on your mind? Let's work through it together.";

  return greeting;
}
