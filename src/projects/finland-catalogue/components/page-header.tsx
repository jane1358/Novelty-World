import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Page-top section shared by the Catalogue grid and the Topics landing:
 * a back link, a bicolor "<primary> <secondary>" headline, an optional
 * subhead, and an optional right-side actions slot.
 */
export function PageHeader({
  backHref,
  backLabel,
  titlePrimary,
  titleSecondary,
  subhead,
  rightActions,
}: {
  backHref: string;
  backLabel: string;
  titlePrimary: string;
  titleSecondary: string;
  subhead?: string;
  rightActions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 self-start text-sm text-text-secondary transition-colors hover:text-brand-pink"
      >
        <ArrowLeft size={16} />
        {backLabel}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-brand-blue">{titlePrimary}</span>{" "}
            <span className="text-text-primary">{titleSecondary}</span>
          </h1>
          {subhead && <p className="mt-2 text-text-secondary">{subhead}</p>}
        </div>
        {rightActions}
      </div>
    </div>
  );
}
