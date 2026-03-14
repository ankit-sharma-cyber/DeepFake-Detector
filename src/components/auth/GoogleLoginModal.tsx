import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import './GoogleLoginModal.css';

interface GoogleLoginModalProps {
  onClose: () => void;
  onSuccess: (user: { name: string; email: string; avatar: string }) => void;
}

const GoogleLoginModal: React.FC<GoogleLoginModalProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<'choose' | 'loading'>('choose');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setStep('loading');
      setErrorMsg(null);
      try {
        // Since useGoogleLogin (implicit flow) returns an access_token, not a credential JWT,
        // we can fetch the user info from the Google API directly.
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const data = await res.json();
        
        setTimeout(() => onSuccess({
          name: data.name || 'User',
          email: data.email || '',
          avatar: data.picture || (data.name || 'User').substring(0, 2).toUpperCase()
        }), 1000); // Simulate brief load
      } catch (err) {
        console.error('Failed to fetch user profile', err);
        setErrorMsg('Failed to process login. Please try again.');
        setStep('choose');
      }
    },
    onError: (errorResponse: { error?: string; error_description?: string }) => {
      console.error('Login Failed:', errorResponse);
      setErrorMsg('Google login failed or popup closed.');
    }
  });

  return (
    <div className="gm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="gm-card">
        {step === 'loading' ? (
          <div className="gm-loading">
            <div className="gm-spinner" />
            <p>Signing you in…</p>
          </div>
        ) : (
          <>
            <div className="gm-header">
              <h2 className="gm-title">Sign in with Google</h2>
              <p className="gm-subtitle">Securely continue to DeepCheck</p>
            </div>

            <div className="gm-accounts" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 2rem' }}>
              {errorMsg && (
                <div style={{ color: 'var(--neon-red)', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                  {errorMsg}
                </div>
              )}
              
              <button 
                onClick={() => login()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-card)',
                  padding: '10px 24px',
                  borderRadius: '100px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s ease',
                  width: '100%',
                  justifyContent: 'center'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
            </div>

            <div className="gm-footer">
              <p>
                By continuing, you agree to our{' '}
                <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleLoginModal;
