"use client";

/* ================================================================
   CASE MESSAGE THREAD — In-App Compliance Communication
   ================================================================
   Renders a threaded message view for user ↔ compliance team
   communication within a ComplianceCase. Messages are stored as
   ComplianceEvents with action === "MESSAGE".

   Features:
     - Scrollable message list with sender alignment
     - Validated message input (Zod)
     - POST to /api/compliance/cases/[caseId]/message
     - Auto-scroll to latest message on new entries

   IMPORTANT: This replaces the old mailto: escalation path with
   a structured, auditable in-app communication channel.
   ================================================================ */

import { useState, useRef, useEffect, useCallback } from "react";
import { z } from "zod";
import { Send, User, Shield, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineEvent } from "./CaseTimeline";

/* ── Props ── */

interface CaseMessageThreadProps {
  caseId: string;
  messages: TimelineEvent[];
  className?: string;
  onMessageSent?: () => void;
}

/* ── Zod Schema ── */

const messageSchema = z.object({
  body: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message is too long (max 2000 characters)"),
});

/* ── Component ── */

export function CaseMessageThread({
  caseId,
  messages,
  className,
  onMessageSent,
}: CaseMessageThreadProps) {
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    const parsed = messageSchema.safeParse({ body: inputValue.trim() });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid message");
      return;
    }

    setSending(true);

    try {
      const res = await fetch(`/api/compliance/cases/${caseId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: parsed.data.body }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Failed to send" }));
        throw new Error(errBody.error ?? `HTTP ${res.status}`);
      }

      setInputValue("");
      onMessageSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }, [caseId, inputValue, onMessageSent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-color-5/10 px-4 py-3">
        <Shield className="h-4 w-4 text-color-2" />
        <h3 className="text-sm font-semibold text-color-3 tracking-tight">
          Compliance Thread
        </h3>
        <span className="ml-auto text-[10px] text-color-3/30 tabular-nums">
          Case {caseId.slice(0, 8)}
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        role="log"
        aria-label="Compliance case messages"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-xs text-color-3/30">
              No messages yet. Send a message to communicate with the compliance team.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.actor === "USER";
          const body = (msg.details?.body as string) ?? "";
          const senderName = isUser ? "You" : "Compliance Team";

          return (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2.5 max-w-[85%]",
                isUser ? "ml-auto flex-row-reverse" : "",
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                  isUser
                    ? "bg-color-2/10 border-color-2/20 text-color-2"
                    : "bg-purple-400/10 border-purple-400/20 text-purple-400",
                )}
              >
                {isUser ? (
                  <User className="h-3.5 w-3.5" />
                ) : (
                  <Shield className="h-3.5 w-3.5" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-sm leading-relaxed",
                  isUser
                    ? "bg-color-2/10 text-color-3 border border-color-2/15"
                    : "bg-color-3/5 text-color-3 border border-color-3/10",
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-semibold text-color-3/50 uppercase tracking-wider">
                    {senderName}
                  </span>
                  <time className="text-[10px] text-color-3/25" dateTime={msg.createdAt}>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <p className="whitespace-pre-wrap wrap-break-word">{body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="border-t border-color-5/10 p-3">
        {error && (
          <p className="text-xs text-danger mb-2 px-1">{error}</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            disabled={sending}
            rows={1}
            className={cn(
              "flex-1 resize-none rounded-lg border border-color-5/15 bg-color-1 px-3 py-2 text-sm text-color-3",
              "placeholder:text-color-3/25 focus:outline-none focus:ring-1 focus:ring-color-2/40",
              "disabled:opacity-50",
            )}
            aria-label="Message to compliance team"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={sending || !inputValue.trim()}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg bg-color-2 text-color-1",
              "transition-colors hover:bg-color-2/90 active:bg-color-2/80",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
