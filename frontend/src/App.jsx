import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatPage from './pages/ChatPage';
import CustomersPage from './pages/CustomersPage';
import CampaignsPage from './pages/CampaignsPage';
import './styles/global.css';

export default function App() {
  const [activePage, setActivePage] = useState('chat');

  const renderPage = () => {
    switch (activePage) {
      case 'chat':      return <ChatPage />;
      case 'customers': return <CustomersPage />;
      case 'campaigns': return <CampaignsPage />;
      default:          return <ChatPage />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}