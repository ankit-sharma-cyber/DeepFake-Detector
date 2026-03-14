import React from 'react';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import HowItWorks from './HowItWorks';
import ReviewsSection from './ReviewsSection';
import ContactSection from './ContactSection';
import LandingFooter from './LandingFooter';

interface HomePageProps {
  onLaunchApp: () => void;
  user?: { name: string; email: string; avatar: string } | null;
  onLogout?: () => void;
}

const HomePage: React.FC<HomePageProps & { onLiveScan?: () => void }> = ({ onLaunchApp, user, onLogout, onLiveScan }) => {
  return (
    <div className="homepage-root">
      <Navbar onLaunchApp={onLaunchApp} user={user} onLogout={onLogout} />
      <HeroSection onLaunchApp={onLaunchApp} />
      <FeaturesSection onLiveScan={onLiveScan} />
      <HowItWorks />
      <ReviewsSection />
      <ContactSection />
      <LandingFooter onLaunchApp={onLaunchApp} />
    </div>
  );
};

export default HomePage;
