"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

type GuestTokenPanelProps = {
  eventId: string;
  baseUrl: string;
  initialToken: string;
  initialExpiresAt?: string | null;
};

export default function GuestTokenPanel({
  eventId,
  baseUrl,
  initialToken,
  initialExpiresAt,
}: GuestTokenPanelProps) {
  const resolvedBaseUrl = useMemo(() => {
    if (baseUrl) return baseUrl;
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, [baseUrl]);

  const [token, setToken] = useState(initialToken);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt ?? null);
  const [guestLink, setGuestLink] = useState(() => {
    if (!resolvedBaseUrl) return `/u/${initialToken}`;
    return `${resolvedBaseUrl}/u/${initialToken}`;
  });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    if (!resolvedBaseUrl) {
      setGuestLink(`/u/${token}`);
    } else {
      setGuestLink(`${resolvedBaseUrl}/u/${token}`);
    }
  }, [resolvedBaseUrl, token]);

  useEffect(() => {
    let isMounted = true;
    setQrDataUrl(null);

    QRCode.toDataURL(guestLink, { margin: 1, width: 220 })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch(() => {
        if (isMounted) setQrDataUrl(null);
      });

    return () => {
      isMounted = false;
    };
  }, [guestLink]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(guestLink);
      setStatus("Link copied.");
    } catch {
      setStatus("Copy failed.");
    }
  };

  const handleRotate = async () => {
    setStatus(null);
    setIsRotating(true);
    try {
      const res = await fetch("/api/events/rotate-guest-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });

      const payload = (await res.json().catch(() => null)) as
        | { ok?: boolean; token?: string; expiresAt?: string | null; error?: string }
        | null;

      if (!res.ok || !payload?.token) {
        setStatus(payload?.error ?? "Failed to rotate link.");
        return;
      }

      setToken(payload.token);
      setExpiresAt(payload.expiresAt ?? null);
      setStatus("New link generated.");
    } catch {
      setStatus("Failed to rotate link.");
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Guest upload link</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Share this link or QR code with guests to collect photos and videos.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            value={guestLink}
            readOnly
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500"
            >
              Copy link
            </button>
            <button
              type="button"
              onClick={handleRotate}
              disabled={isRotating}
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
            >
              {isRotating ? "Rotating..." : "Rotate"}
            </button>
          </div>
        </div>
        {expiresAt ? (
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Expires {new Date(expiresAt).toLocaleDateString()}
          </p>
        ) : null}
        {status ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-300">{status}</p>
        ) : null}
      </div>
      <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
          {qrDataUrl ? (
            <Image
              src={qrDataUrl}
              alt="Guest upload QR code"
              width={160}
              height={160}
              className="h-40 w-40"
              unoptimized
            />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center text-sm text-neutral-500">
              Generating QR...
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <a
            href={guestLink}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-neutral-900 underline dark:text-white"
          >
            Preview guest page
          </a>
          <a
            href={qrDataUrl ?? "#"}
            download="eventprompt-guest-qr.png"
            className={`text-sm font-medium ${
              qrDataUrl
                ? "text-neutral-900 underline dark:text-white"
                : "text-neutral-400 dark:text-neutral-500"
            }`}
          >
            Download QR
          </a>
        </div>
      </div>
    </section>
  );
}
