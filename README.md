# Done

A *done* list — not a to-do list. Log what you actually shipped, and let the app
read it back to you at standup: **"Yesterday I… Today I will…"** — exactly how
you'd say it out loud, no improvising required.

Built with React + Vite + TypeScript + Tailwind v4. Calm, focused UI inspired by
Linear and Claude. Everything lives in your browser (localStorage) — no account,
no backend, no tracking.

## Why

Most task apps are about the future. This one is about the past: a frictionless
record of progress that doubles as your standup script. Two states per entry:

- **Done** — something you shipped.
- **Planned** — something you intend to do.

## Features

- **Standup view** — your last working day's *done* items and today's *planned*
  items, formatted as a script you can read top-to-bottom or **copy** into Slack.
  Yesterday correctly skips the weekend (Monday looks back to Friday).
- **Timeline view, grouped by Day / Week / Month / Year** — zoom from "what did I
  do today" out to "what did I ship this year".
- **Quick capture** — type, hit `Enter`. Add a `#tag` inline to organize by
  project or area; tags autocomplete.
- **Inline editing**, one-click status toggle, hover-to-delete.
- **Search & tag filters**, plus lightweight stats: today, this week, and a
  done-streak counter.
- **Dark & light themes** (follows your system by default).
- **Export / import JSON** — your data is yours; back it up or move machines.
- **Multi-tab sync** — edits in one tab show up in the others.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` or `⌘/Ctrl + K` | Focus the quick-add box |
| `Enter` | Add the entry / save an edit |
| `Shift + Enter` | New line while editing |
| `⌘/Ctrl + F` | Focus search |
| `1` / `2` | Switch to Standup / Timeline |
| `Esc` | Blur input / clear search |

## Develop

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build
```

## Data & privacy

Entries are stored under the `done-list:v1` key in your browser's
localStorage and never leave your device. Clearing site data wipes them — use
**Export** first if you want a backup.
