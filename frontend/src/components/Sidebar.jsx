import React from 'react';
import {
  MessageSquare, Users, Megaphone,
  Coffee, Zap
} from 'lucide-react';
import './Sidebar.css';

const NAV = [
  { id: 'chat',      icon: MessageSquare, label: 'Campaign Copilot' },
  { id: 'customers', icon: Users,         label: 'Customers' },
  { id: 'campaigns', icon: Megaphone,     label: 'Campaigns' },
];

export default function Sidebar({ activePage, setActivePage }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Coffee size={18} color="#fff" />
        </div>
        <div className="brand-text">
          <span className="brand-name">Brew &amp; Co.</span>
          <span className="brand-sub">CRM Platform</span>
        </div>
      </div>

      <div className="sidebar-section-label">WORKSPACE</div>

      <nav className="sidebar-nav">
        {NAV.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`nav-item ${activePage === id ? 'active' : ''}`}
            onClick={() => setActivePage(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
            {id === 'chat' && (
              <span className="nav-badge">
                <Zap size={10} />
                AI
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-dot" />
        <span>AI Agent Active</span>
      </div>
    </aside>
  );
}