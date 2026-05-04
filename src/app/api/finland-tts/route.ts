import { NextResponse } from "next/server";
import { IDEAS } from "@/projects/finland-catalogue/ideas";
import { TOPICS } from "@/projects/finland-catalogue/topics";

// Lily — legacy ElevenLabs default voice, still callable via API on the
// free tier. ElevenLabs is sunsetting default voices on 2026-12-31; after
// that this will need a paid plan or a different provider.
const VOICE_ID = "pFZP5JQG7iQjIQuC4Bku";
// Multilingual model — handles Finnish words mixed into English prose far
// better than the English-only flash model, at the same character cost.
const MODEL_ID = "eleven_multilingual_v2";

function buildScript(title: string, shortDescription: string, longDescription: string[]): string {
  return [title, shortDescription, ...longDescription].join("\n\n");
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const slug = url.searchParams.get("slug");

  if (kind !== "idea" && kind !== "topic") {
    return NextResponse.json({ error: "kind must be 'idea' or 'topic'" }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const entry =
    kind === "idea"
      ? IDEAS.find((i) => i.slug === slug)
      : TOPICS.find((t) => t.slug === slug);

  if (!entry) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY not configured" },
      { status: 500 },
    );
  }

  const text = buildScript(entry.title, entry.shortDescription, entry.longDescription);

  const elevenResponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
      }),
    },
  );

  if (!elevenResponse.ok || !elevenResponse.body) {
    const detail = await elevenResponse.text();
    return NextResponse.json(
      { error: "elevenlabs request failed", status: elevenResponse.status, detail },
      { status: 502 },
    );
  }

  return new Response(elevenResponse.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      // Browser caches the MP3 forever; re-plays of the same entry cost
      // zero ElevenLabs characters. Bust by changing slug or appending a
      // version query if entry text is edited.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
