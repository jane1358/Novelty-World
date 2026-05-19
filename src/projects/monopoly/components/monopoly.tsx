"use client";

import { useEffect } from "react";
import { useMonopolyDebugKeys } from "../dev";
import { useMonopolyStore } from "../store";
import { MONOPOLY_THEME } from "../theme";
import { Footer } from "./footer";
import { Header } from "./header";
import { Squares } from "./squares";

// Visible pause between mechanical steps so the user can read each roll
// land in the log and watch tokens move. Slow enough to follow; fast enough
// that a 4-player no-op loop doesn't feel sluggish.
const STEP_DELAY_MS = 1000;

export function Monopoly() {
  useMonopolyDebugKeys();
  const state = useMonopolyStore((s) => s.state);
  const mode = useMonopolyStore((s) => s.mode);
  useAutoPacing(
    state.turn.phase,
    state.turn.playerId,
    state.turn.paused,
    mode,
  );

  return (
    <div
      className="flex h-[100dvh] w-full flex-col overflow-hidden"
      style={{ ...MONOPOLY_THEME, backgroundColor: "var(--mono-frame)" }}
    >
      <Header state={state} />
      <Squares />
      <Footer state={state} />
    </div>
  );
}

/** First-pass auto-play: while landing on every square is a no-op, just
 *  keep ticking from pre-roll → post-roll → next player's pre-roll on a
 *  fixed delay. The pacing layer lives in the component so the engine
 *  stays pure; when real decisions exist, autoStep will stop on its own
 *  and this loop will skip past the pre-roll → post-roll transition.
 *
 *  Gated on `mode === "live"`: dev-loaded demo snapshots stay frozen so
 *  the UI can be inspected without auto-pacing scribbling over them. */
function useAutoPacing(
  phase: string,
  activePlayerId: string,
  paused: boolean,
  mode: "live" | "demo",
) {
  useEffect(() => {
    if (mode !== "live") return;
    if (paused) return;
    if (phase !== "pre-roll" && phase !== "post-roll") return;
    const timer = setTimeout(() => {
      const store = useMonopolyStore.getState();
      // Re-check inside the timer: mode/phase may have changed between
      // schedule and fire (e.g. a debug key flipped us into demo).
      if (store.mode !== "live") return;
      if (store.state.turn.paused) return;
      if (store.state.turn.phase === "pre-roll") {
        store.step();
      } else if (store.state.turn.phase === "post-roll") {
        store.submit({
          kind: "end-turn",
          playerId: store.state.turn.playerId,
        });
      }
    }, STEP_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [phase, activePlayerId, paused, mode]);
}
