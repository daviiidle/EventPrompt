import Link from "next/link";

type CheckoutSuccessPageProps = {
  searchParams?: Promise<{ email?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const resolvedSearchParams = await searchParams;
  const rawEmail = resolvedSearchParams?.email ?? "";
  const email = rawEmail.trim().toLowerCase();
  const loginHref = email ? `/login?email=${encodeURIComponent(email)}` : "/login";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-16 text-gray-900">
      <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-10 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          Payment complete
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Thanks for your purchase</h1>
        <p className="mt-3 text-sm text-gray-600">
          Check your email to login to your dashboard.
        </p>
        <div className="mt-6">
          <Link
            href={loginHref}
            className="inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Go to login
          </Link>
        </div>
      </div>
    </main>
  );
}
