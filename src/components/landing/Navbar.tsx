import React, { useState, useEffect } from 'react';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import './Navbar.css';

interface NavbarProps {
  onLaunchApp: () => void;
  user?: { name: string; email: string; avatar: string } | null;
  onLogout?: () => void;
}

const ThumbprintIcon = ({ color = '#4B9EFF' }: { color?: string }) => (
  <svg width="30" height="30" viewBox="0 0 100 100" fill="none" strokeLinecap="round">
    <circle cx="50" cy="50" r="46" stroke={color} strokeWidth="5" fill="none"/>
    <path d="M50 20 C33 20 20 33 20 50 C20 67 33 80 50 80" stroke={color} strokeWidth="4.5"/>
    <path d="M50 30 C37 30 28 39 28 50 C28 61 37 70 50 70" stroke={color} strokeWidth="4"/>
    <path d="M50 40 C42 40 36 45 36 50 C36 55 42 60 50 60" stroke={color} strokeWidth="3.5"/>
    <path d="M50 20 C67 20 80 33 80 50 C80 67 67 80 50 80" stroke={color} strokeWidth="4.5"/>
    <path d="M50 30 C63 30 72 39 72 50 C72 61 63 70 50 70" stroke={color} strokeWidth="4"/>
    <path d="M50 40 C58 40 64 45 64 50 C64 55 58 60 50 60" stroke={color} strokeWidth="3.5"/>
    <circle cx="50" cy="50" r="5" fill={color} stroke="none"/>
  </svg>
);

const Navbar: React.FC<NavbarProps> = ({ onLaunchApp, user, onLogout }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-inner">
        {/* Logo */}
        <div className="nav-logo" onClick={() => scrollTo('home')}>
          <ThumbprintIcon color="#4B9EFF" />
          <span className="nav-logo-text">Deep<strong>Check</strong></span>
        </div>

        {/* Nav links */}
        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <a onClick={() => scrollTo('home')} className="nav-link">Home</a>
          <a onClick={() => scrollTo('features')} className="nav-link">Features</a>
          <a onClick={() => scrollTo('how-it-works')} className="nav-link">How It Works</a>
          <a onClick={() => scrollTo('reviews')} className="nav-link">Reviews</a>
          <a onClick={() => scrollTo('contact')} className="nav-link">Contact Us</a>
        </div>

        {/* Actions */}
        <div className="nav-actions">
          {/* Dark mode toggle */}
          <button
            className="nav-theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <div className="nav-user-container" style={{ position: 'relative' }}>
              <div 
                className="nav-user-chip" 
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.3rem 0.75rem 0.3rem 0.3rem', borderRadius: '100px', border: '1px solid var(--border-card)' }}
              >
                <div className="nav-avatar" style={{ overflow: 'hidden' }}>
                  {typeof user.avatar === 'string' && user.avatar.startsWith('http') ? (
                    <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    user.avatar
                  )}
                </div>
                <span className="nav-user-name">{user.name.split(' ')[0]}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              
              {showUserDropdown && onLogout && (
                <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '0.5rem', minWidth: '150px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 100 }}>
                  <button 
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLogout();
                    }}
                    style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: 'var(--neon-red)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', borderRadius: '8px', textAlign: 'left' }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(220,53,69,0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="nav-login-btn" onClick={onLaunchApp}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="nav-google-icon">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="rgba(255,255,255,0.7)" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="rgba(255,255,255,0.7)" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="rgba(255,255,255,0.5)" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in
            </button>
          )}

          <button className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="menu">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
