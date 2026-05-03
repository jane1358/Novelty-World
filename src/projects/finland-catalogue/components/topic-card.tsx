"use client";

import type { Topic } from "../types";
import { EntryCard } from "./entry-card";

export function TopicCard({
  topic,
  basePath,
}: {
  topic: Topic;
  basePath: string;
}) {
  return (
    <EntryCard
      href={`${basePath}/topics/${topic.slug}`}
      thumbnailUrl={topic.thumbnailUrl}
      alt={topic.title}
      title={topic.title}
      shortDescription={topic.shortDescription}
      accent="blue"
    />
  );
}
