import type { ReactNode } from "react";

type AdminSectionProps = {
  eyebrow?: string;
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AdminSection({ eyebrow, title, action, children, className = "card" }: AdminSectionProps) {
  return (
    <section className={className} style={{ padding: 24 }}>
      {eyebrow || title || action ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            {eyebrow ? <p className="eyebrow" style={{ margin: 0 }}>{eyebrow}</p> : null}
            {title ? <h2 style={{ margin: "8px 0 0" }}>{title}</h2> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div style={{ marginTop: eyebrow || title || action ? 20 : 0 }}>{children}</div>
    </section>
  );
}
