import React from 'react';
import './ChatHeader.css';

const ChatHeader = ({ selectedOwner, onToggleSidebar }) => {
  const handleToggleSidebar = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    }
  };

  return (
    <div className="mychatbox-chat-header">
      <button 
        className="mychatbox-sidebar-toggle-btn"
        onClick={handleToggleSidebar}
        aria-label="Toggle sidebar"
        type="button"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
      </button>
      
      <div className="mychatbox-chat-header-content">
        <div className="mychatbox-chat-header-avatar">
          {selectedOwner?.image ? (
            <img src={selectedOwner.image} alt={selectedOwner.name || 'Owner'} onError={(e) => {
              // Fallback to default avatar if image fails to load
              e.target.style.display = 'none';
            }} />
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2"/>
            </svg>
          )}
        </div>
        
        <div className="mychatbox-chat-header-info">
          <h1>{selectedOwner?.name || 'Select a conversation'}</h1>
          {selectedOwner?.propertyTitle && (
            <p className="mychatbox-chat-header-subtitle">{selectedOwner.propertyTitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
