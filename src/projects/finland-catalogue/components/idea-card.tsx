"use client";

import {
  CalendarDays,
  Clock,
  Euro,
  Home,
  Leaf,
  Shuffle,
  Snowflake,
  Sun,
  Trees,
} from "lucide-react";
import type { Idea } from "../types";
import { summarizeMonths } from "../months";
import { EntryCard } from "./entry-card";
import { StarButton } from "./star-button";

const DURATION_LABELS: Record<Idea["duration"], string> = {
  "<1h": "< 1 hour",
  "1-3h": "1-3 hours",
  "half-day": "Half day",
  "full-day": "Full day",
  "multi-day": "Multi-day",
};

function formatCost(cost: Idea["cost"]): string {
  if (cost.perPersonEur === 0) return "Free";
  return `${cost.perPersonEur}`;
}

/** Pick a glanceable icon for the months chip. Year-round = sun
 *  (always-on); winter-dominated window = snowflake; summer-dominated =
 *  sun; transitional/mixed = leaf. */
function MonthsIcon({ months }: { months: number[] }) {
  if (months.length >= 12) return <Sun size={13} />;
  const winterCount = months.filter((m) => m === 12 || m === 1 || m === 2).length;
  const summerCount = months.filter((m) => m >= 6 && m <= 8).length;
  if (winterCount >= 2 && summerCount === 0) return <Snowflake size={13} />;
  if (summerCount >= 2 && winterCount === 0) return <Sun size={13} />;
  return <Leaf size={13} />;
}

function MonthsChip({ months }: { months: number[] }) {
  return (
    <Chip>
      <MonthsIcon months={months} />
      {summarizeMonths(months)}
    </Chip>
  );
}

const INDOOR_OUTDOOR_LABELS: Record<Idea["indoorOutdoor"], string> = {
  indoor: "Indoor",
  outdoor: "Outdoor",
  mixed: "Indoor + outdoor",
};

function IndoorOutdoorChip({ value }: { value: Idea["indoorOutdoor"] }) {
  const Icon = value === "indoor" ? Home : value === "outdoor" ? Trees : Shuffle;
  return (
    <Chip>
      <Icon size={13} />
      {INDOOR_OUTDOOR_LABELS[value]}
    </Chip>
  );
}

function EventsChip({ events }: { events: NonNullable<Idea["availability"]["events"]> }) {
  // Card-level chip is just a count + first event name (if any) — full
  // detail goes on the detail page.
  const label =
    events.length === 1
      ? events[0].name ?? "Annual event"
      : `${events.length} annual events`;
  return (
    <Chip>
      <CalendarDays size={13} />
      {label}
    </Chip>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-surface-elevated px-2 py-1 text-xs text-text-secondary">
      {children}
    </span>
  );
}

export function IdeaCard({ idea, basePath }: { idea: Idea; basePath: string }) {
  const events = idea.availability.events;

  return (
    <EntryCard
      href={`${basePath}/${idea.slug}`}
      thumbnailUrl={idea.thumbnailUrl}
      alt={idea.title}
      title={idea.title}
      shortDescription={idea.shortDescription}
      imageOverlay={
        <StarButton
          slug={idea.slug}
          size="sm"
          className="absolute right-2 top-2"
        />
      }
      footer={
        <>
          <Chip>
            <Euro size={13} />
            {formatCost(idea.cost)}
          </Chip>
          <Chip>
            <Clock size={13} />
            {DURATION_LABELS[idea.duration]}
          </Chip>
          <MonthsChip months={idea.availability.suitableMonths} />
          {events && events.length > 0 && <EventsChip events={events} />}
          <IndoorOutdoorChip value={idea.indoorOutdoor} />
        </>
      }
    />
  );
}
