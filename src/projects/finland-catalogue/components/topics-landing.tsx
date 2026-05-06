"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { applySearch, topicHaystack } from "../filters";
import { TOPICS } from "../topics";
import { PageHeader } from "./page-header";
import { SearchBar } from "./search-bar";
import { TopicCard } from "./topic-card";

export function TopicsLanding({ basePath }: { basePath: string }) {
  const [query, setQuery] = useState("");
  // Same reasoning as on the catalogue grid: defer the filter pass so the
  // input stays responsive while the topic cards re-render.
  const deferredQuery = useDeferredValue(query);

  const visibleTopics = useMemo(
    () => applySearch(TOPICS, deferredQuery, topicHaystack),
    [deferredQuery],
  );

  const total = TOPICS.length;
  const showing = visibleTopics.length;
  const narrowed = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-surface-primary">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          backHref={basePath}
          backLabel="Back to catalogue"
          titlePrimary="Finland"
          titleSecondary="Topics"
          subhead="Cultural and educational explainers — the things to know about Finland while you visit."
        />

        {total > 0 && (
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search topics"
            ariaLabel="Search topics"
          />
        )}

        {total === 0 ? (
          <div className="rounded-lg border border-border-default bg-surface-secondary p-8 text-center text-text-secondary">
            Topics coming soon.
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-text-muted">
              {narrowed ? (
                <>
                  Showing{" "}
                  <span className="font-medium text-text-primary">{showing}</span> of{" "}
                  {total}
                </>
              ) : (
                <>
                  {total} {total === 1 ? "topic" : "topics"}
                </>
              )}
            </div>
            {showing === 0 ? (
              <div className="rounded-lg border border-border-default bg-surface-secondary p-8 text-center text-text-secondary">
                No topics match your search.
              </div>
            ) : (
              <div className="columns-1 gap-5 sm:columns-2 xl:columns-3 2xl:columns-4">
                {visibleTopics.map((topic) => (
                  <div key={topic.slug} className="mb-5 break-inside-avoid">
                    <TopicCard topic={topic} basePath={basePath} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
