import React from 'react';
import { Mic, Video, Image, Shield } from 'lucide-react';
import './FeaturesSection.css';

interface Feature {
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge: 'Core' | 'Enterprise';
}

const features: Feature[] = [
  {
    icon: <Video size={28} />,
    title: 'Video Deepfake Detection',
    desc: 'Frame-by-frame neural analysis to detect GAN artifacts, facial boundary inconsistencies, and unnatural blinking patterns in any video format.',
    badge: 'Core',
  },
  {
    icon: <Mic size={28} />,
    title: 'Voice Clone Identification',
    desc: 'Spectral fingerprinting and prosody analysis to expose AI-synthesized speech, even from the latest TTS and voice cloning models.',
    badge: 'Core',
  },
  {
    icon: <Image size={28} />,
    title: 'AI Image Analysis',
    desc: 'EXIF metadata forensics combined with diffusion model artifact detection to flag and classify AI-generated or manipulated images.',
    badge: 'Core',
  },
  {
    icon: <Shield size={28} />,
    title: 'Real-Time Stream Monitoring',
    desc: 'Integrate our low-latency API directly into live broadcast pipelines for continuous, sub-second deepfake alerting at scale.',
    badge: 'Enterprise',
  },
];

interface FeaturesSectionProps {
  onLiveScan?: () => void;
}

const FeaturesSection: React.FC<FeaturesSectionProps> = ({ onLiveScan }) => {
  const handleCardClick = (title: string) => {
    if (title === 'Real-Time Stream Monitoring' && onLiveScan) {
      onLiveScan();
    }
  };

  return (
    <section className="features-section" id="features">
      <div className="features-container">
        <div className="section-header">
          <span className="section-pill">What We Detect</span>
          <h2 className="section-heading">Built for the Full Spectrum<br /> of Synthetic Media</h2>
          <p className="section-subtext">
            Oracle's Decree provides a comprehensive multi-modal analysis suite so no synthetic
            media threat goes undetected.
          </p>
        </div>

        <div className="features-grid features-grid-2col">
          {features.map((f, i) => (
            <div 
              className={`feature-card ${f.badge === 'Enterprise' ? 'enterprise-card clickable' : ''}`} 
              key={i}
              onClick={() => handleCardClick(f.title)}
              style={f.badge === 'Enterprise' ? { cursor: 'pointer' } : {}}
            >
              <div className="feature-icon-wrap">{f.icon}</div>
              <div className="feature-card-header">
                <h3 className="feature-title">{f.title}</h3>
                <span className={`feature-badge badge-${f.badge.toLowerCase()}`}>{f.badge}</span>
              </div>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
