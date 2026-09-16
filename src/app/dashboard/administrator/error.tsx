"use client";

export default function AdministratorError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="card" style={{ padding: 28 }} role="alert">
      <p className="eyebrow">Administrator dashboard</p>
      <h1 style={{ margin: "10px 0" }}>Something went wrong</h1>
      <p style={{ color: "var(--muted)", maxWidth: 620 }}>
        The administrator area could not load this request. Your existing data and permissions have not been changed.
      </p>
      <button className="button" type="button" onClick={() => reset()}>Try again</button>
    </section>
  );
}
