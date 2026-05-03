import { TOPICS } from "../topics";
import { PageHeader } from "./page-header";
import { TopicCard } from "./topic-card";

export function TopicsLanding({ basePath }: { basePath: string }) {
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

        {TOPICS.length === 0 ? (
          <div className="rounded-lg border border-border-default bg-surface-secondary p-8 text-center text-text-secondary">
            Topics coming soon.
          </div>
        ) : (
          <div className="columns-1 gap-5 sm:columns-2 xl:columns-3 2xl:columns-4">
            {TOPICS.map((topic) => (
              <div key={topic.slug} className="mb-5 break-inside-avoid">
                <TopicCard topic={topic} basePath={basePath} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
