import React from 'react';
import { User, Bell } from 'lucide-react';
import './Header.css';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  return (
    <header className="app-header">
      <div className="header-title-area">
        <h2 className="header-title">{title}</h2>
        {subtitle && <span className="header-subtitle">{subtitle}</span>}
      </div>
      <div className="header-actions">
        <div className="status-badge">
          <span className="pulse-dot"></span>
          <span>SYSTEM ACTIVE</span>
        </div>
        <button className="nav-item" style={{ padding: '0.5rem', width: 'auto' }}>
          <Bell className="nav-icon" />
        </button>
        <div className="user-profile">
          <div className="avatar">
            <User size={20} color="var(--neon-blue)" />
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Admin</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
