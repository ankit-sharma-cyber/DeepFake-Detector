import React from 'react';
import { Github, Twitter, Linkedin } from 'lucide-react';
import './LandingFooter.css';

interface LandingFooterProps {
  onLaunchApp: () => void;
}

const ThumbprintIconSmall = () => (
  <svg width="22" height="22" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="46" stroke="#0D6EFD" strokeWidth="6" fill="none"/>
    <path d="M50 20 C33 20 20 33 20 50 C20 67 33 80 50 80" stroke="#0D6EFD" strokeWidth="5" strokeLinecap="round" fill="none"/>
    <path d="M50 30 C37 30 28 39 28 50 C28 61 37 70 50 70" stroke="#0D6EFD" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
    <path d="M50 40 C42 40 36 45 36 50 C36 55 42 60 50 60" stroke="#0D6EFD" strokeWidth="4" strokeLinecap="round" fill="none"/>
    <path d="M50 20 C67 20 80 33 80 50 C80 67 67 80 50 80" stroke="#0D6EFD" strokeWidth="5" strokeLinecap="round" fill="none"/>
    <path d="M50 30 C63 30 72 39 72 50 C72 61 63 70 50 70" stroke="#0D6EFD" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
    <path d="M50 40 C58 40 64 45 64 50 C64 55 58 60 50 60" stroke="#0D6EFD" strokeWidth="4" strokeLinecap="round" fill="none"/>
    <circle cx="50" cy="50" r="5" fill="#0D6EFD"/>
  </svg>
);

const LandingFooter: React.FC<LandingFooterProps> = ({ onLaunchApp }) => {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="landing-footer">
      <div className="footer-cta-banner">
        <div className="footer-cta-inner">
          <h2 className="footer-cta-heading">Ready to expose the<br />undetectable?</h2>
          <p className="footer-cta-sub">
            Join 3,000+ security analysts and newsrooms using DeepCheck.
          </p>
          <div className="footer-cta-actions">
            <button className="footer-cta-btn primary" onClick={onLaunchApp}>Start Scanning</button>
            <button className="footer-cta-btn secondary" onClick={() => scrollTo('contact')}>Contact Us</button>
          </div>
        </div>
      </div>

      <div className="footer-bottom-area">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <ThumbprintIconSmall />
              <span>Deep<strong>Check</strong></span>
            </div>
            <p className="footer-tagline">The forensic standard for synthetic media detection.</p>
            <div className="footer-socials">
              <a href="#" aria-label="github"><Github size={18} /></a>
              <a href="#" aria-label="twitter"><Twitter size={18} /></a>
              <a href="#" aria-label="linkedin"><Linkedin size={18} /></a>
            </div>
          </div>

          <div className="footer-links">
            <div className="footer-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#reviews">Reviews</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#">API Docs</a>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#">Careers</a>
              <a href="#">Press</a>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Security</a>
              <a href="#">Compliance</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom-bar">
          <span>© {new Date().getFullYear()} DeepCheck. All rights reserved.</span>
          <span>Built with integrity. Deployed with purpose.</span>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
