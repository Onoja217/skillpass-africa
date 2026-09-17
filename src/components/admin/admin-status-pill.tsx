type AdminStatusPillProps = {
  status: string;
};

export function AdminStatusPill({ status }: AdminStatusPillProps) {
  const tone = status === "active"
    ? { background: "#dcfce7", color: "#166534" }
    : status === "suspended"
      ? { background: "#fef3c7", color: "#92400e" }
      : { background: "#fee2e2", color: "#991b1b" };

  return (
    <span style={{ ...tone, display: "inline-flex", borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 800, textTransform: "capitalize" }}>
      {status}
    </span>
  );
}
