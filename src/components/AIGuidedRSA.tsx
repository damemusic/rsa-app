import { useState, useRef, useEffect } from 'react';
import { useRSAStore } from '../stores/useRSAStore';
import { sendAIMessage, type Message } from '../services/aiConversation';
import { Layout } from './Layout';
import './AIGuidedRSA.css';

interface ConversationStep {
  phase: 'greeting' | 'situation' | 'facts' | 'beliefs' | 'emotions' | 'rewrite' | 'perspective' | 'review';
  completed: boolean;
}

export function AIGuidedRSA() {
  // AI-guided RSA: conversational approach to help users work through rational self-analysis
  const { currentEntry, setStepA, addBelief, setEmotions, setEffect, saveEntry, setView } = useRSAStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `I'm here to help you work through this situation using the Rational Self-Analysis (RSA) process. This approach helps you examine your thoughts and test them against rational thinking.\n\nLet's start: You mentioned "${currentEntry.situation}". Can you tell me more about what happened? I want to make sure I understand the factual details—who was involved, what specifically was said or done, and what the actual outcome was.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<ConversationStep['phase']>('situation');
  const [phaseData, setPhaseData] = useState({
    situation: currentEntry.situation,
    facts: '',
    beliefs: [] as string[],
    emotions: [] as string[],
    rewrite: [] as string[],
    perspective: '',
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getNextPhasePrompt = (currentPhase: ConversationStep['phase']): string => {
    const prompts: Record<ConversationStep['phase'], string> = {
      greeting: `Let's begin.`,
      situation: `Thank you for clarifying that. Now let's separate the facts from your interpretation.\n\nWhat are the actual, verifiable facts of what happened? Try to describe only what you or another person would directly observe—just the actions and words, without any interpretation or judgment.`,
      facts: `Good, those are the facts. Now, what thoughts or self-talk went through your mind during or after this situation? What were you telling yourself about what happened? These might be interpretations, judgments, or conclusions you drew.`,
      beliefs: `I hear those thoughts. Many of these are beliefs we interpret as facts, but they may not be entirely true. Let's explore them further.\n\nWhat emotions did you feel in response to this situation? List the feelings—like anger, anxiety, shame, disappointment, etc.`,
      emotions: `Thank you for sharing those emotions. Now, let's examine your beliefs from Step 2 more carefully.\n\nFor each belief, I'd like you to consider: Is this belief absolutely, 100% true? What evidence supports it? Is there any evidence against it? What's a more realistic or balanced way to think about this?\n\nTake your most important belief and tell me a more rational, balanced rewrite of it.`,
      rewrite: `That's a powerful rewrite. Let's apply this new perspective to the situation.\n\nGiven this more balanced view, how does it change how you understand what happened? What's a new way of looking at the situation that takes into account what you've learned?`,
      perspective: `Great insight. Now that you've worked through this analysis, let's review what we've discovered. Would you like to save this RSA entry to your journal?`,
      review: `Ready to review your entry before saving.`,
    };
    return prompts[currentPhase];
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to conversation
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Store the response in appropriate phase data
      if (phase === 'situation') {
        setPhaseData(prev => ({ ...prev, situation: userMessage }));
      } else if (phase === 'facts') {
        setPhaseData(prev => ({ ...prev, facts: userMessage }));
      } else if (phase === 'beliefs') {
        setPhaseData(prev => ({ ...prev, beliefs: [userMessage] }));
      } else if (phase === 'emotions') {
        setPhaseData(prev => ({ ...prev, emotions: userMessage.split(',').map(e => e.trim()) }));
      } else if (phase === 'rewrite') {
        setPhaseData(prev => ({ ...prev, rewrite: [userMessage] }));
      } else if (phase === 'perspective') {
        setPhaseData(prev => ({ ...prev, perspective: userMessage }));
      }

      // Get AI response
      const response = await sendAIMessage(userMessage, newMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);

      // Move to next phase after a few exchanges
      // In a real implementation, you'd have more sophisticated logic here
      if (phase !== 'review') {
        const phases: ConversationStep['phase'][] = ['situation', 'facts', 'beliefs', 'emotions', 'rewrite', 'perspective', 'review'];
        const nextPhaseIdx = phases.indexOf(phase) + 1;
        if (nextPhaseIdx < phases.length) {
          setTimeout(() => {
            const nextPhase = phases[nextPhaseIdx];
            setPhase(nextPhase);
            const nextPrompt = getNextPhasePrompt(nextPhase);
            if (nextPrompt) {
              setMessages(prev => [...prev, { role: 'assistant', content: nextPrompt }]);
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error('[AIGuidedRSA] Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble responding right now. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveRSA = () => {
    // Populate the current entry with gathered data
    setStepA(phaseData.facts);

    if (phaseData.beliefs.length > 0) {
      phaseData.beliefs.forEach(belief => {
        if (belief.trim()) addBelief(belief);
      });
    }

    if (phaseData.emotions.length > 0) {
      setEmotions(phaseData.emotions);
    }

    if (phaseData.rewrite.length > 0) {
      // Store first rewrite as example (in real implementation, link to beliefs)
      const beliefs = currentEntry.beliefs;
      if (beliefs.length > 0) {
        // This would ideally update the first belief's rewrite
      }
    }

    if (phaseData.perspective) {
      setEffect(phaseData.perspective);
    }

    // Save the entry
    saveEntry();
  };

  const handleEditSteps = () => {
    // Go back to traditional StepFlow for editing
    setView('flow');
  };

  const handleCancel = () => {
    setView('checkin');
  };

  return (
    <Layout title="Work Through This" subtitle="AI-guided Rational Self-Analysis">
      <div className="ai-rsa-container">
        <div className="ai-rsa-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message message-${msg.role}`}>
              <div className="message-content">{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="message message-assistant">
              <div className="message-content">
                <span className="typing-indicator">
                  <span></span><span></span><span></span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="ai-rsa-input-area">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Share your thoughts... (Shift+Enter for new line)"
            disabled={loading}
            rows={3}
          />
          <div className="ai-rsa-button-group">
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="ai-rsa-send"
            >
              {loading ? 'Thinking...' : 'Send'}
            </button>
            {phase === 'review' && (
              <>
                <button
                  onClick={handleSaveRSA}
                  className="button button-primary"
                >
                  Save RSA
                </button>
                <button
                  onClick={handleEditSteps}
                  className="button button-secondary"
                >
                  Edit Details
                </button>
              </>
            )}
            <button
              onClick={handleCancel}
              className="button button-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
