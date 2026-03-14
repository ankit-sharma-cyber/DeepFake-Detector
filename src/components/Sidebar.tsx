import React from 'react';
import { ShieldAlert, Activity, Database, Settings } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <ShieldAlert className="sidebar-logo" />
        <span className="sidebar-title">Oracle's Decree</span>
      </div>
      <nav className="sidebar-nav">
        {[
          { id: 'dashboard', icon: Activity, label: 'Dashboard' },
          { id: 'analysis', icon: Database, label: 'Deep Scanning' },
          { id: 'settings', icon: Settings, label: 'System Config' },
        ].map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon className="nav-icon" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        SYS_VER: v1.0.4-beta<br />
        SECURE CONNECTION ESTABLISHED
      </div>
    </aside>
  );
};

export default Sidebar;
