import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CoachInput = z.object({
  question: z.string().min(1).max(500),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(2000) }))
    .max(12)
    .default([]),
  context: z.object({
    currency: z.string().max(8),
    pocketMoney: z.number(),
    avgMonthlySpend: z.number(),
    goals: z
      .array(
        z.object({
          title: z.string().max(80),
          target: z.number(),
          saved: z.number(),
          targetDate: z.string().nullable(),
        }),
      )
      .max(10),
  }),
});

const SYSTEM = `You are Pocket Coach, a warm, upbeat savings coach for students.
Give realistic, specific, doable advice using the student's real numbers.
Rules:
- Keep answers under 120 words, use short bullet points and at most 2 emoji.
- Always ground suggestions in the numbers given (pocket money, average spend, goals).
- Suggest a concrete monthly/weekly amount to set aside and a realistic finish month.
- Never suggest debt, gambling, or investing advice; focus on budgeting habits.
- End with a small reward idea for hitting the next milestone.`;

export const askCoach = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CoachInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured yet.");

    const goalLines = data.context.goals.length
      ? data.context.goals
          .map(
            (goal) =>
              `- ${goal.title}: saved ${goal.saved} of ${goal.target}${goal.targetDate ? `, wants it by ${goal.targetDate}` : ""}`,
          )
          .join("\n")
      : "- no goals yet";

    const contextBlock = `Currency: ${data.context.currency}
Monthly pocket money: ${data.context.pocketMoney}
Average monthly spend (last 3 months): ${Math.round(data.context.avgMonthlySpend)}
Goals:
${goalLines}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-terra",
        stream: true,
        instructions: SYSTEM,
        input: [
          { role: "user", content: `Here is my situation:\n${contextBlock}` },
          ...data.history.map((message) => ({ role: message.role, content: message.text })),
          { role: "user", content: data.question },
        ],
      }),
    });

    if (response.status === 429) throw new Error("Coach is busy — try again in a moment.");
    if (response.status === 402) throw new Error("AI credits are used up for now.");
    if (!response.ok || !response.body) {
      throw new Error("Coach could not answer right now.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const event = JSON.parse(payload) as { type?: string; delta?: string };
          if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
            text += event.delta;
          }
        } catch {
          // ignore keep-alive / partial frames
        }
      }
    }

    return { answer: text.trim() || "I need a bit more info to suggest something useful." };
  });