"use client";

import * as React from "react";

export type TypewriterPhase = "typing" | "holding" | "deleting";

export interface UseTypewriterOptions {
  /** Milliseconds per character while typing. */
  typeMs?: number;
  /** Milliseconds per character while deleting. */
  deleteMs?: number;
  /** How long to hold a completed phrase. */
  holdMs?: number;
  /** Pause before typing the next phrase. */
  gapMs?: number;
  /** Pause/resume the animation (e.g. while offscreen or while the user types). */
  enabled?: boolean;
}

export interface UseTypewriterResult {
  text: string;
  phase: TypewriterPhase;
}

/**
 * Cycles through `words`, typing and deleting one character at a time.
 * Timers are fully cleaned up when disabled or unmounted, so enabling it again
 * resumes cleanly instead of stacking overlapping animations.
 */
export function useTypewriter(
  words: string[],
  {
    typeMs = 48,
    deleteMs = 14,
    holdMs = 3400,
    gapMs = 900,
    enabled = true,
  }: UseTypewriterOptions = {},
): UseTypewriterResult {
  // Keying off a joined string keeps inline array literals from restarting the
  // animation on every parent render.
  const wordsKey = words.join("\u0000");
  const phrases = React.useMemo(
    () => (wordsKey ? wordsKey.split("\u0000").filter(Boolean) : [""]),
    [wordsKey],
  );

  const [index, setIndex] = React.useState(0);
  const [text, setText] = React.useState("");
  const [phase, setPhase] = React.useState<TypewriterPhase>("typing");

  React.useEffect(() => {
    if (!enabled) return;

    const phrase = phrases[index % phrases.length] ?? "";
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (text.length < phrase.length) {
        timeout = setTimeout(() => {
          setText(phrase.slice(0, text.length + 1));
        }, typeMs);
      } else {
        timeout = setTimeout(() => setPhase("holding"), typeMs);
      }
    } else if (phase === "holding") {
      timeout = setTimeout(() => setPhase("deleting"), holdMs);
    } else {
      if (text.length > 0) {
        timeout = setTimeout(() => {
          setText(phrase.slice(0, text.length - 1));
        }, deleteMs);
      } else {
        timeout = setTimeout(() => {
          setIndex((current) => (current + 1) % phrases.length);
          setPhase("typing");
        }, gapMs);
      }
    }

    return () => clearTimeout(timeout);
  }, [enabled, phrases, index, text, phase, typeMs, deleteMs, holdMs, gapMs]);

  return { text, phase };
}

export default useTypewriter;
