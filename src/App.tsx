import { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AnalysisView from './components/views/AnalysisView';
import HomePage from './components/landing/HomePage';
import GoogleLoginModal from './components/auth/GoogleLoginModal';

interface User {
  name: string;
  email: string;
  avatar: string;
}

function AppInner() {
  const [page, setPage] = useState<'home' | 'app'>('home');
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('dc-user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.avatar === 'object') {
          // Clear corrupted cached React Element
          localStorage.removeItem('dc-user');
          return null;
        }
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // State to manage app/home dropdown
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLoginSuccess = (u: User) => {
    setUser(u);
    localStorage.setItem('dc-user', JSON.stringify(u));
    setShowLogin(false);
    setPage('app');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('dc-user');
    setPage('home');
    setShowDropdown(false);
  };

  if (page === 'home') {
    return (
      <>
        <HomePage
          onLaunchApp={() => { user ? setPage('app') : setShowLogin(true); }}
          user={user}
          onLogout={handleLogout}
          onLiveScan={() => {
            if (user) setPage('app');
            else setShowLogin(true);
          }}
        />
        {showLogin && (
          <GoogleLoginModal
            onClose={() => setShowLogin(false)}
            onSuccess={handleLoginSuccess}
          />
        )}
      </>
    );
  }

  return (
    <div className="scan-page-layout">
      <div className="scan-page-topbar">
        <div className="scan-topbar-logo" onClick={() => setPage('home')} style={{ cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 100 100" fill="none" strokeLinecap="round">
            <circle cx="50" cy="50" r="46" stroke="#4B9EFF" strokeWidth="6" fill="none"/>
            <path d="M50 20 C33 20 20 33 20 50 C20 67 33 80 50 80" stroke="#4B9EFF" strokeWidth="5"/>
            <path d="M50 30 C37 30 28 39 28 50 C28 61 37 70 50 70" stroke="#4B9EFF" strokeWidth="4.5"/>
            <path d="M50 20 C67 20 80 33 80 50 C80 67 67 80 50 80" stroke="#4B9EFF" strokeWidth="5"/>
            <path d="M50 30 C63 30 72 39 72 50 C72 61 63 70 50 70" stroke="#4B9EFF" strokeWidth="4.5"/>
            <circle cx="50" cy="50" r="5" fill="#4B9EFF" stroke="none"/>
          </svg>
          <span>Deep<strong>Check</strong></span>
        </div>
        <div className="scan-topbar-title">Deep Scanning &amp; Analysis</div>
        <div className="scan-topbar-right">
          {user && (
            <div className="scan-user-container" style={{ position: 'relative' }}>
              <div 
                className="scan-user-badge" 
                onClick={() => setShowDropdown(!showDropdown)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.3rem 0.75rem 0.3rem 0.3rem', borderRadius: '100px', border: '1px solid var(--border-card)' }}
              >
                <div className="scan-user-avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #4285F4, #34A853)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#fff', overflow: 'hidden' }}>
                  {typeof user.avatar === 'string' && user.avatar.startsWith('http') ? (
                    <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    user.avatar
                  )}
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name.split(' ')[0]}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>

              {showDropdown && (
                <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '0.5rem', minWidth: '150px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 100 }}>
                  <button 
                    onClick={handleLogout}
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
          )}
          <button className="scan-topbar-back" onClick={() => setPage('home')} style={{ marginLeft: '1rem' }}>← Home</button>
        </div>
      </div>
      <main className="scan-page-main">
        <AnalysisView />
      </main>
    </div>
  );
}

function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1234567890-mock.apps.googleusercontent.com';
  
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
