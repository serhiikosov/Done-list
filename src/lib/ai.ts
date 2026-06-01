import type { Entry } from "../types";
import type { StandupData } from "./standup";

export type AIProvider = "gemini" | "claude";

const PROVIDER_KEY = "done-list:ai-provider";
const KEYS: Record<AIProvider, string> = {
  gemini: "done-list:gemini",
  claude: "done-list:anthropic",
};

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const GEMINI_MODEL = "gemini-2.5-flash";

export function getProvider(): AIProvider {
  const p = localStorage.getItem(PROVIDER_KEY);
  return p === "claude" ? "claude" : "gemini";
}
export function setProvider(p: AIProvider) {
  localStorage.setItem(PROVIDER_KEY, p);
}
export function getKey(p: AIProvider): string | null {
  return localStorage.getItem(KEYS[p]);
}
export function setKey(p: AIProvider, k: string | null) {
  if (k) localStorage.setItem(KEYS[p], k.trim());
  else localStorage.removeItem(KEYS[p]);
}
export function hasAIKey(): boolean {
  return !!getKey(getProvider());
}

async function callClaude(key: string, system: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.error?.message ?? "";
    } catch {
      /* ignore */
    }
    if (res.status === 401) throw new Error("Invalid Claude API key. Check it in Settings.");
    throw new Error(`Claude error ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.content ?? []).map((c: any) => c.text ?? "").join("").trim();
}

async function callGemini(key: string, system: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    key
  )}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      // System text folded into the prompt for maximum REST compatibility.
      contents: [{ role: "user", parts: [{ text: `${system}\n\n${prompt}` }] }],
      generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
    }),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.error?.message ?? "";
    } catch {
      /* ignore */
    }
    if (res.status === 400 && /api[_ ]?key/i.test(detail))
      throw new Error("Invalid Gemini API key. Check it in Settings.");
    throw new Error(`Gemini error ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini returned no text — try again.");
  return text;
}

async function call(system: string, prompt: string): Promise<string> {
  const provider = getProvider();
  const key = getKey(provider);
  if (!key) throw new Error("Add your API key in Settings to use AI.");
  return provider === "claude"
    ? callClaude(key, system, prompt)
    : callGemini(key, system, prompt);
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
