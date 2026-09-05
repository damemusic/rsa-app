import { useState, useRef, useEffect } from 'react';
import { useRSAStore } from '../stores/useRSAStore';
import { sendAIMessage, type Message } from '../services/aiConversation';
import { saveProgressEntry } from '../services/entries';
import { Layout } from './Layout';
import './AIGuidedRSA.css';

interface ConversationStep {
  phase: 'greeting' | 'situation' | 'facts' | 'beliefs' | 'emotions' | 'rewrite' | 'perspective' | 'confirmation' | 'review';
  completed: boolean;
}

export function AIGuidedRSA() {
  // AI-guided RSA: conversational approach to help users work through rational self-analysis
  // Includes save progress, confirmation phase, and in-progress tracking features
  const { currentEntry, currentUser, setStepA, addBelief, setEmotions, setEffect, saveEntry, setView } = useRSAStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `I'm here to help you think through this clearly. We'll talk through what happened, examine what you're telling yourself about it, and figure out what's actually true.\n\nYou mentioned: "${currentEntry.situation}"\n\nLet's dig into the facts. Can you walk me through exactly what happened? I mean the concrete details—who was involved, what specifically was said or done, and what actually occurred. Focus on just the facts for now, no interpretations.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
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

  // Auto-save progress after each phase to preserve user data
  useEffect(() => {
    if (phaseData.facts && phaseData.facts !== currentEntry.a) {
      setStepA(phaseData.facts);
    }
    if (phaseData.emotions.length > 0 && phaseData.emotions !== currentEntry.emotions) {
      setEmotions(phaseData.emotions);
    }
    if (phaseData.perspective && phaseData.perspective !== currentEntry.effect) {
      setEffect(phaseData.perspective);
    }
  }, [phase]);

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

      // Get AI response based on phase
      let response: string;
      if (phase === 'confirmation') {
        // For confirmation phase, ask if they agree with their new perspective
        response = `So you're telling yourself: "${phaseData.perspective}"\n\nDoes that feel true to you? Does this new way of thinking feel right, even if it's different from what you believed before?`;
      } else {
        response = await sendAIMessage(userMessage, newMessages, phase);
      }
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);

      // Progress to next phase automatically
      if (phase !== 'review') {
        const phases: ConversationStep['phase'][] = ['situation', 'facts', 'beliefs', 'emotions', 'rewrite', 'perspective', 'confirmation', 'review'];
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

  const handleSaveProgress = async () => {
    if (!currentUser) return;

    setSavingProgress(true);
    try {
      const entryToSave = {
        ...currentEntry,
        a: phaseData.facts || currentEntry.a,
        emotions: phaseData.emotions.length > 0 ? phaseData.emotions : currentEntry.emotions,
        effect: phaseData.perspective || currentEntry.effect,
      };

      await saveProgressEntry(currentUser.userId, entryToSave, 'in_progress');
      alert('Progress saved! You can resume this check-in later.');
      setView('checkin');
    } catch (error) {
      console.error('[AIGuidedRSA] Error saving progress:', error);
      alert('Failed to save progress. Please try again.');
    } finally {
      setSavingProgress(false);
    }
  };

  const handleSaveRSA = () => {
    // Ensure any beliefs collected are added to store
    if (phaseData.beliefs.length > 0) {
      phaseData.beliefs.forEach(belief => {
        if (belief.trim()) addBelief(belief);
      });
    }

    // Save the entry to database
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
              onClick={handleSaveProgress}
              disabled={savingProgress}
              className="button button-accent"
            >
              {savingProgress ? 'Saving...' : 'Save Progress & Exit'}
            </button>
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
