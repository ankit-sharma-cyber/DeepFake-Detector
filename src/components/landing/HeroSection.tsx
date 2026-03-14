import React from 'react';
import { ArrowRight } from 'lucide-react';
import './HeroSection.css';

interface HeroSectionProps {
  onLaunchApp: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onLaunchApp }) => {
  return (
    <section className="hero-section" id="home">
      <div className="hero-bg-grid"></div>
      <div className="hero-container">
        <h1 className="hero-heading">
          Uncover <span className="hero-accent">Deepfakes.</span><br />
          Protect Digital Truth.
        </h1>
        <p className="hero-desc">
          DeepCheck uses advanced cryptographic heuristics and neural fingerprinting
          to detect synthetic media, voice clones, and AI-generated disinformation — in real time.
        </p>
        <div className="hero-cta-row">
          <button className="hero-cta-primary" onClick={onLaunchApp}>
            Start Free Analysis <ArrowRight size={18} />
          </button>
          <button className="hero-cta-secondary">See How It Works</button>
        </div>

        <div className="hero-stats">
          <div className="stat-item">
            <span className="stat-value">24,591+</span>
            <span className="stat-label">Scans Processed</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">99.4%</span>
            <span className="stat-label">Model Accuracy</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">&lt;2s</span>
            <span className="stat-label">Average Scan Time</span>
          </div>
        </div>


      </div>
    </section>
  );
};

export default HeroSection;
