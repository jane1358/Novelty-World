import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { Topic } from "../types";

/** ASCII word-char check — matches JS regex `\w` semantics (letters,
 *  digits, underscore). Used for whole-word boundary checks. Non-ASCII
 *  letters (ä, ö, å) count as non-word, which is fine: our aliases
 *  start and end with ASCII letters, so the boundary still falls in
 *  the right place around the matched phrase. */
function isWordChar(c: number): boolean {
  return (
    (c >= 48 && c <= 57) || // 0-9
    (c >= 65 && c <= 90) || // A-Z
    (c >= 97 && c <= 122) || // a-z
    c === 95 // _
  );
}

type AliasEntry = { phrase: string; slug: string };

/** Find the earliest whole-word, case-insensitive occurrence of any
 *  alias in `text`. Aliases must already be sorted by descending phrase
 *  length so that ties at the same start position resolve to the longer
 *  alias ("sauna culture" beats "sauna"). */
function findFirstMatch(
  text: string,
  aliases: AliasEntry[],
): { index: number; matched: string; slug: string } | null {
  const lower = text.toLowerCase();
  let best: { index: number; matched: string; slug: string } | null = null;

  for (const a of aliases) {
    const phraseLower = a.phrase.toLowerCase();
    if (phraseLower.length === 0) continue;
    for (
      let idx = lower.indexOf(phraseLower, 0);
      idx >= 0;
      idx = lower.indexOf(phraseLower, idx + 1)
    ) {
      const endIdx = idx + phraseLower.length;
      const beforeOk =
        idx === 0 || !isWordChar(text.charCodeAt(idx - 1));
      const afterOk =
        endIdx === text.length || !isWordChar(text.charCodeAt(endIdx));
      if (beforeOk && afterOk) {
        if (best === null || idx < best.index) {
          best = { index: idx, matched: text.slice(idx, endIdx), slug: a.slug };
        }
        break;
      }
    }
  }
  return best;
}

/**
 * Auto-link the first Topic alias that appears in `text` to its detail
 * page. Returns the original text if no alias matches. Only the first
 * match per paragraph is linked — by design — to avoid a sea of links
 * in idea descriptions.
 *
 * Matching is case-insensitive and whole-word. If multiple aliases
 * could match at the same start position, the longer one wins ("sauna
 * culture" beats "sauna").
 *
 * `excludeSlug` lets a Topic detail page suppress self-linking when
 * its own description mentions its own aliases.
 */
export function linkifyParagraph(
  text: string,
  basePath: string,
  topics: Topic[],
  excludeSlug?: string,
): ReactNode {
  const aliases = topics
    .filter((t) => t.slug !== excludeSlug)
    .flatMap((t) => t.aliases.map((phrase) => ({ phrase, slug: t.slug })))
    .sort((a, b) => b.phrase.length - a.phrase.length);

  if (aliases.length === 0) return text;

  const found = findFirstMatch(text, aliases);
  if (!found) return text;

  return (
    <Fragment>
      {text.slice(0, found.index)}
      <Link
        href={`${basePath}/topics/${found.slug}`}
        className="text-brand-blue underline decoration-brand-blue/40 underline-offset-2 transition-colors hover:decoration-brand-blue"
      >
        {found.matched}
      </Link>
      {text.slice(found.index + found.matched.length)}
    </Fragment>
  );
}
