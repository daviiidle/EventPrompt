import GuestUploadForm from "./GuestUploadForm";
import { formatEventDate, getEventTitle } from "@/lib/eventUtils";
import { getTokenInfoByToken, isTokenExpired } from "@/lib/guestTokens";

export const dynamic = "force-dynamic";

type GuestUploadPageProps = {
  params: { token: string };
};

export default async function GuestUploadPage({ params }: GuestUploadPageProps) {
  let rawToken = params.token ?? "";
  try {
    rawToken = decodeURIComponent(rawToken);
  } catch {
    rawToken = params.token ?? "";
  }

  const token = rawToken.trim();

  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-10 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Upload link invalid</h1>
        <p className="mt-3 text-sm text-neutral-600">Ask your host for a fresh link.</p>
      </main>
    );
  }

  let tokenInfo = null;
  try {
    tokenInfo = await getTokenInfoByToken(token);
  } catch {
    tokenInfo = null;
  }

  const event = tokenInfo?.events ?? null;
  const invalid =
    !tokenInfo ||
    tokenInfo.status !== "active" ||
    isTokenExpired(tokenInfo) ||
    !event ||
    event.paid !== true;

  if (invalid) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-10 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Upload link invalid</h1>
        <p className="mt-3 text-sm text-neutral-600">
          This link is expired or no longer active. Ask your host for a new one.
        </p>
      </main>
    );
  }

  const title = getEventTitle(event);
  const eventDate = formatEventDate(event);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-10">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
          Guest Uploads
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-neutral-900">{title}</h1>
        {eventDate ? (
          <p className="mt-2 text-sm text-neutral-500">{eventDate}</p>
        ) : null}
      </header>

      <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">Share your photos</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Upload images or short videos from your phone. You can select multiple files.
        </p>
        <GuestUploadForm token={token} />
      </section>

      <p className="mt-6 text-center text-xs text-neutral-400">
        Keep this page open until uploads finish.
      </p>
    </main>
  );
}
