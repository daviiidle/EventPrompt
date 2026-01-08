import Container from "components/ui/Container";
import Button from "components/ui/Button";
import { marketingCopy } from "content/marketing";

const Hero = () => {
  return (
    <section id="hero" className="relative overflow-hidden py-20 sm:py-28">
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-100 via-emerald-100 to-transparent blur-3xl"
        aria-hidden="true"
      />
      <Container>
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
            {marketingCopy.brand.tagline}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
            {marketingCopy.hero.heading}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            {marketingCopy.hero.subheading}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button type="button">{marketingCopy.hero.primaryCta}</Button>
            <Button variant="secondary" href="#demo">
              {marketingCopy.hero.secondaryCta}
            </Button>
          </div>
        </div>
        <div className="relative mt-12">
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-sky-100/60 via-white to-transparent blur-2xl" />
          <div className="relative rounded-3xl border border-white/70 bg-white/70 p-6 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-900/70 sm:p-8">
            <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
              <span>EventPrompt dashboard</span>
              <span className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[10px] font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-300">
                Live preview
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">RSVP status</p>
                <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">12 confirmed · 4 pending</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">SMS schedule</p>
                <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">7 days · 3 days · 1 day</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Seating unlock</p>
                <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
                  Unlocks 9:00 AM on wedding day
                </p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Photo uploads</p>
                <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">Gallery: Locked</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Hero;
