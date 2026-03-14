import React from 'react';
import { Star, Quote } from 'lucide-react';
import './ReviewsSection.css';

const reviews = [
  {
    name: 'Sarah Chen',
    role: 'Digital Forensics Lead',
    org: 'Reuters Verification Unit',
    avatar: 'SC',
    rating: 5,
    text: "Oracle's Decree caught a sophisticated video deepfake within 1.2 seconds that our entire team had spent hours on. It has fundamentally changed how we verify footage before publication. An indispensable tool for any newsroom.",
  },
  {
    name: 'Maj. David Okafor',
    role: 'Cyber Intelligence Analyst',
    org: 'NATO SecOps Division',
    avatar: 'DO',
    rating: 5,
    text: "The voice clone detection is frighteningly accurate. We ran controlled tests using commercially available cloning tools against Oracle's Decree, and it had a 100% detection rate in every trial. Nothing else comes close.",
  },
  {
    name: 'Priya Nair',
    role: 'Head of Trust & Safety',
    org: 'Meta AI Safety Team',
    avatar: 'PN',
    rating: 5,
    text: "We integrated the stream monitoring API into our live content pipeline. The latency is sub-second and the false-positive rate is remarkably low. It has reduced our manual review queue by over 40%.",
  },
  {
    name: 'Dr. Felix Bauer',
    role: 'Computational Forensics Professor',
    org: 'University of Munich',
    avatar: 'FB',
    rating: 5,
    text: "I subjected Oracle's Decree to a rigorous academic blind test across 2,000 samples. Its precision and recall scores exceeded every published baseline I'm aware of. The methodology is genuinely state-of-the-art.",
  },
];

const StarRating: React.FC<{ count: number }> = ({ count }) => (
  <div className="star-row">
    {Array.from({ length: count }).map((_, i) => (
      <Star key={i} size={14} className="star-filled" />
    ))}
  </div>
);

const ReviewsSection: React.FC = () => {
  return (
    <section className="reviews-section" id="reviews">
      <div className="reviews-container">
        <div className="section-header">
          <span className="section-pill">Testimonials</span>
          <h2 className="section-heading">Trusted by the World's<br />Top Verification Teams</h2>
          <p className="section-subtext">
            From award-winning newsrooms to intelligence agencies — hear from the professionals
            who rely on Oracle's Decree every day.
          </p>
        </div>

        <div className="reviews-grid reviews-grid-2col">
          {reviews.map((r, i) => (
            <div className="review-card" key={i}>
              <Quote size={28} className="review-quote-icon" />
              <p className="review-text">"{r.text}"</p>
              <div className="review-footer">
                <div className="review-avatar">{r.avatar}</div>
                <div className="review-author-info">
                  <span className="review-author-name">{r.name}</span>
                  <span className="review-author-role">{r.role} · {r.org}</span>
                </div>
                <StarRating count={r.rating} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
