import HeroSection from "@/components/sections/hero/HeroSection";
import AboutSection from "@/components/sections/about/AboutSection";
import { CareerEvolution } from "@/components/sections/career";
import { ArchiveSection } from "@/components/sections/archive";
import { TechArsenal } from "@/components/sections/tech";
import { ConnectSection } from "@/components/sections/connect";

export default function Page() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <CareerEvolution />
      <ArchiveSection />
      <TechArsenal />
      <ConnectSection />
    </>
  );
}
