type AdminEmptyStateProps = {
  title: string;
  description?: string;
};

export function AdminEmptyState({ title, description }: AdminEmptyStateProps) {
  return (
    <div className="notice" role="status">
      <strong>{title}</strong>
      {description ? <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>{description}</p> : null}
    </div>
  );
}
