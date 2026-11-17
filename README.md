# Unhurried

A gentle productivity app inspired by Neil Fiore's book *The Now Habit*.

Procrastination usually comes from fear and overwhelm, not laziness. Unhurried is built to make starting feel
safe: short blocks of quality work, guilt-free leisure planned first, and a tone that never scolds. There are no
red overdue warnings, no streaks and no "missed" days.

**Live app:** https://dmeredith7.github.io/Unhurried/

## Features

- **Today and Tasks.** Your own spaces (Work, Home, Errands…) with colors, icons and custom fields such as
  "Client" or "Room". Tasks have notes, due dates, estimated 30-minute blocks, priority, tags, steps (subtasks)
  and recurrence (daily, weekly on chosen days, monthly, or counted from when you finish). Reusable templates
  like "Weekly clean". Filter by space, tag or priority. Past due dates read "Still on your list".
- **Focus blocks.** 30-minute blocks by default (adjustable), started from any task or free-floating. An optional
  2-minute guided breathing warm-up. The timer stays accurate in background tabs, through sleep and reloads, and
  ends with a soft chime and a notification. You then rate the quality of your focus, add a note, and get a
  reward-break suggestion from your own list of break ideas.
- **The Unschedule.** A weekly grid in 30-minute slots. You plan leisure first, then committed time like sleep,
  meals and meetings. You can also pencil in tentative work plans, which are never marked as missed. Finished
  focus blocks fill in automatically. Weekly entries can be changed for just one week. A weekly summary shows
  quality work hours, hours by space and leisure protected, with no comparison to an "ideal".
- **Goals (reverse calendar).** Start at the deadline and work backward through milestones until you reach a
  small first step you can take today. Milestones and steps are ordinary tasks. A timeline shows your progress.
  If a milestone slips, you choose to push the rest back or keep the deadline; it is never flagged as a failure.
- **Progress dashboard.** For any week: hours of focused work, blocks, average focus quality, leisure protected,
  tasks and goal steps finished. Charts show focus by day, the last 8 weeks, focus by space and your quality
  ratings, plus progress bars for each goal. When the data clearly supports it, it notes when your focus tends to
  be best. Every chart has a table view. There are no week-versus-week arrows or red/green changes, only what you did.
- **Self-talk reframes.** "I have to" becomes "I choose to", "I must finish" becomes "When can I start?", and
  "This is too big" becomes "I can take one small step". You can turn these off.
- **Your data stays yours.** Everything is stored in your browser (IndexedDB). There's no account and nothing is
  sent to a server. Export everything as JSON and import it on another device, merging or replacing.
- **Works on a phone and offline.** It's responsive, installable ("Add to Home Screen"), keeps working offline,
  and has light and dark themes.
- **Accessible.** Keyboard navigable and screen-reader labelled. It passes an axe WCAG 2.1 AA audit on every
  screen in both themes.

## Getting started

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173). The first visit shows a short getting-started
guide.

### Other commands

| Command | What it does |
| --- | --- |
| `npm test` | Run the unit tests (Vitest) |
| `npm run typecheck` | Type-check the project |
| `npm run lint` | Lint with ESLint |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |

## Deploying

Every push to `main` runs the tests and deploys to GitHub Pages through
`.github/workflows/deploy.yml`. One-time setup: in the repository's **Settings → Pages**, set **Source** to
**GitHub Actions**.

The app is built with the repository name as its base path (`BASE_PATH=/Unhurried/`). To host somewhere else at
the root of a domain, run a plain `npm run build` and serve `dist/`. Configure the host to serve `index.html` for
unknown paths, since the app uses client-side routes.

## How it's built

React, TypeScript, Vite and Tailwind CSS v4, with Dexie for IndexedDB, Headless UI for accessible dialogs,
Lucide icons and vite-plugin-pwa for offline support.

```
src/
  data/        Storage: Dexie schema, repositories, hooks, backup, goals, schedule rules
  domain/      Pure logic with tests: timer, recurrence, reframes, schedule, reverse calendar, stats
  components/  Shared UI: task and entry editors, timer provider, dialogs
  screens/     Today, Tasks, Focus, Unschedule, Goals, Progress, Settings, Getting started
  lib/         Dates, colors and icons, theme, sound and notifications, timer worker
```

A few design decisions:

- **Screens never talk to the database directly.** They go through `src/data/repos.ts`. Every record has a UUID,
  `createdAt`/`updatedAt` and a soft-delete marker, so a sync backend can be added later. It would keep IndexedDB
  as the local copy and reconcile by `updatedAt`, the same rule JSON import uses for merging.
- **The timer is clock-based.** It stores when the current phase ends and derives the time left from the clock.
  A Web Worker signals the end on time, because browsers throttle workers less than background tabs.
- **One-week Unschedule changes are stored by calendar date,** so switching the week to start on Sunday or Monday
  never misplaces anything.

## Roadmap

- Optional sign-in and sync across devices (planned with Supabase), keeping the app fully usable without an
  account.

## Credits

The ideas behind this app (the Unschedule, 30-minute quality blocks, guilt-free play, the reverse calendar and
the self-talk reframes) come from *The Now Habit* by Neil Fiore. This is an independent project and isn't
affiliated with the author or publisher.
