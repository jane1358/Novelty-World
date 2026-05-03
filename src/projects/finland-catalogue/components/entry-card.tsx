"use client";

import Link from "next/link";
import { cn } from "@/shared/lib/utils";
import { HotlinkImage } from "./hotlink-image";

/**
 * Shared card frame for Ideas and Topics — link wrapper, image with
 * optional overlay, title, short description, and an optional footer
 * slot (chips, metadata, etc.). The visual identity is set per entry
 * type via `accent` ("pink" for Ideas, "blue" for Topics).
 */
export function EntryCard({
  href,
  thumbnailUrl,
  alt,
  title,
  shortDescription,
  accent = "pink",
  imageOverlay,
  footer,
}: {
  href: string;
  thumbnailUrl: string;
  alt: string;
  title: string;
  shortDescription: string;
  accent?: "pink" | "blue";
  imageOverlay?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const hoverBorder =
    accent === "blue" ? "hover:border-brand-blue" : "hover:border-brand-pink";
  const hoverText =
    accent === "blue"
      ? "group-hover:text-brand-blue"
      : "group-hover:text-brand-pink";

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border border-border-default bg-surface-secondary transition-colors",
        hoverBorder,
      )}
    >
      <div className="relative w-full bg-surface-tertiary">
        <HotlinkImage src={thumbnailUrl} alt={alt} fit="natural" />
        {imageOverlay}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <h3
            className={cn(
              "line-clamp-2 min-h-[2lh] text-lg font-semibold leading-tight text-text-primary",
              hoverText,
            )}
          >
            {title}
          </h3>
          <p className="text-sm text-text-secondary">{shortDescription}</p>
        </div>

        {footer && (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-2">{footer}</div>
        )}
      </div>
    </Link>
  );
}
