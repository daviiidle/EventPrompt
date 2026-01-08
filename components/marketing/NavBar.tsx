"use client";

import { useState } from "react";
import Container from "components/ui/Container";
import Button from "components/ui/Button";

const NavBar = () => {
  const [open, setOpen] = useState(false);

  const links = [
    { label: "How it works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header className="border-b border-white/70 bg-white/70 backdrop-blur dark:border-gray-800 dark:bg-black/70">
      <Container>
        <div className="flex items-center justify-between py-4">
          <span className="text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-white">EventPrompt</span>
          <nav className="hidden items-center gap-6 text-sm text-gray-600 dark:text-gray-300 md:flex">
            {links.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-gray-900 dark:hover:text-white">
                {link.label}
              </a>
            ))}
            <Button type="button">Get started</Button>
          </nav>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/70 p-2 text-gray-700 backdrop-blur dark:border-gray-800 dark:bg-black/70 dark:text-gray-200 md:hidden"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </div>
        {open ? (
          <div className="pb-4 md:hidden">
            <div className="flex flex-col gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 text-sm text-gray-600 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-300">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="transition hover:text-gray-900 dark:hover:text-white"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <Button type="button">Get started</Button>
            </div>
          </div>
        ) : null}
      </Container>
    </header>
  );
};

export default NavBar;
