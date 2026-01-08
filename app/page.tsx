import NavBar from "components/marketing/NavBar";
import Hero from "components/marketing/Hero";
import HowItWorks from "components/marketing/HowItWorks";
import LockBand from "components/marketing/LockBand";
import Features from "components/marketing/Features";
import WhatWeDontDo from "components/marketing/WhatWeDontDo";
import Demo from "components/marketing/Demo";
import Pricing from "components/marketing/Pricing";
import FAQ from "components/marketing/FAQ";
import FinalCTA from "components/marketing/FinalCTA";
import Footer from "components/marketing/Footer";

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900 dark:bg-black">
      <NavBar />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <LockBand />
        <Features />
        <WhatWeDontDo />
        <Demo />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
