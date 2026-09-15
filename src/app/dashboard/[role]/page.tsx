<section className="card" style={{ padding: 24 }}>
  <h2 style={{ marginTop: 0 }}>Next steps</h2>

  <div style={{ display: "grid", gap: 10 }}>
    {content.items.map((item, index) => (
      <div
        key={item}
        style={{
          display: "flex",
          gap: 12,
          paddingBlock: 10,
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <strong style={{ color: "var(--green)" }}>{index + 1}</strong>
        <span>{item}</span>
      </div>
    ))}
  </div>

  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
    {profile.role === "learner" ? (
      <Link className="button" href="/portfolio">
        Open portfolio
      </Link>
    ) : (
      <Link className="button" href="/profile">
        Complete your profile
      </Link>
    )}

    {profile.role === "mentor" && (
      <Link className="button" href="/dashboard/mentor/reviews">
        Review learner submissions
      </Link>
    )}
  </div>
</section>