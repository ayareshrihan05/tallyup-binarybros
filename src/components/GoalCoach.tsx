import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { askCoach } from "@/lib/coach.functions";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

const STARTERS = [
  "How much should I save each week?",
  "Is my goal realistic?",
  "Where can I cut back?",
];

export function GoalCoach({
  currency,
  pocketMoney,
  avgMonthlySpend,
  goals,
}: {
  currency: string;
  pocketMoney: number;
  avgMonthlySpend: number;
  goals: { title: string; target: number; saved: number; targetDate: string | null }[];
}) {
  const ask = useServerFn(askCoach);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, busy]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    const history = messages.slice(-8).map((message) => ({
      role: message.role,
      text: message.text,
    }));
    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, role: "user", text },
    ]);
    setInput("");
    setBusy(true);
    try {
      const result = await ask({
        data: {
          question: text,
          history,
          context: { currency, pocketMoney, avgMonthlySpend, goals },
        },
      });
      setMessages((current) => [
        ...current,
        { id: `a-${Date.now()}`, role: "assistant", text: result.answer },
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Coach is unavailable");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-pop mb-4 p-4">
      <h2 className="mb-1 text-lg">Ask your savings coach 🐷</h2>
      <p className="mb-3 text-xs font-semibold text-muted-foreground">
        Realistic plans built from your own numbers.
      </p>

      {messages.length === 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {STARTERS.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => send(starter)}
              className="rounded-full border-2 border-border bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground"
            >
              {starter}
            </button>
          ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          className="mb-3 max-h-96 overflow-y-auto overscroll-contain rounded-2xl bg-muted/60"
        >
          <div className="flex flex-col gap-2 p-3">
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  <MessageResponse>{message.text}</MessageResponse>
                </MessageContent>
              </Message>
            ))}
            {busy ? <Shimmer>Thinking…</Shimmer> : null}
            <div ref={endRef} />
          </div>
        </div>
      )}

      <PromptInput
        onSubmit={(_message, event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <PromptInputTextarea
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="How do I save for a laptop by June?"
        />
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit status={busy ? "submitted" : "ready"} disabled={busy} />
        </PromptInputFooter>
      </PromptInput>
    </section>
  );
}