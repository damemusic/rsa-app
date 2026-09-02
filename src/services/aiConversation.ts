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

  // Add reaction patterns
  if (aiProfile.reactionPatterns.length > 0) {
    context += '**Reaction Patterns:**\n';
    aiProfile.reactionPatterns.forEach(pattern => {
      context += `- ${pattern}\n`;
    });
    context += '\n';
  }

  // Add recent RSA entries (last 5)
  if (entries.length > 0) {
    context += '**Recent RSA Practice:**\n';
    const recent = entries.slice(-5);
    recent.forEach(entry => {
      context += `\n- Situation: ${entry.situation.substring(0, 100)}\n`;
      if (entry.beliefs.length > 0) {
        context += `  Beliefs: ${entry.beliefs.map(b => b.text).join('; ')}\n`;
      }
      if (entry.emotions.length > 0) {
        context += `  Emotions: ${entry.emotions.join(', ')}\n`;
      }
    });
    context += '\n';
  }

  return context;
}

export async function sendAIMessage(
  userMessage: string,
  conversationHistory: Message[]
): Promise<string> {
  console.log('[AIConversation] sendAIMessage called with:', { userMessage, historyLength: conversationHistory.length });

  const userContext = buildUserContext();
  console.log('[AIConversation] User context built, length:', userContext.length);

  const systemPrompt = `You are a compassionate, supportive coach helping someone build resilience and emotional awareness using RSA (Rational Self-Analysis) principles. You have access to their personal profile, relationships, stress patterns, and past RSA work.

${userContext}

Guidelines:
- Be empathetic and non-judgmental
- Reference their specific situation, family relationships, or past RSA entries when relevant
- Suggest practical RSA exercises when appropriate (e.g., "Based on your tendency to catastrophize about work, try asking yourself...")
- Ask clarifying questions to understand their current state
- Offer specific coping strategies tailored to what you know about them
- Keep responses concise but warm (2-3 paragraphs max)
- If they mention a specific situation, guide them through the RSA steps (Situation → Automatic thoughts → Beliefs → Emotions → Perspective shift)
- Proactively suggest exercises based on their profile (e.g., if they struggle with a family member, suggest relating-focused practices)`;

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

  let greeting = "Hi! I'm here to support your emotional resilience journey. ";

  if (userProfile && Object.keys(userProfile).length > 0) {
    greeting += "I've reviewed your profile and understand your main stressors. ";
  }

  if (aiProfile.familyMembers.length > 0) {
    greeting += `I know relationships are important to you. `;
  }

  greeting += "What's on your mind today? Would you like to work through something, or would you like some suggestions based on what I know about you?";

  return greeting;
}
