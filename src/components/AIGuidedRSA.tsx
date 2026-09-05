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
      content: `I'm here to help you talk through this situation. We'll work through what happened step by step, examine what you're telling yourself about it, and figure out what's actually true.\n\nLet's start: You mentioned "${currentEntry.situation}". Can you tell me more about what happened? I want to make sure I understand the facts—who was involved, what specifically was said or done, and what actually happened.`,
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
      const response = await sendAIMessage(userMessage, newMessages, phase);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);

      // Progress to next phase automatically
      if (phase !== 'review') {
        const phases: ConversationStep['phase'][] = ['situation', 'facts', 'beliefs', 'emotions', 'rewrite', 'perspective', 'review'];
        const nextPhaseIdx = phases.indexOf(phase) + 1;
        if (nextPhaseIdx < phases.length) {
          setTimeout(() => {
            setPhase(phases[nextPhaseIdx]);
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
    <Layout title="Talk It Through" subtitle="AI-guided conversation for clarity">
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
                  Save Check-In
                </button>
                <button
                  onClick={handleEditSteps}
                  className="button button-secondary"
                >
                  Review & Adjust
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
