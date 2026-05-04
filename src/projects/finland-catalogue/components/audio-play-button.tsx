"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface AudioPlayButtonProps {
  slug: string;
  kind: "idea" | "topic";
  className?: string;
}

type PlayState = "idle" | "loading" | "playing" | "paused";

export function AudioPlayButton({ slug, kind, className }: AudioPlayButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayState>("idle");

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  function handleClick() {
    const existing = audioRef.current;
    if (existing) {
      if (existing.paused) {
        void existing.play();
        setState("playing");
      } else {
        existing.pause();
        setState("paused");
      }
      return;
    }

    setState("loading");
    const audio = new Audio(`/api/finland-tts?kind=${kind}&slug=${slug}`);
    audioRef.current = audio;

    audio.addEventListener("playing", () => setState("playing"));
    audio.addEventListener("pause", () => {
      if (!audio.ended) setState("paused");
    });
    audio.addEventListener("ended", () => setState("idle"));
    audio.addEventListener("error", () => {
      audioRef.current = null;
      setState("idle");
    });

    void audio.play();
  }

  const label =
    state === "loading"
      ? "Loading audio"
      : state === "playing"
        ? "Pause narration"
        : "Play narration";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "loading"}
      aria-label={label}
      aria-pressed={state === "playing"}
      className={cn(
        "inline-flex items-center gap-2 self-start rounded-full border border-border-default bg-surface-secondary px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-border-hover disabled:opacity-60",
        state === "playing" && "text-brand-blue",
        className,
      )}
    >
      {state === "loading" ? (
        <Loader2 size={20} className="animate-spin" />
      ) : state === "playing" ? (
        <Pause size={20} />
      ) : (
        <Play size={20} />
      )}
      <span>
        {state === "loading"
          ? "Loading…"
          : state === "playing"
            ? "Pause"
            : state === "paused"
              ? "Resume"
              : "Listen"}
      </span>
    </button>
  );
}
