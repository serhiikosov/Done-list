import type { Entry, Goal, GoalLayer, GoalHorizon } from "../types";
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
  // Strip whitespace and any stray non-key characters (e.g. a pasted "…").
  const clean = k ? k.replace(/[^A-Za-z0-9._-]/g, "") : "";
  if (clean) localStorage.setItem(KEYS[p], clean);
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
      max_tokens: 1024,
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
      generationConfig: {
        maxOutputTokens: 1200,
        temperature: 0.7,
        // 2.5-flash is a thinking model; disable thinking so the whole
        // token budget goes to the answer (otherwise replies get truncated).
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.error?.message ?? "";
    } catch {
      /* ignore */
    }
    // Surface Google's actual reason (key invalid, API disabled, referrer
    // blocked, …) so it's diagnosable.
    throw new Error(detail || `Gemini error ${res.status}`);
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

const HORIZON_ORDER: GoalHorizon[] = ["3-year", "1-year", "quarter", "month", "week"];

/** Ask the AI to decompose a goal into nested milestones + weekly actions.
 *  When `goal.auto` is set, the AI also picks the realistic top horizon. */
export async function aiBreakdownGoal(
  goal: Goal,
  otherGoals: { title: string; horizon: GoalHorizon }[] = []
): Promise<{ summary: string; layers: GoalLayer[]; horizon?: GoalHorizon }> {
  const today = new Date().toISOString().slice(0, 10);
  const context = otherGoals.length
    ? `\nMy other active goals (consider my overall load when pacing this):\n${otherGoals
        .map((g) => `- ${g.title} (${g.horizon})`)
        .join("\n")}`
    : "";

  const horizonInstruction = goal.auto
    ? `Decide the realistic, HEALTHY timeframe yourself — pick the largest horizon (one of 3-year, 1-year, quarter, month) that fits a safe pace for this goal, and set "horizon" to it. In "summary", briefly state the timeframe you chose and why (e.g. healthy weight gain ~0.25–0.5 kg/week).`
    : `Plan should span up to "${goal.horizon}". Set "horizon" to "${goal.horizon}".`;
  const span = goal.auto
    ? "the horizons from your chosen top horizon down to week"
    : HORIZON_ORDER.slice(HORIZON_ORDER.indexOf(goal.horizon)).join(", ");

  const prompt = `Goal: ${goal.title}
${goal.detail ? `Details: ${goal.detail}` : ""}
Today: ${today}${context}

${horizonInstruction}

Return STRICT JSON only — no prose, no code fences — matching exactly:
{"summary": string, "horizon": "3-year"|"1-year"|"quarter"|"month", "layers": [{"horizon": "3-year"|"1-year"|"quarter"|"month"|"week", "label": string, "items": string[]}]}
Include layers for ${span} (largest to smallest, always ending with "week").
"label" is a short milestone title for that horizon (e.g. "By end of Q3: …").
The "week" layer must have 3-6 concrete actions I can start this week.
Keep every item one short line. Be realistic and safe about pace.`;

  const raw = await call(
    "You are a pragmatic goal-planning coach. You decompose goals into nested, realistic milestones across time horizons and concrete weekly actions. Output STRICT JSON only.",
    prompt
  );

  let json = raw.trim();
  // Strip accidental code fences.
  json = json.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  // Grab the outermost JSON object if the model added stray text.
  const first = json.indexOf("{");
  const last = json.lastIndexOf("}");
  if (first > 0 || last < json.length - 1) json = json.slice(first, last + 1);

  let parsed: { summary?: string; layers?: GoalLayer[]; horizon?: GoalHorizon };
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Couldn't read the AI plan — tap Redo to try again.");
  }
  const layers = (parsed.layers ?? [])
    .filter((l) => l && Array.isArray(l.items) && l.items.length > 0)
    .map((l) => ({
      horizon: l.horizon,
      label: typeof l.label === "string" ? l.label : "",
      items: l.items.filter((i) => typeof i === "string" && i.trim()).map((i) => i.trim()),
    }))
    .sort((a, b) => HORIZON_ORDER.indexOf(a.horizon) - HORIZON_ORDER.indexOf(b.horizon));
  if (layers.length === 0) throw new Error("The AI plan came back empty — tap Redo.");
  const topHorizon = layers.find((l) => l.horizon !== "week")?.horizon ?? parsed.horizon;
  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    layers,
    horizon: HORIZON_ORDER.includes(parsed.horizon as GoalHorizon)
      ? parsed.horizon
      : topHorizon,
  };
}

export async function aiReview(label: string, doneItems: Entry[]): Promise<string> {
  const list = doneItems.map(fmt).join("\n") || "(nothing yet)";
  const prompt = `Period: ${label}\n\nEverything I shipped:\n${list}\n\nWrite a recap of what I accomplished.`;
  return call(
    "You summarize a person's shipped work into a clear, organized recap suitable for a 1:1 or self-review. Group related items under short bold theme headers (use **Header** markdown and '- ' for bullets), be specific and concrete, and end with one short 'Overall impact' line. Start directly with the first header — no preamble or intro sentence.",
    prompt
  );
}
