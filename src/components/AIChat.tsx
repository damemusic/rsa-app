import { useState, useRef, useEffect } from 'react';
import { sendAIMessage, generateInitialGreeting, type Message } from '../services/aiConversation';
import './AIChat.css';

interface AIChatProps {
  onClose: () => void;
}

export function AIChat({ onClose }: AIChatProps) {
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

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Get AI response
      const response = await sendAIMessage(userMessage, messages);
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
    <div className="ai-chat-overlay">
      <div className="ai-chat-modal">
        <div className="ai-chat-header">
          <h2>Speak with AI</h2>
          <button className="ai-chat-close" onClick={onClose} aria-label="Close chat">
            ✕
          </button>
        </div>

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
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="ai-chat-send"
          >
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
