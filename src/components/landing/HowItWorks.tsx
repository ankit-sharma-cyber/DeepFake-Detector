import React from 'react';
import { UploadCloud, Cpu, FileBarChart } from 'lucide-react';
import './HowItWorks.css';

const steps = [
  {
    number: '01',
    icon: <UploadCloud size={32} />,
    title: 'Upload Media',
    desc: 'Drag and drop any video, audio, or image into the scanner. We accept all major formats. Your media is processed in isolated, ephemeral containers.',
  },
  {
    number: '02',
    icon: <Cpu size={32} />,
    title: 'Neural Analysis',
    desc: 'Our multi-modal AI engine runs 40+ independent checks simultaneously—analyzing temporal artifacts, spectral signatures, semantic coherence, and more.',
  },
  {
    number: '03',
    icon: <FileBarChart size={32} />,
    title: 'Detailed Report',
    desc: 'Receive a comprehensive forensic report with confidence scores, highlighted artifacts, legal-grade provenance chain, and recommended actions.',
  },
];

const HowItWorks: React.FC = () => {
  return (
    <section className="hiw-section" id="how-it-works">
      <div className="hiw-container">
        <div className="section-header">
          <span className="section-pill">The Process</span>
          <h2 className="section-heading">Verified in Three Steps</h2>
          <p className="section-subtext">
            Oracle's Decree delivers comprehensive forensic analysis in under 2 seconds,
            no technical expertise required.
          </p>
        </div>

        <div className="hiw-steps">
          {steps.map((step, i) => (
            <React.Fragment key={i}>
              <div className="hiw-step">
                <div className="hiw-step-number">{step.number}</div>
                <div className="hiw-step-icon">{step.icon}</div>
                <h3 className="hiw-step-title">{step.title}</h3>
                <p className="hiw-step-desc">{step.desc}</p>
              </div>
              {i < steps.length - 1 && <div className="hiw-connector"></div>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
