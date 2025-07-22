import React, { useState, useEffect, useRef } from 'react';
import '../styles/chatbot.css';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [apiStatus, setApiStatus] = useState('ready'); // 'ready', 'loading', 'error'
  const messagesEndRef = useRef(null);

  // Cohere API Settings (Free Tier)
  const COHERE_API_KEY = "aDwBwqOshC2CRub2kPkXpoLTMve7TmjkKKMgXY2d"; // Get from https://dashboard.cohere.com/api-keys
  const RILO_CONTEXT = `
    You are a Rilo support assistant specializing in:
    - Ride booking assistance
    - Pricing estimates
    - Driver applications
    - Account issues
    Respond concisely (1-2 sentences max) in a friendly tone.
  `;

  useEffect(() => {
    setMessages([{
      text: "Hi there! How can I help with your Rilo needs today?",
      sender: 'bot'
    }]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const queryCohere = async (messageHistory) => {
    setApiStatus('loading');
    try {
      const response = await fetch("https://api.cohere.ai/v1/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${COHERE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "command",
          preamble: RILO_CONTEXT,
          message: messageHistory[messageHistory.length - 1].text,
          chat_history: messageHistory.slice(0, -1).map(m => ({
            role: m.sender === 'user' ? 'USER' : 'CHATBOT',
            message: m.text
          })),
          temperature: 0.3 // More deterministic responses
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Cohere API Error:", error);
      throw error;
    } finally {
      setApiStatus('ready');
    }
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isTyping || apiStatus !== 'ready') return;

    const userMessage = { text: inputValue, sender: 'user' };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsTyping(true);

    try {
      const data = await queryCohere(updatedMessages);
      const botMessage = {
        text: data.text || "I couldn't process that. Please try again.",
        sender: 'bot'
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        text: error.toString().includes("429") 
          ? "I'm getting too many requests. Please wait a moment."
          : "Our chat service is temporarily unavailable.",
        sender: 'bot'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  return (
    <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
      {!isOpen ? (
        <button 
          className="chatbot-toggle" 
          onClick={() => setIsOpen(true)}
          disabled={apiStatus === 'error'}
        >
          <span className="material-symbols-outlined">chat</span>
          {apiStatus === 'error' && <span className="error-badge">!</span>}
        </button>
      ) : (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="header-left">
              <span className="material-symbols-outlined">support_agent</span>
              <h3>Rilo Support</h3>
              {apiStatus === 'error' && <span className="error-text">Offline</span>}
            </div>
            <button className="close-btn" onClick={() => setIsOpen(false)}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.sender}`}>
                {message.text}
              </div>
            ))}
            
            {isTyping && (
              <div className="message bot typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className={`chatbot-input ${isTyping ? 'disabled' : ''}`}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={apiStatus === 'error' ? "Service unavailable" : "Ask about rides, pricing..."}
              disabled={isTyping || apiStatus === 'error'}
            />
            <button 
              onClick={handleSendMessage} 
              disabled={isTyping || apiStatus === 'error'}
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;