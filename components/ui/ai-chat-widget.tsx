"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bot, MessageCircle, UserRound, X } from "lucide-react";

import { AIChatCard } from "@/components/ui/ai-chat-card";
import {
  clearChatHistory,
  getCurrentUserUid,
  loadChatHistory,
  saveChatHistory,
  sendChatMessage,
  type ChatTurn,
} from "@/lib/ai-chat";
import { cn } from "@/lib/utils";

interface TranscriptMessage {
  id: number;
  role: ChatTurn["role"];
  content: string;
}

const SUGGESTED_PROMPTS = [
  "How do I import invoices into Recovr?",
  "What happens when an invoice is 22 days overdue?",
  "Explain the recovery sequence stages",
  "How do payment plans work?",
];

const INTRO_PROMPT =
  "Ask about invoices, recovery workflows, or your plan — I'll check with the Recovr assistant.";

function toTranscript(uid: string): TranscriptMessage[] {
  return loadChatHistory(uid).map((turn, index) => ({
    id: index,
    role: turn.role,
    content: turn.content,
  }));
}

/** Floating assistant: AIChatCard UI + n8n-backed conversation, pinned bottom-right. */
export function AIChatWidget({ uid }: { uid?: string }) {
  const resolvedUid = uid ?? getCurrentUserUid();

  const [open, setOpen] = React.useState(false);
  const [activeUid, setActiveUid] = React.useState(resolvedUid);
  const [messages, setMessages] = React.useState<TranscriptMessage[]>(() =>
    toTranscript(resolvedUid),
  );
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [composerKey, setComposerKey] = React.useState(0);

  const nextId = React.useRef(messages.length);
  const transcriptRef = React.useRef<HTMLDivElement>(null);
  const requestRef = React.useRef<AbortController | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRequest = React.useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  React.useEffect(() => clearRequest, [clearRequest]);

  // Switch to that user's saved conversation when the signed-in account changes.
  React.useEffect(() => {
    if (resolvedUid === activeUid) return;
    clearRequest();
    const restored = toTranscript(resolvedUid);
    nextId.current = restored.length;
    setMessages(restored);
    setError(null);
    setIsSending(false);
    setComposerKey((key) => key + 1);
    setActiveUid(resolvedUid);
  }, [resolvedUid, activeUid, clearRequest]);

  // Every sent/received message is saved locally, scoped to the user's UID.
  React.useEffect(() => {
    saveChatHistory(
      activeUid,
      messages.map(({ role, content }) => ({ role, content })),
    );
  }, [activeUid, messages]);

  // Keep the newest message in view whenever the transcript changes.
  React.useEffect(() => {
    const node = transcriptRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [open, messages, isSending, error, composerKey]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const hasHistory = messages.length > 0;

  const subtitle = isSending
    ? "Waiting for a reply…"
    : error
      ? "Please try again in a moment"
      : hasHistory
        ? "Saved on this device"
        : "Recovr support assistant";

  const handleSend = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    clearRequest();
    setError(null);
    setIsSending(true);
    setComposerKey((key) => key + 1);

    const userMessage: TranscriptMessage = {
      id: nextId.current++,
      role: "user",
      content: trimmed,
    };
    const history: ChatTurn[] = [...messages, userMessage].map((item) => ({
      role: item.role,
      content: item.content,
    }));
    setMessages((current) => [...current, userMessage]);

    const controller = new AbortController();
    requestRef.current = controller;
    timeoutRef.current = setTimeout(() => controller.abort(), 90_000);

    try {
      const reply = await sendChatMessage(trimmed, history, controller.signal, activeUid);
      if (controller.signal.aborted) return;
      if (!reply) {
        throw new Error("The assistant didn't return a readable reply. Please try again.");
      }
      setMessages((current) => [
        ...current,
        { id: nextId.current++, role: "assistant", content: reply },
      ]);
    } catch (caught) {
      if (controller.signal.aborted) {
        setError("That took too long. Please try sending your message again.");
      } else {
        setError(
          caught instanceof Error
            ? caught.message
            : "Something went wrong. Please try again.",
        );
      }
    } finally {
      if (requestRef.current === controller) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        requestRef.current = null;
        setIsSending(false);
      }
    }
  };

  const handleReset = () => {
    clearRequest();
    clearChatHistory(activeUid);
    nextId.current = 0;
    setMessages([]);
    setError(null);
    setIsSending(false);
    setComposerKey((key) => key + 1);
  };

  return (
    <>
      <AnimatePresence>
        {open ? (
          <div className="pointer-events-none fixed inset-x-3 bottom-[92px] z-50 flex justify-end sm:inset-x-auto sm:bottom-24 sm:right-6">
            <motion.div
              role="dialog"
              aria-label="Recovr assistant"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: "spring", bounce: 0.18, duration: 0.35 }}
              className="pointer-events-auto w-full max-w-[360px] origin-bottom-right"
            >
              <AIChatCard
                key={composerKey}
                className="ai-chat-widget-card h-[min(520px,calc(100dvh-120px))] max-h-[560px] overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
                title="Recovr Assistant"
                subtitle={subtitle}
                statusIndicator={
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                }
                prompts={SUGGESTED_PROMPTS}
                placeholder="Ask about invoices, recovery, or your plan…"
                showAttach={false}
                onSend={(message) => void handleSend(message)}
                onReset={handleReset}
              >
                <div
                  ref={transcriptRef}
                  className="flex h-full flex-col gap-3 overflow-y-auto pr-1"
                >
                  {!hasHistory && !isSending && !error ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-4 text-center">
                      <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-purple-500/25"
                      >
                        <Bot className="h-6 w-6" />
                      </motion.div>
                      <div>
                        <p className="text-[17px] font-semibold tracking-[-0.3px] text-foreground">
                          Need a hand?
                        </p>
                        <p className="mx-auto mt-1 max-w-[230px] text-xs leading-5 text-muted-foreground">
                          {INTRO_PROMPT}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {SUGGESTED_PROMPTS.slice(0, 3).map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => void handleSend(suggestion)}
                            className="rounded-full border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 dark:bg-neutral-900 dark:hover:border-purple-500/40 dark:hover:bg-purple-950/30 dark:hover:text-purple-300"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {messages.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex items-end gap-2",
                        item.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      {item.role === "assistant" ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-white">
                          <Bot className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                      <div
                        className={cn(
                          "max-w-[82%] whitespace-pre-wrap break-words px-3 py-2 text-sm leading-5 shadow-sm",
                          item.role === "user"
                            ? "rounded-2xl rounded-br-sm bg-gradient-to-br from-violet-600 to-purple-700 text-white"
                            : "rounded-2xl rounded-bl-sm border border-border bg-white text-foreground dark:bg-neutral-900",
                        )}
                      >
                        {item.content}
                      </div>
                      {item.role === "user" ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                          <UserRound className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                    </motion.div>
                  ))}

                  {isSending ? (
                    <div className="flex items-end gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-white">
                        <Bot className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border bg-white px-3 py-3 dark:bg-neutral-900">
                        {[0, 1, 2].map((dot) => (
                          <motion.span
                            key={dot}
                            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay: dot * 0.15,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {error ? (
                    <div className="ml-8 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-600 dark:border-red-500/20 dark:bg-red-950/30 dark:text-red-300">
                      {error}
                    </div>
                  ) : null}
                </div>
              </AIChatCard>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", bounce: 0.4, duration: 0.35 }}
        className="group fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-[0_12px_32px_-8px_rgba(124,58,237,0.65)] ring-1 ring-white/25 transition-shadow hover:shadow-[0_16px_40px_-8px_rgba(124,58,237,0.8)]"
      >
        <span className="pointer-events-none absolute right-16 hidden whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-white dark:text-neutral-900 sm:block">
          Chat with Recovr
        </span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "open"}
            initial={{ opacity: 0, rotate: -60, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 60, scale: 0.6 }}
            transition={{ duration: 0.18 }}
            className="flex"
          >
            {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          </motion.span>
        </AnimatePresence>
        {!open && messages.length > 0 ? (
          <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-neutral-950" />
        ) : null}
      </motion.button>
    </>
  );
}

export default AIChatWidget;
