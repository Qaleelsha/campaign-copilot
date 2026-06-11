import React, { useState, useRef, useEffect } from 'react';
import { sendChat, confirmCampaign } from '../api';
import { Send, Zap, Users, CheckCircle, MessageSquare } from 'lucide-react';
import './ChatPage.css';

const SUGGESTIONS = [
  "Re-engage coffee lovers who haven't bought in 30 days",
  "Send a thank you to VIP customers who spent over ₹1000",
  "Promote our new pastry range to pastry fans in Mumbai",
  "Win back all customers who haven't visited in 60 days",
];

export default function ChatPage() {
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [launched, setLaunched]     = useState(null);
  const bottomRef                   = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(text) {
    const userText = text || input.trim();
    if (!userText) return;

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChat(newMessages);
      const result = res.data.result;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        result
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        result: null
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(plan) {
    setLoading(true);
    try {
      const res = await confirmCampaign(plan);
      setLaunched(res.data);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        result: {
          type: 'launched',
          data: res.data
        }
      }]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-page">
      <div className="chat-header">
        <div className="chat-header-icon">
          <Zap size={16} color="#fff" />
        </div>
        <div>
          <h2>Campaign Copilot</h2>
          <p>Describe your campaign goal in plain English</p>
        </div>
      </div>

      <div className="chat-body">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">
              <MessageSquare size={28} color="var(--accent)" />
            </div>
            <h3>What campaign do you want to run?</h3>
            <p>Describe your goal and I'll build the audience, draft the message, and launch it.</p>
            <div className="suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="suggestion-chip" onClick={() => handleSend(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message-row ${msg.role}`}>
            {msg.role === 'user' ? (
              <div className="bubble user-bubble">{msg.content}</div>
            ) : (
              <AssistantMessage result={msg.result} text={msg.content} onConfirm={handleConfirm} />
            )}
          </div>
        ))}

        {loading && (
          <div className="message-row assistant">
            <div className="bubble assistant-bubble typing">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <input
          className="chat-input"
          placeholder="e.g. Re-engage lapsed coffee lovers with a 10% discount..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          disabled={loading}
        />
        <button
          className="send-btn"
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

function AssistantMessage({ result, text, onConfirm }) {
  if (!result) return <div className="bubble assistant-bubble">{text}</div>;

  if (result.type === 'clarification') {
    return <div className="bubble assistant-bubble">{result.message}</div>;
  }

  if (result.type === 'launched') {
    return (
      <div className="bubble assistant-bubble">
        <div className="launched-banner">
          <CheckCircle size={18} color="var(--success)" />
          <span>Campaign launched to <strong>{result.data.customer_count}</strong> customers!</span>
        </div>
        <p className="launched-sub">Delivery callbacks will start arriving shortly. Check the Campaigns tab for live stats.</p>
      </div>
    );
  }

  if (result.type === 'campaign_plan') {
    const { plan, segment_preview } = result;
    return (
      <div className="bubble assistant-bubble plan-bubble">
        <div className="plan-header">
          <Zap size={14} color="var(--accent)" />
          <strong>Campaign Plan Ready</strong>
        </div>

        <div className="plan-grid">
          <div className="plan-field">
            <label>Campaign</label>
            <span>{plan.campaign_name}</span>
          </div>
          <div className="plan-field">
            <label>Channel</label>
            <span className="badge badge-purple">{plan.channel}</span>
          </div>
          <div className="plan-field full">
            <label>Segment</label>
            <span>{plan.segment_description}</span>
          </div>
          <div className="plan-field full">
            <label>Message</label>
            <span className="plan-message">"{plan.message_template}"</span>
          </div>
        </div>

        <div className="segment-preview">
          <div className="preview-header">
            <Users size={13} />
            <span><strong>{segment_preview.count}</strong> customers match</span>
          </div>
          {segment_preview.sample.length > 0 && (
            <div className="preview-chips">
              {segment_preview.sample.map((c, i) => (
                <span key={i} className="preview-chip">{c.name} · {c.city}</span>
              ))}
              {segment_preview.count > 5 && (
                <span className="preview-chip muted">+{segment_preview.count - 5} more</span>
              )}
            </div>
          )}
        </div>

        {segment_preview.count > 0 ? (
          <button className="confirm-btn" onClick={() => onConfirm(plan)}>
            <Zap size={14} />
            Launch Campaign
          </button>
        ) : (
          <p className="no-match">No customers match this segment. Try adjusting the criteria.</p>
        )}
      </div>
    );
  }

  return null;
}