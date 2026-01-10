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
      <main className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-10 text-center text-neutral-900 dark:text-white">
        <h1 className="text-2xl font-semibold">Upload link invalid</h1>
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
          Ask your host for a fresh link.
        </p>
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
  let errorTitle = "Upload link invalid";
  let errorBody = "This link is expired or no longer active. Ask your host for a new one.";

  if (!tokenInfo) {
    errorBody = "This link is invalid. Ask your host for a fresh link.";
  } else if (tokenInfo.status !== "active") {
    errorBody = "This link is no longer active. Ask your host for a new one.";
  } else if (isTokenExpired(tokenInfo)) {
    errorTitle = "Upload link expired";
    errorBody = "This link has expired. Ask your host for a new one.";
  } else if (!event) {
    errorBody = "This link is invalid. Ask your host for a fresh link.";
  } else if (event.paid !== true) {
    errorTitle = "Uploads locked";
    errorBody = "This event has not been paid for yet, so guest uploads are locked. Ask your host to complete checkout.";
  }

  if (!tokenInfo || tokenInfo.status !== "active" || isTokenExpired(tokenInfo) || !event || event.paid !== true) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-10 text-center text-neutral-900 dark:text-white">
        <h1 className="text-2xl font-semibold">{errorTitle}</h1>
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">{errorBody}</p>
      </main>
    );
  }

  const title = getEventTitle(event);
  const eventDate = formatEventDate(event);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-10 text-neutral-900 dark:text-white">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
          Guest Uploads
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
        {eventDate ? (
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{eventDate}</p>
        ) : null}
      </header>

      <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Share your photos</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Upload images or short videos from your phone. You can select multiple files.
        </p>
        <GuestUploadForm token={token} />
      </section>

      <p className="mt-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
        Keep this page open until uploads finish.
      </p>
    </main>
  );
}
