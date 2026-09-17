import { Brand } from "@/components/brand";
export default function AuthLayout({ children }: { children: React.ReactNode }) { return <main className="shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center", paddingBlock: 32 }}><div style={{ width: "100%", display: "grid", placeItems: "center", gap: 22 }}><Brand />{children}</div></main>; }
