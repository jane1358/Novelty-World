import type { Topic } from "../types";
import { AudioPlayButton } from "./audio-play-button";
import { EntryDetail } from "./entry-detail";

export function TopicDetail({
  topic,
  basePath,
}: {
  topic: Topic;
  basePath: string;
}) {
  return (
    <EntryDetail
      backHref={`${basePath}/topics`}
      backLabel="Back to Finland Topics"
      basePath={basePath}
      title={topic.title}
      shortDescription={topic.shortDescription}
      thumbnailUrl={topic.thumbnailUrl}
      galleryUrls={topic.galleryUrls}
      longDescription={topic.longDescription}
      accent="blue"
      excludeTopicSlug={topic.slug}
      headerAction={
        <AudioPlayButton slug={topic.slug} kind="topic" className="shrink-0" />
      }
    />
  );
}
