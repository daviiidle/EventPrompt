import Container from "components/ui/Container";
import Button from "components/ui/Button";
import { marketingCopy } from "content/marketing";

const FinalCTA = () => {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/70 p-10 text-center shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-900/70 sm:p-12">
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl border border-transparent bg-gradient-to-br from-sky-100/70 via-transparent to-emerald-100/70"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-gradient-to-br from-amber-100/60 via-rose-100/40 to-transparent blur-3xl"
            aria-hidden="true"
          />
          <div className="relative">
            <h2 className="text-3xl font-semibold text-gray-900 dark:text-white sm:text-4xl">
              {marketingCopy.finalCta.heading}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
              {marketingCopy.finalCta.subheading}
            </p>
            <Button className="mt-6" type="button">
              {marketingCopy.finalCta.cta}
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default FinalCTA;
