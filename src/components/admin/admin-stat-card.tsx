type AdminStatCardProps = {
  label: string;
  value: number | string;
  detail?: string;
};

export function AdminStatCard({ label, value, detail }: AdminStatCardProps) {
  return (
    <article className="card" style={{ padding: 22 }}>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>{label}</p>
      <strong style={{ display: "block", fontSize: 34, lineHeight: 1.1, marginTop: 8 }}>{value}</strong>
      {detail ? <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 13 }}>{detail}</p> : null}
    </article>
  );
}
