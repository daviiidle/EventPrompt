import Container from "components/ui/Container";
import { marketingCopy } from "content/marketing";

const WhatWeDontDo = () => {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/60 p-8 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/60 sm:p-12">
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl border border-transparent bg-gradient-to-br from-amber-100/60 via-transparent to-sky-100/50"
            aria-hidden="true"
          />
          <div className="relative">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-semibold text-gray-900 dark:text-white sm:text-4xl">
                {marketingCopy.positioning.heading}
              </h2>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{marketingCopy.positioning.subheading}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {marketingCopy.positioning.items.map((item) => (
                <div
                  key={item}
                  className="flex items-center rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-gray-700 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-200"
                >
                  <span className="mr-3 inline-flex h-2 w-2 rounded-full bg-gray-900/70 dark:bg-white/70" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default WhatWeDontDo;
