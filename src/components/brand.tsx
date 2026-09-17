import Link from "next/link";

type BrandProps = {
  href?: string;
  inverse?: boolean;
  compact?: boolean;
};

export function Brand({ href = "/", inverse = false, compact = false }: BrandProps) {
  const content = <span className={`brand${inverse ? " brand-inverse" : ""}${compact ? " brand-compact" : ""}`} aria-label="SkillPass Africa">
    <span className="brand-mark" aria-hidden="true">
      <span className="brand-check" />
    </span>
    <span className="brand-name"><span>Skill</span><strong>Pass</strong>{compact ? null : <em>Africa</em>}</span>
  </span>;

  return href ? <Link href={href}>{content}</Link> : content;
}