"use client";

import { useState } from "react";
import { HiCheck } from "react-icons/hi2";
import Container from "components/ui/Container";
import Button from "components/ui/Button";
import { marketingCopy } from "content/marketing";

const Pricing = () => {
  const [currency, setCurrency] = useState<"AUD" | "USD">("AUD");
  const [capacity, setCapacity] = useState(100);

  const capacities = [50, 100, 150];

  return (
    <section id="pricing" className="py-20 sm:py-24">
      <Container>
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-white sm:text-4xl">
            {marketingCopy.pricing.heading}
          </h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Choose a plan and set your guest count.</p>
        </div>
        <div className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <div className="inline-flex rounded-full border border-white/70 bg-white/70 p-1 text-sm shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70">
            {(["AUD", "USD"] as const).map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setCurrency(label)}
                className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
                  currency === label
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-full border border-white/70 bg-white/70 p-1 text-sm shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70">
            {capacities.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCapacity(value)}
                className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
                  capacity === value
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {marketingCopy.pricing.plans.map((plan) => {
            const price = currency === "AUD" ? plan.aud : plan.usd;
            const symbol = currency === "AUD" ? "A$" : "$";

            return (
              <div
                key={plan.name}
                className="flex flex-col rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/60"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                  <p className="mt-2 text-4xl font-semibold text-gray-900 dark:text-white">
                    {symbol}
                    {price}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Includes up to {capacity} guests</p>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{plan.description}</p>
                  <ul className="mt-5 space-y-3 text-sm text-gray-700 dark:text-gray-200">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <HiCheck className="mt-0.5 h-4 w-4 text-emerald-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button className="mt-6" type="button">
                  {plan.cta}
                </Button>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
};

export default Pricing;
