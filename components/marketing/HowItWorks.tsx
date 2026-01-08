import Container from "components/ui/Container";
import { marketingCopy } from "content/marketing";

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 sm:py-24">
      <Container>
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-white sm:text-4xl">
            {marketingCopy.howItWorks.heading}
          </h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            {marketingCopy.howItWorks.subheading}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {marketingCopy.howItWorks.steps.map((step) => (
            <div
              key={step.title}
              className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/60"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{step.title}</h3>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{step.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default HowItWorks;
