import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { TOPICS } from "../topics";
import { ImageCarousel } from "./image-carousel";
import { linkifyParagraph } from "./linkify";

/**
 * Shared detail-page layout for Ideas and Topics — back link, header
 * (title + short description, optional right-aligned action), image
 * carousel, long-description paragraphs, and optional body extras / aside.
 *
 * When `aside` is provided the body switches to a 2-column layout at lg+
 * and the container widens; otherwise it stays single-column at reading
 * width.
 */
export function EntryDetail({
  backHref,
  backLabel,
  basePath,
  title,
  shortDescription,
  thumbnailUrl,
  galleryUrls,
  longDescription,
  accent = "pink",
  excludeTopicSlug,
  headerAction,
  bodyExtras,
  aside,
}: {
  backHref: string;
  backLabel: string;
  /** Used to construct outbound Topic links from the auto-linker. */
  basePath: string;
  title: string;
  shortDescription: string;
  thumbnailUrl: string;
  galleryUrls: string[];
  longDescription: string[];
  accent?: "pink" | "blue";
  /** Suppress auto-links pointing at this Topic — set on Topic detail
   *  pages so a Topic doesn't link to itself. */
  excludeTopicSlug?: string;
  headerAction?: React.ReactNode;
  bodyExtras?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  const allImages = [thumbnailUrl, ...galleryUrls];
  const hoverText =
    accent === "blue" ? "hover:text-brand-blue" : "hover:text-brand-pink";

  return (
    <div className="min-h-screen bg-surface-primary">
      <div
        className={cn(
          "mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
          aside ? "max-w-6xl" : "max-w-3xl",
        )}
      >
        <Link
          href={backHref}
          className={cn(
            "mb-5 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors",
            hoverText,
          )}
        >
          <ArrowLeft size={16} />
          {backLabel}
        </Link>

        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-base text-text-secondary sm:text-lg">
              {shortDescription}
            </p>
          </div>
          {headerAction}
        </header>

        <div className="mb-8">
          <ImageCarousel images={allImages} alt={title} />
        </div>

        <div
          className={
            aside
              ? "grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]"
              : ""
          }
        >
          <article className="flex flex-col gap-4 text-text-primary">
            {longDescription.map((paragraph, i) => (
              <p key={i} className="text-base leading-relaxed">
                {linkifyParagraph(paragraph, basePath, TOPICS, excludeTopicSlug)}
              </p>
            ))}

            {bodyExtras}
          </article>

          {aside && (
            <aside className="rounded-lg border border-border-default bg-surface-secondary px-5 py-2">
              {aside}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
