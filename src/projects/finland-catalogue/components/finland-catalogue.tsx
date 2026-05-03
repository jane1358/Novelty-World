"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { IDEAS } from "../ideas";
import { TOPICS } from "../topics";
import { CatalogueGrid } from "./catalogue-grid";
import { IdeaDetail } from "./idea-detail";
import { TopicDetail } from "./topic-detail";
import { TopicsLanding } from "./topics-landing";

const BASE_PATH = "/tools/travel/finland-catalogue";
const TOPICS_PREFIX = "topics/";

export function FinlandCatalogue() {
  const pathname = usePathname();

  // Strip the base path; whatever remains is the in-project route.
  const rest = pathname.startsWith(BASE_PATH)
    ? pathname.slice(BASE_PATH.length).replace(/^\/|\/$/g, "")
    : "";

  if (!rest) {
    return <CatalogueGrid basePath={BASE_PATH} mode="all" />;
  }

  if (rest === "favorites") {
    return <CatalogueGrid basePath={BASE_PATH} mode="favorites" />;
  }

  if (rest === "topics") {
    return <TopicsLanding basePath={BASE_PATH} />;
  }

  if (rest.startsWith(TOPICS_PREFIX)) {
    const topicSlug = rest.slice(TOPICS_PREFIX.length);
    const topic = TOPICS.find((t) => t.slug === topicSlug);
    if (!topic) {
      return (
        <NotFound
          kind="topic"
          slug={topicSlug}
          backHref={`${BASE_PATH}/topics`}
          backLabel="Back to Finland Topics"
          accent="text-brand-blue"
        />
      );
    }
    return <TopicDetail topic={topic} basePath={BASE_PATH} />;
  }

  const idea = IDEAS.find((i) => i.slug === rest);

  if (!idea) {
    return (
      <NotFound
        kind="idea"
        slug={rest}
        backHref={BASE_PATH}
        backLabel="Back to catalogue"
        accent="text-brand-pink"
      />
    );
  }

  return <IdeaDetail idea={idea} basePath={BASE_PATH} />;
}

function NotFound({
  kind,
  slug,
  backHref,
  backLabel,
  accent,
}: {
  kind: "idea" | "topic";
  slug: string;
  backHref: string;
  backLabel: string;
  accent: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-text-primary">
        {kind === "idea" ? "Idea not found" : "Topic not found"}
      </h1>
      <p className="text-text-secondary">
        We don&apos;t have an entry for{" "}
        <code className="rounded bg-surface-elevated px-1.5 py-0.5 text-sm">
          {slug}
        </code>
        .
      </p>
      <Link
        href={backHref}
        className={`inline-flex items-center gap-1.5 text-sm ${accent} hover:underline`}
      >
        <ArrowLeft size={16} />
        {backLabel}
      </Link>
    </div>
  );
}
