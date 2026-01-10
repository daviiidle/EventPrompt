export const marketingCopy = {
  brand: {
    name: "Acme",
    tagline: "Launch faster with a focused SaaS starter.",
  },
  hero: {
    heading: "Set up once. Lock it in. Run your wedding with zero last-minute admin.",
    subheading:
      "Turn a single setup form into RSVPs, SMS reminders, photo uploads, and a seating lock that unlocks on the day.",
    primaryCta: "Get started",
    secondaryCta: "See demo",
  },
  features: {
    heading: "Features",
    subheading: "Everything you need for a calm wedding week.",
    items: [
      {
        title: "RSVP collection",
        description: "Collect responses with dietary notes and quick confirmations.",
      },
      {
        title: "Automated SMS reminders",
        description: "Scheduled nudges without manual follow-up.",
      },
      {
        title: "Photo uploads",
        description: "Guests upload photos and clips. You control when the gallery is visible.",
      },
      {
        title: "Find your seat",
        description: "Guests locate their table at the right moment. Unlock seating on the day.",
      },
    ],
  },
  howItWorks: {
    heading: "How it works",
    subheading: "Configure it once. Everything else runs on rails.",
    steps: [
      {
        title: "Setup form",
        description: "Capture guest details, RSVPs, meal choices, and notes.",
      },
      {
        title: "Review",
        description: "Check everything in a clean dashboard and confirm timing.",
      },
      {
        title: "Finalize & lock",
        description: "Lock the configuration so nothing changes last minute.",
      },
    ],
  },
  lockedConfig: {
    heading: "Once it’s locked, nothing changes.",
    body: "Your config becomes the single source of truth — protecting you from last-minute surprises.",
    bullets: [
      "No last-minute seating reshuffles",
      "No new links or confusing updates",
      "No forgotten reminders",
      "Guests see the same setup you approved",
    ],
  },
  positioning: {
    heading: "What we don’t do (on purpose)",
    subheading: "Clear boundaries so you stay focused.",
    items: [
      "No infinite invite templates",
      "No complex website builder",
      "No noisy upsells",
      "No surprises",
    ],
  },
  demo: {
    heading: "Event setup demo",
    items: [
      "Save-the-date, RSVP, and SMS flow",
      "Automated reminders preview",
      "Photo upload gating controls",
      "Find your seat flow for the wedding day",
      "Guest view on mobile",
    ],
  },
  pricing: {
    heading: "Pricing",
    plans: [
      {
        name: "Standard",
        tier: "standard",
        aud: 129,
        description: "Core RSVP and guest management without SMS or seating tools.",
        features: [
          "Custom intake form",
          "RSVP collection",
          "Photo uploads",
        ],
        cta: "Start standard",
      },
      {
        name: "Premium",
        tier: "premium",
        aud: 179,
        description: "Adds SMS reminders and seating arrangements for the wedding day.",
        features: [
          "Everything in Standard",
          "3 SMS reminders (21, 10, 3 days)",
          "Seating arrangements",
        ],
        cta: "Start premium",
      },
    ],
  },
  faq: {
    heading: "FAQ",
    items: [
      {
        question: "What changes are allowed after we finalize?",
        answer: "Critical dates and seating stay locked, but you can still view RSVPs and guest notes.",
      },
      {
        question: "Do you support custom domains?",
        answer: "Not yet. We focus on a clean, unified guest experience with a hosted link.",
      },
      {
        question: "How do photo uploads work?",
        answer: "Guests can upload from any device, and you control when the gallery becomes visible.",
      },
      {
        question: "What is disabled before we lock?",
        answer: "Seating and final schedule views stay hidden until you confirm the setup.",
      },
      {
        question: "How do you handle data privacy?",
        answer: "Guest data is scoped to your event and never sold or used for advertising.",
      },
      {
        question: "How does seating unlock work?",
        answer: "You set the unlock time in advance, and the seating view goes live automatically.",
      },
    ],
  },
  cta: {
    heading: "Ready to build?",
    subheading: "Add your CTA copy and link it to the next step.",
    cta: "Start now",
  },
  finalCta: {
    heading: "Ready to lock in your event setup?",
    subheading: "Share your event date and guest count, and we’ll map the fastest path to a calm wedding week.",
    cta: "Get started",
  },
  footer: {
    note: "© 2024 Acme. All rights reserved.",
  },
} as const;
