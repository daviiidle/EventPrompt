"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Container from "components/ui/Container";
import Button from "components/ui/Button";
import { supabase } from "@/lib/supabaseClient";

const NavBar = () => {
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const router = useRouter();

  const links = [
    { label: "How it works", href: "/#how-it-works" },
    { label: "Features", href: "/#features" },
    { label: "Pricing", href: "/#pricing" },
    { label: "FAQ", href: "/#faq" },
  ];

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setIsAuthed(Boolean(data.session));
    };

    loadSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setIsAuthed(Boolean(session));
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.refresh();
    router.push("/");
  };

  return (
    <header className="relative z-50 border-b border-white/70 bg-white/70 backdrop-blur dark:border-gray-800 dark:bg-black/70">
      <Container>
        <div className="flex items-center justify-between py-4">
          <span className="text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-white">EventPrompt</span>
          <nav className="hidden items-center gap-6 text-sm text-gray-600 dark:text-gray-300 md:flex">
            {links.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-gray-900 dark:hover:text-white">
                {link.label}
              </a>
            ))}
            {isAuthed ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/70 px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm backdrop-blur transition hover:border-gray-300 dark:border-gray-700 dark:bg-white/5 dark:text-white"
                >
                  Account
                  <span className="text-xs">▾</span>
                </button>
                {accountOpen ? (
                  <div
                    className="absolute right-0 mt-2 w-40 rounded-2xl border border-white/70 bg-white/90 p-2 text-sm text-gray-700 shadow-lg backdrop-blur pointer-events-auto dark:border-gray-800 dark:bg-gray-900/90 dark:text-gray-200"
                    style={{ zIndex: 50 }}
                  >
                    <a
                      href="/dashboard"
                      onClick={() => setAccountOpen(false)}
                      className="block rounded-xl px-3 py-2 transition hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Dashboard
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        setAccountOpen(false);
                        await handleLogout();
                      }}
                      className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <a href="/login" className="transition hover:text-gray-900 dark:hover:text-white">
                Login
              </a>
            )}
            <Button href="/#pricing">Get started</Button>
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
              {isAuthed ? (
                <>
                  <a
                    href="/dashboard"
                    className="transition hover:text-gray-900 dark:hover:text-white"
                    onClick={() => setOpen(false)}
                  >
                    Dashboard
                  </a>
                  <button
                    type="button"
                    className="text-left transition hover:text-gray-900 dark:hover:text-white"
                    onClick={async () => {
                      setOpen(false);
                      await handleLogout();
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <a
                  href="/login"
                  className="transition hover:text-gray-900 dark:hover:text-white"
                  onClick={() => setOpen(false)}
                >
                  Login
                </a>
              )}
              <Button href="/#pricing" onClick={() => setOpen(false)}>
                Get started
              </Button>
            </div>
          </div>
        ) : null}
      </Container>
    </header>
  );
};

export default NavBar;
