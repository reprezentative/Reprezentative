"use client";

import { useEffect, useRef, useState } from "react";
import { AdminPageHelp } from "@/components/AdminPageHelp";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type SessionSummary = {
  id: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
  lastSnippet: string;
};

type RangeFilter = "all" | "7d" | "30d";

export default function AIAssistantPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [range, setRange] = useState<RangeFilter>("all");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [startFresh, setStartFresh] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    const timer = setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length, loading]);

  const loadSessions = async (currentRange: RangeFilter) => {
    try {
      setHistoryError(null);
      const qs =
        currentRange === "all" ? "" : `?range=${encodeURIComponent(currentRange)}`;
      const res = await fetch(`/api/admin/ai/chat${qs}`);
      if (!res.ok) {
        throw new Error("Failed to load sessions");
      }
      const json = (await res.json()) as { sessions: SessionSummary[] };
      setSessions(json.sessions ?? []);

      if (!currentSessionId && json.sessions && json.sessions.length > 0) {
        setCurrentSessionId(json.sessions[0].id);
      }
    } catch (err) {
      console.error(err);
      setHistoryError(
        "Could not load previous conversations. History may be incomplete.",
      );
    }
  };

  useEffect(() => {
    loadSessions(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    let cancelled = false;

    async function loadMessages(sessionId: string | null) {
      if (!sessionId) {
        setMessages([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/admin/ai/chat?sessionId=${encodeURIComponent(sessionId)}`,
        );
        if (!res.ok) {
          throw new Error("Failed to load messages");
        }
        const json = (await res.json()) as { messages: ChatMessage[] };
        if (!cancelled) {
          setMessages(json.messages ?? []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("Could not load messages for this conversation.");
        }
      }
    }

    loadMessages(currentSessionId);
    return () => {
      cancelled = true;
    };
  }, [currentSessionId]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setInput("");
    setError(null);

    const now = new Date();
    const tempId = `${now.getTime()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        role: "user",
        content: trimmed,
        createdAt: now.toISOString(),
      },
    ]);

    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          sessionId: startFresh ? undefined : currentSessionId ?? undefined,
          reset: startFresh || !currentSessionId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to contact AI");
      }
      const data = (await res.json()) as { reply: string; sessionId: string };

      setCurrentSessionId(data.sessionId);
      setStartFresh(false);

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: data.reply,
          createdAt: new Date().toISOString(),
        },
      ]);

      loadSessions(range);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error contacting AI assistant.",
      );
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading) {
        handleSend();
      }
    }
  };

  return (
    <main className="h-screen bg-black text-white overflow-hidden flex flex-col">
      <div className="border-b border-neutral-800 bg-zinc-900/70 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              AI Assistant
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Ask inventory, sales, or finance questions and get analyst-style
              answers.
            </p>
          </div>
          <AdminPageHelp page="ai-assistant" />
        </div>
      </div>

      <section className="flex flex-1 px-6 py-6 gap-4 text-xs overflow-hidden min-h-0">
        {/* History sidebar */}
        <aside className="hidden w-60 flex-shrink-0 flex-col rounded-md border border-neutral-800 bg-zinc-950/70 p-3 text-[0.7rem] text-neutral-300 md:flex overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Recent Conversations
            </p>
          </div>
          <div className="mt-2 flex gap-1">
            {(["all", "7d", "30d"] as RangeFilter[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setRange(opt);
                }}
                className={`flex-1 rounded-full px-2 py-1 text-[0.65rem] uppercase tracking-[0.14em] ${
                  range === opt
                    ? "bg-white text-black"
                    : "border border-neutral-700 text-neutral-300 hover:bg-neutral-900"
                }`}
              >
                {opt === "all" ? "All" : opt.toUpperCase()}
              </button>
            ))}
          </div>

          {historyError && (
            <p className="mt-2 text-[0.65rem] text-amber-300">{historyError}</p>
          )}

          <div className="mt-3 flex-1 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
            {sessions.length === 0 && (
              <p className="mt-4 text-[0.7rem] text-neutral-500">
                No previous conversations yet. New chats will appear here.
              </p>
            )}
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => {
                  setCurrentSessionId(session.id);
                  setStartFresh(false);
                }}
                className={`w-full rounded-md px-2 py-2 text-left ${
                  currentSessionId === session.id
                    ? "bg-neutral-900 border border-neutral-600"
                    : "hover:bg-neutral-900/60 border border-transparent"
                }`}
              >
                <p className="text-[0.7rem] font-semibold text-neutral-100">
                  {new Date(session.lastMessageAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="mt-0.5 text-[0.65rem] text-neutral-400">
                  {session.messageCount} message
                  {session.messageCount === 1 ? "" : "s"}
                </p>
                {session.lastSnippet && (
                  <p className="mt-0.5 line-clamp-2 text-[0.65rem] text-neutral-500">
                    {session.lastSnippet}
                  </p>
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setError(null);
              setCurrentSessionId(null);
              setStartFresh(true);
            }}
            className="mt-3 w-full rounded-md border border-neutral-700 px-2 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-neutral-100 hover:border-neutral-500 hover:bg-neutral-900"
          >
            New conversation
          </button>
        </aside>

        {/* Chat column */}
        <div className="flex h-full flex-1 flex-col overflow-hidden">
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto rounded-md border border-neutral-800 bg-zinc-950/60 p-4 text-xs min-h-0 custom-scrollbar"
          >
            {messages.length === 0 && (
              <p className="text-[0.8rem] text-neutral-500">
                Start by asking something like{" "}
                <span className="italic">
                  "How did revenue and net profit change in the last 30 days?"
                </span>
              </p>
            )}
            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-md px-3 py-2 text-[0.8rem] ${
                      m.role === "user"
                        ? "bg-white text-black"
                        : "bg-neutral-900 text-neutral-100"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          <form
            className="mt-4 space-y-2 flex-shrink-0"
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading) handleSend();
            }}
          >
            <textarea
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask a question about sales, inventory, or profitability..."
              className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
            />
            <div className="flex items-center justify-between text-[0.7rem] text-neutral-400">
              {error && <span className="text-red-400">{error}</span>}
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="inline-flex items-center justify-center rounded-md bg-white px-4 py-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Thinking..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}


