import CollectEmailForm from "./CollectEmailForm";

type CollectEmailPageProps = {
  params: Promise<{ token: string }>;
};

export default async function CollectEmailPage({ params }: CollectEmailPageProps) {
  const resolvedParams = await params;
  const token = resolvedParams.token ?? "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-16 text-gray-900">
      <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-10 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          Email collection
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Stay in the loop</h1>
        <p className="mt-3 text-sm text-gray-600">
          Share your phone and email so we can match you to the guest list.
        </p>
        <CollectEmailForm token={token} />
      </div>
    </main>
  );
}
