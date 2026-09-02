import { useState, useRef, useEffect } from 'react';
import { useRSAStore } from '../stores/useRSAStore';
import { sendAIMessage, generateInitialGreeting, type Message } from '../services/aiConversation';
import { Layout } from './Layout';
import './AIChat.css';

export function AIChat() {
  const { setView } = useRSAStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: generateInitialGreeting(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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

    // Create new messages array with user message
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Get AI response
      const response = await sendAIMessage(userMessage, newMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('[AIChat] Error:', error);
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

  return (
    <Layout title="Speak with AI" subtitle="Chat with your AI support coach">
      <div className="ai-chat-container">
        <div className="ai-chat-messages">
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

        <div className="ai-chat-input-area">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything... (Shift+Enter for new line)"
            disabled={loading}
            rows={3}
          />
          <div className="ai-chat-button-group">
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="ai-chat-send"
            >
              {loading ? 'Thinking...' : 'Send'}
            </button>
            <button
              onClick={() => setView('journal')}
              className="button button-secondary"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
