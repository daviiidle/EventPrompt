import Container from "components/ui/Container";
import { marketingCopy } from "content/marketing";

const Demo = () => {
  return (
    <section id="demo" className="py-20 sm:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/60 p-6 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-900/70 sm:p-8">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.6),_transparent_60%)]"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -top-24 right-10 h-48 w-48 rounded-full bg-gradient-to-br from-sky-200/40 via-emerald-200/40 to-transparent blur-3xl"
              aria-hidden="true"
            />
            <div className="relative">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                <span>{marketingCopy.demo.heading}</span>
                <span className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[10px] font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-300">
                  Preview
                </span>
              </div>
              <div className="mt-6 rounded-2xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70">
                <div className="grid gap-4">
                  <div className="rounded-xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-200">
                    Setup flow · RSVP + SMS
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/70 bg-white/70 px-4 py-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-300">
                      Seating lock
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/70 px-4 py-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-300">
                      Gallery gate
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/70 bg-white/70 px-4 py-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-300">
                    Guest view · Mobile
                  </div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-5 gap-2">
                {Array.from({ length: 15 }).map((_, index) => (
                  <div
                    key={`cell-${index}`}
                    className="h-2 rounded-full bg-gray-200/80 dark:bg-gray-700/60"
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-3xl font-semibold text-gray-900 dark:text-white sm:text-4xl">See the flow in one place</h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Walk through the full setup journey and check how every step stays locked and on schedule.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-gray-700 dark:text-gray-200">
              {marketingCopy.demo.items.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Demo;
