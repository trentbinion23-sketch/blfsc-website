import Link from "next/link";

export const metadata = {
  title: "Offline | BLFSC",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflinePage() {
  return (
    <section className="page-shell section-space">
      <article className="card-surface space-y-5 p-8">
        <p className="eyebrow">Offline</p>
        <h1 className="text-4xl leading-none">You are offline right now.</h1>
        <p className="max-w-2xl text-base leading-7 text-white/75">
          The BLFSC app could not reach the network. Reconnect and refresh, or head back to the
          homepage.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="btn-primary">
            Return home
          </Link>
          <Link href="/events" className="btn-secondary">
            View events
          </Link>
        </div>
      </article>
    </section>
  );
}
