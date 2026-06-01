import type { Entry } from "../types";
import type { StandupData } from "./standup";

const KEY = "done-list:anthropic";
const MODEL = "claude-haiku-4-5-20251001";

export function getAIKey(): string | null {
  return localStorage.getItem(KEY);
}

export function setAIKey(k: string | null) {
  if (k) localStorage.setItem(KEY, k.trim());
  else localStorage.removeItem(KEY);
}

export function hasAIKey(): boolean {
  return !!getAIKey();
}

async function call(system: string, prompt: string): Promise<string> {
  const key = getAIKey();
  if (!key) throw new Error("Add your Claude API key in Settings to use AI.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const e = await res.json();
      detail = e?.error?.message ?? "";
    } catch {
      /* ignore */
    }
    if (res.status === 401) throw new Error("Invalid API key. Check it in Settings.");
    throw new Error(`Claude error ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.content ?? []).map((c: any) => c.text ?? "").join("").trim();
}

const fmt = (e: Entry) => `- ${e.text}${e.tag ? ` [${e.tag}]` : ""}`;

export async function aiStandup(data: StandupData): Promise<string> {
  const yesterday = data.yesterdayDone.map(fmt).join("\n") || "(nothing logged)";
  const todayDone = data.todayDone.map(fmt).join("\n");
  const today = data.todayPlanned.map(fmt).join("\n") || "(nothing planned)";
  const carried = data.carriedOver.map(fmt).join("\n");

  const prompt = `My raw standup notes:

YESTERDAY (done):
${yesterday}
${todayDone ? `\nALREADY DONE TODAY:\n${todayDone}` : ""}
TODAY (planned):
${today}
${carried ? `\nSTILL OPEN:\n${carried}` : ""}

Write what I should say at standup.`;

  return call(
    "You turn a developer's raw done/planned notes into a natural, confident, spoken standup update in the first person. Two short paragraphs: (1) what I did since yesterday, (2) what I'm focusing on today, and call out any blocker. Be concise and human — no preamble, no markdown headers, no bullet lists.",
    prompt
  );
}

export async function aiReview(label: string, doneItems: Entry[]): Promise<string> {
  const list = doneItems.map(fmt).join("\n") || "(nothing yet)";
  const prompt = `Period: ${label}\n\nEverything I shipped:\n${list}\n\nWrite a recap of what I accomplished.`;
  return call(
    "You summarize a person's shipped work into a clear, organized recap suitable for a 1:1 or self-review. Group related items under short bold theme headers, keep it specific and concrete, and end with one sentence on overall impact. No fluff.",
    prompt
  );
}
