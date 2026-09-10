import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SkillPass Africa", template: "%s | SkillPass Africa" },
  description: "Build a trusted passport for your practical skills.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
