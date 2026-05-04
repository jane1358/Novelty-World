import { NextResponse } from "next/server";
import { IDEAS } from "@/projects/finland-catalogue/ideas";
import { TOPICS } from "@/projects/finland-catalogue/topics";

// Google Translate's public TTS endpoint — no API key, free, Finnish-
// trained voice. Undocumented but stable for ~10 years and used by the
// gTTS library and many others. Per-request cap is ~200 chars, so we
// chunk longer text on sentence/comma boundaries.
const TRANSLATE_TTS_BASE = "https://translate.google.com/translate_tts";
const LANG = "fi";
const MAX_CHUNK_LEN = 150;

// The Finnish voice would otherwise read digits as Finnish numerals
// ("kaksituhatta kahdeksantoista" for 2018). Spelling them out forces
// English pronunciation regardless of voice language.
function numberToWords(n: number): string {
  if (n === 0) return "zero";
  if (n < 0) return `negative ${numberToWords(-n)}`;
  const ones = [
    "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
    "seventeen", "eighteen", "nineteen",
  ];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  function under1000(num: number): string {
    if (num < 20) return ones[num];
    if (num < 100) {
      const r = num % 10;
      return tens[Math.floor(num / 10)] + (r ? `-${ones[r]}` : "");
    }
    const r = num % 100;
    return `${ones[Math.floor(num / 100)]} hundred${r ? ` ${under1000(r)}` : ""}`;
  }
  if (n < 1000) return under1000(n);
  if (n < 1_000_000) {
    const t = Math.floor(n / 1000);
    const r = n % 1000;
    return `${under1000(t)} thousand${r ? ` ${under1000(r)}` : ""}`;
  }
  return String(n);
}

// Read 4-digit years as natural pairs ("nineteen forty-five") instead of
// the cardinal ("one thousand nine hundred forty-five"). 2001-2009 stays
// as "two thousand X" because that reads more naturally than "twenty oh X".
function readAsYear(year: number): string {
  if (year === 1000) return "one thousand";
  if (year === 2000) return "two thousand";
  const upper = Math.floor(year / 100);
  const lower = year % 100;
  if (upper === 20 && lower < 10) {
    return `two thousand ${numberToWords(lower)}`;
  }
  if (lower === 0) return `${numberToWords(upper)} hundred`;
  if (lower < 10) return `${numberToWords(upper)} oh ${numberToWords(lower)}`;
  return `${numberToWords(upper)} ${numberToWords(lower)}`;
}

function spellOutNumbers(text: string): string {
  return text.replace(/\d+/g, (m) => {
    const n = Number(m);
    if (m.length === 4 && n >= 1000 && n < 2100) return readAsYear(n);
    return numberToWords(n);
  });
}

function chunkParagraph(paragraph: string, maxLen: number): string[] {
  const units = paragraph
    .split(/(?<=[.!?])\s+|(?<=,)\s+/)
    .map((u) => u.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let buf = "";
  for (let unit of units) {
    while (unit.length > maxLen) {
      const lastSpace = unit.lastIndexOf(" ", maxLen);
      const splitAt = lastSpace > 0 ? lastSpace : maxLen;
      if (buf) {
        chunks.push(buf);
        buf = "";
      }
      chunks.push(unit.slice(0, splitAt).trim());
      unit = unit.slice(splitAt).trim();
    }
    if (buf && buf.length + 1 + unit.length > maxLen) {
      chunks.push(buf);
      buf = unit;
    } else {
      buf = buf ? `${buf} ${unit}` : unit;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

// Chunk paragraph-by-paragraph so the natural micro-pause between TTS
// chunks falls on paragraph breaks, never mid-paragraph between sentences.
function chunkText(text: string, maxLen = MAX_CHUNK_LEN): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((paragraph) => chunkParagraph(paragraph, maxLen));
}

async function fetchChunk(text: string, idx: number, total: number): Promise<ArrayBuffer> {
  const params = new URLSearchParams({
    ie: "UTF-8",
    q: text,
    tl: LANG,
    client: "tw-ob",
    idx: String(idx),
    total: String(total),
    textlen: String(text.length),
  });
  const res = await fetch(`${TRANSLATE_TTS_BASE}?${params.toString()}`, {
    // Google Translate's TTS endpoint rejects requests without a
    // browser-like User-Agent.
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) {
    throw new Error(`chunk ${idx + 1}/${total} failed: ${res.status}`);
  }
  return res.arrayBuffer();
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

  const text = spellOutNumbers(
    [entry.title, entry.shortDescription, ...entry.longDescription].join("\n\n"),
  );
  const chunks = chunkText(text);

  try {
    // Buffer all chunks before responding so the response has a known
    // Content-Length. The browser uses that to compute duration, which
    // the player UI needs to render the scrub bar.
    const buffers = await Promise.all(
      chunks.map((c, i) => fetchChunk(c, i, chunks.length)),
    );
    const totalLen = buffers.reduce((sum, b) => sum + b.byteLength, 0);
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const b of buffers) {
      merged.set(new Uint8Array(b), offset);
      offset += b.byteLength;
    }

    return new Response(merged, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(totalLen),
        // Don't cache — entries change daily, and Google Translate is
        // free, so every fresh page load can refetch. Within a session,
        // pause/resume/seek still work without refetching because the
        // Audio element keeps the data in memory.
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "tts failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
