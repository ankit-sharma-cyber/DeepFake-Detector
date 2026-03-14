import React from 'react';
import { Check, X } from 'lucide-react';
import './PricingSection.css';

const plans = [
  {
    name: 'Analyst',
    price: 'Free',
    sub: 'For individuals and researchers',
    features: ['25 scans per month', 'Video & Image analysis', 'Standard report PDF', 'Community support', null, null],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    name: 'Professional',
    price: '$49',
    sub: 'Per month, billed annually',
    features: ['Unlimited scans', 'All media types', 'Advanced forensic reports', 'Voice clone detection', 'API access (500 req/mo)', 'Priority support'],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    sub: 'For organizations and governments',
    features: ['Unlimited scans', 'All media types', 'Legal-grade provenance chain', 'Real-time stream API', 'Dedicated infrastructure', 'SLA & custom contracts'],
    cta: 'Contact Sales',
    highlight: false,
  },
];

const PricingSection: React.FC = () => {
  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-container">
        <div className="section-header">
          <span className="section-pill">Pricing</span>
          <h2 className="section-heading">Plans for Every Scale</h2>
          <p className="section-subtext">
            From independent journalists to government intelligence agencies,
            Oracle's Decree has a plan that fits your mission.
          </p>
        </div>

        <div className="pricing-grid">
          {plans.map((plan, i) => (
            <div className={`pricing-card ${plan.highlight ? 'highlighted' : ''}`} key={i}>
              {plan.highlight && <div className="pricing-popular-badge">Most Popular</div>}
              <div className="pricing-card-top">
                <h3 className="plan-name">{plan.name}</h3>
                <div className="plan-price">
                  <span className="price-main">{plan.price}</span>
                  {plan.price !== 'Free' && plan.price !== 'Custom' && <span className="price-period">/mo</span>}
                </div>
                <p className="plan-sub">{plan.sub}</p>
              </div>
              <ul className="plan-features">
                {plan.features.map((f, j) => (
                  <li key={j} className={`plan-feature ${!f ? 'excluded' : ''}`}>
                    {f ? <Check size={16} className="check-icon" /> : <X size={16} className="x-icon" />}
                    <span>{f || <s>{['API access', 'Priority support'][j - 4]}</s>}</span>
                  </li>
                ))}
              </ul>
              <button className={`plan-cta ${plan.highlight ? 'cta-primary' : 'cta-secondary'}`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
