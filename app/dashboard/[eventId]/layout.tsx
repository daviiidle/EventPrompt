import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getServerUser } from "@/lib/serverAuth";
import { getEventTitle } from "@/lib/eventUtils";

type EventLayoutProps = {
  children: ReactNode;
  params: Promise<{ eventId: string }>;
};

export const dynamic = "force-dynamic";

export default async function EventLayout({ children, params }: EventLayoutProps) {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const eventId = resolvedParams.eventId?.trim();
  if (!eventId) {
    redirect("/dashboard");
  }

  const adminClient = createAdminClient();
  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    redirect("/dashboard");
  }

  const normalizedEmail = user.email?.trim().toLowerCase() ?? "";
  if (event.owner_user_id !== user.id) {
    if (!event.owner_user_id && event.owner_email?.toLowerCase() === normalizedEmail) {
      await adminClient
        .from("events")
        .update({ owner_user_id: user.id })
        .eq("id", event.id)
        .is("owner_user_id", null);
    } else {
      redirect("/dashboard");
    }
  }

  if (event.paid !== true) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-5 py-10 text-center text-gray-900 dark:text-white">
        <h1 className="text-2xl font-semibold">Payment required</h1>
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
          Complete checkout to unlock your dashboard.
        </p>
        <Link
          href="/#pricing"
          className="mt-6 inline-flex rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Start checkout
        </Link>
      </main>
    );
  }

  const title = getEventTitle(event);

  return (
    <div className="min-h-screen bg-neutral-50 text-gray-900 dark:bg-black dark:text-white">
      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-8">
        <aside className="w-56 shrink-0">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Event
            </p>
            <h2 className="mt-2 text-lg font-semibold">{title}</h2>
            <nav className="mt-4 flex flex-col gap-2 text-sm">
              <Link href={`/dashboard/${eventId}`} className="text-neutral-700 hover:text-neutral-900 dark:text-neutral-300">
                Overview
              </Link>
              <Link href={`/dashboard/${eventId}/guests`} className="text-neutral-700 hover:text-neutral-900 dark:text-neutral-300">
                Guest list
              </Link>
              <Link href={`/dashboard/${eventId}/rsvp`} className="text-neutral-700 hover:text-neutral-900 dark:text-neutral-300">
                RSVP
              </Link>
              <Link href={`/dashboard/${eventId}/seating`} className="text-neutral-700 hover:text-neutral-900 dark:text-neutral-300">
                Seating
              </Link>
            </nav>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
