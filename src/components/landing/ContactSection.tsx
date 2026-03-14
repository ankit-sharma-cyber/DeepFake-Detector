import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import './ContactSection.css';

const ContactSection: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', org: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <section className="contact-section" id="contact">
      <div className="contact-section-container">
        <div className="section-header">
          <span className="section-pill">Contact Us</span>
          <h2 className="section-heading">We'd love to hear from you</h2>
          <p className="section-subtext">
            Whether you're integrating our API, evaluating for your organization, or have a
            forensic emergency — our team responds within hours.
          </p>
        </div>

        <div className="contact-split">
          {/* Info */}
          <div className="contact-info">
            <div className="contact-info-detail">
              <Mail size={18} className="ci-icon" />
              <span>contact@deepcheck.io</span>
            </div>
            <div className="contact-info-detail">
              <Phone size={18} className="ci-icon" />
              <span>+1 (800) 555-DEEP</span>
            </div>
            <div className="contact-info-detail">
              <MapPin size={18} className="ci-icon" />
              <span>San Francisco · London · Singapore</span>
            </div>
            <div className="contact-response-badge">
              <span className="response-pulse"></span>
              Average response: <strong>under 4 hours</strong>
            </div>
          </div>

          {/* Form */}
          <div className="contact-form-wrap">
            {sent ? (
              <div className="contact-sent">
                <div className="sent-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#198754" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h3>Message received!</h3>
                <p>We'll get back to <strong>{form.email}</strong> shortly.</p>
                <button className="cs-submit-btn" onClick={() => setSent(false)} style={{ marginTop: '0.5rem' }}>
                  Send another
                </button>
              </div>
            ) : (
              <form className="cs-form" onSubmit={handleSubmit}>
                <div className="cs-row">
                  <div className="cs-group">
                    <label htmlFor="cs-name">Full Name</label>
                    <input id="cs-name" type="text" placeholder="Jane Smith" required
                      value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="cs-group">
                    <label htmlFor="cs-email">Work Email</label>
                    <input id="cs-email" type="email" placeholder="jane@org.com" required
                      value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="cs-group">
                  <label htmlFor="cs-org">Organization</label>
                  <input id="cs-org" type="text" placeholder="News agency, government body..."
                    value={form.org} onChange={e => setForm({ ...form, org: e.target.value })} />
                </div>
                <div className="cs-group">
                  <label htmlFor="cs-msg">Message</label>
                  <textarea id="cs-msg" rows={4} placeholder="Tell us about your use case..." required
                    value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
                </div>
                <button type="submit" className="cs-submit-btn">
                  <Send size={15} /> Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
