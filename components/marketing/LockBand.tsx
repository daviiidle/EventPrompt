import Container from "components/ui/Container";
import { marketingCopy } from "content/marketing";

const LockBand = () => {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-gray-950/90 p-8 text-white shadow-lg backdrop-blur sm:p-12">
          <div
            className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-gradient-to-br from-amber-200/40 via-fuchsia-200/30 to-transparent blur-3xl"
            aria-hidden="true"
          />
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Locked configuration</p>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">{marketingCopy.lockedConfig.heading}</h2>
              <p className="mt-4 max-w-xl text-sm text-white/70">{marketingCopy.lockedConfig.body}</p>
              <ul className="mt-6 space-y-3 text-sm text-white/80">
                {marketingCopy.lockedConfig.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center">
              <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 shadow-inner">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/50">
                  <span>Seating plan</span>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold text-white/70">
                    Locked
                  </span>
                </div>
                <div className="mt-6 grid gap-3">
                  {[
                    "Table A · Alex & Jordan",
                    "Table B · Priya & Mateo",
                    "Table C · Sam & Lee",
                    "Table D · Nora & Finn",
                  ].map((label) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/80"
                    >
                      <span>{label}</span>
                      <span className="text-xs text-white/50">Approved</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-xs text-white/60">
                  Seating changes locked until event day.
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default LockBand;
