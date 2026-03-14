import React, { useState } from 'react';
import { ShieldAlert, Mail, Phone, MapPin, Send, ArrowLeft } from 'lucide-react';
import './ContactPage.css';

interface ContactPageProps {
  onBack: () => void;
}

const ContactPage: React.FC<ContactPageProps> = ({ onBack }) => {
  const [form, setForm] = useState({ name: '', email: '', org: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="contact-layout">
      {/* Topbar */}
      <nav className="contact-topbar">
        <div className="contact-topbar-logo" onClick={onBack}>
          <ShieldAlert size={24} color="#0D6EFD" />
          <span>Oracle's<strong>Decree</strong></span>
        </div>
        <button className="contact-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Home
        </button>
      </nav>

      <div className="contact-body">
        {/* Left info panel */}
        <div className="contact-info-panel">
          <div className="contact-info-inner">
            <span className="contact-pill">Get in Touch</span>
            <h1 className="contact-heading">We'd love to<br />hear from you.</h1>
            <p className="contact-subtext">
              Whether you're integrating our API, evaluating enterprise plans, or have a forensic
              emergency — our team is ready to help.
            </p>

            <div className="contact-details">
              <div className="contact-detail-item">
                <Mail size={18} className="contact-detail-icon" />
                <span>contact@oraclesdecree.io</span>
              </div>
              <div className="contact-detail-item">
                <Phone size={18} className="contact-detail-icon" />
                <span>+1 (800) 555-ORACLE</span>
              </div>
              <div className="contact-detail-item">
                <MapPin size={18} className="contact-detail-icon" />
                <span>San Francisco, CA · London, UK · Singapore</span>
              </div>
            </div>

            <div className="contact-response-note">
              <div className="response-dot"></div>
              Average response time: <strong>under 4 hours</strong>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="contact-form-panel">
          {sent ? (
            <div className="contact-success">
              <div className="success-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#198754" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2>Message Received!</h2>
              <p>Thank you, <strong>{form.name}</strong>. Our team will reach out to <strong>{form.email}</strong> within a few hours.</p>
              <button className="contact-submit-btn" onClick={onBack}>← Back to Home</button>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              <h2 className="form-heading">Send us a message</h2>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contact-name">Full Name</label>
                  <input
                    id="contact-name"
                    type="text"
                    placeholder="Jane Smith"
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="contact-email">Work Email</label>
                  <input
                    id="contact-email"
                    type="email"
                    placeholder="jane@organization.com"
                    required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="contact-org">Organization</label>
                <input
                  id="contact-org"
                  type="text"
                  placeholder="News agency, government body, private firm..."
                  value={form.org}
                  onChange={e => setForm({ ...form, org: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  rows={5}
                  placeholder="Tell us about your use case, security requirements, or any questions..."
                  required
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                />
              </div>
              <button type="submit" className="contact-submit-btn">
                <Send size={16} /> Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
