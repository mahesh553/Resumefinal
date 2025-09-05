import { Suspense } from 'react';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureSection } from '@/components/landing/FeatureSection';
import { StatsSection } from '@/components/landing/StatsSection';
import { CTASection } from '@/components/landing/CTASection';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Suspense fallback={<LoadingSpinner />}>
          <HeroSection />
          <FeatureSection />
          <StatsSection />
          <CTASection />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}