import Link from "next/link";
import { Display, Body, Eyebrow } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Sparkles, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-center items-center text-center p-6 bg-film-grain">
      <Container size="narrow" className="space-y-8">
        <Eyebrow className="flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--theme-accent-primary)]" />
          Cinematic Birthday Gifts
        </Eyebrow>

        <Display gradient className="text-4xl sm:text-6xl">
          Birthday Vibes
        </Display>

        <Body className="text-lg">
          An elegant, personalized cinematic digital experience designed for the people who matter most.
        </Body>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/design-system">
            <Button variant="gold-glow" size="lg">
              <span>Explore Phase 1 Design System</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </Container>
    </main>
  );
}
