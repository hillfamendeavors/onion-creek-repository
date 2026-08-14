# Incident: "Loading calendar…" never resolves — findings

_15 August 2026. Written during the session that fixed the requester-name bug and ran the SEO pass._

**Status: not a code defect.** The source was correct the whole time. This document exists so the next person who sees a permanently-blank calendar spends five minutes on it instead of an hour rewriting working code.

---

## Symptom

On `http://localhost:4321/onion-creek/requests/`:

- The calendar grid shows `Loading calendar…` forever.
- The month label reads **`May 2026`** — the hardcoded placeholder in [`src/pages/[neighborhood]/requests.astro`](../../../src/pages/[neighborhood]/requests.astro), not a real month.
- Clicking day cells does nothing. Category filter pills do nothing. Nothing on the page is interactive.
- The directory page still *looks* fine, because it's pre-rendered static HTML — its JS was equally dead, just less visibly so.

## The one diagnostic that matters

**If the month label still says `May 2026`, no JavaScript ran at all.**

`renderCalendar()` is the first statement in `init()`, and its first act is to overwrite that label with the real month. So a stale label is not a rendering bug, a data bug, or an auth bug — it means the module never executed. That single observation eliminates the entire application layer before you start reading code.

The same logic applies to `Loading calendar…`: that string only exists in the static HTML. Any execution of `renderCalendar()` replaces it.

## Root cause

The `requests-page.js` module never executed in that browser tab, because its module graph was stale.

Immediately before the symptom appeared, `astro.config.mjs` was edited (a sitemap `filter` change, part of the SEO pass). Editing the Astro config forces the dev server to restart and Vite to re-optimize dependencies:

```
[content] Astro config changed
[content] Clearing content store
[vite] Re-optimizing dependencies because vite config has changed
```

Any page held open across that window keeps an ES-module graph pointing at pre-restart URLs. When one import in that graph fails, **the entire module is discarded** — `requests-page.js` imports `supabase.js`, `auth.js`, `calendar.js`, `modal-a11y.js` and `ui-feedback.js` at the top, so a single failure means not one line of the file runs. There is no partial execution and no retry. The tab stays dead until it is reloaded.

This is landmine #4 in [`HANDOFF.md`](../../../HANDOFF.md), which had already recorded the same failure mode on this same project against this same dependency:

> If a fresh agent ever sees *every* client-side interaction on a page silently dead at once (modals, tabs, search all inert), check this before assuming the source code broke — a single failed ES module import kills the whole script's execution, so nothing after the failed import line ever runs.

## Evidence that the code is fine

Both dev servers were driven with a real headless Chromium against the exact source in the working tree:

| Server | Dep hash | `#currentMonthLabel` | `.calendar-cell` count |
|---|---|---|---|
| `:4399` (started clean, after the config edit) | `?v=f54b96fc` | `August 2026` | 42 |
| `:4321` (the long-running one showing the bug) | `?v=5c29b8c3` | `August 2026` | 42 |

The server that was "broken" in the browser renders the calendar perfectly to a fresh browser. The differing Vite dep hashes are the fingerprint of the re-optimization: the running server had moved on, and only the open tab was still holding the old graph.

Also checked and cleared:

- `npm run build` completes with no errors, and bundles the same script.
- `/src/scripts/requests-page.js`, `/src/lib/supabase.js` and `/node_modules/.vite/deps/@supabase_supabase-js.js` all return **200** on both servers — no `504 Outdated Optimize Dep` was still being served by the time this was investigated.
- The server on `:4321` was confirmed to be serving the *current* source, not a stale copy.

### One unrelated error, deliberately not "fixed"

The browser console shows a single 401:

```
401 https://dktjutawxktwhuhuwbit.supabase.co/rest/v1/service_requests?select=category,notes&neighborhood=eq.onion-creek&status=eq.new&limit=3
```

That is [`src/scripts/directory.js`](../../../src/scripts/directory.js)'s live-request-badge query running as an anonymous visitor. RLS correctly denies it — anonymous users may only read `service_requests_public_counts`. The call site already guards with `if (!error && count > 0)`, so it degrades to "no badge". It is pre-existing, it is not related to this incident, and it is working as designed. Do not "fix" it by loosening RLS.

## The fix

No code change is required.

1. **Hard reload the tab** — `Ctrl+Shift+R`. This is the entire fix in the overwhelming majority of cases.
2. If it persists, the dep cache itself is stale:
   ```bash
   # stop the dev server first
   rm -rf node_modules/.vite
   npm run dev
   ```
   then hard reload.

## Why this keeps costing time, and what would stop it

The failure is expensive out of all proportion to its cause, for one reason: **a dead module and a slow network look identical.** The page presents `Loading calendar…` in both cases, indefinitely, with no error anywhere except a console the user may not have open. It reads as "the app is broken" rather than "this tab is stale."

The hardening in the companion plan does not try to prevent the module failure — it can't; JavaScript that failed to load cannot handle its own error. It makes the failure *legible*: a small inline watchdog, which cannot be killed by the same import failure because it imports nothing, notices that the placeholder is still on screen after 8 seconds and replaces it with an explanation and a reload button.

That converts a silent permanent hang into a self-describing message, for this class of failure and for every other cause of a dead page script (network blips, an extension blocking the request, a future syntax error shipped to production).

**Plan:** [`../plans/2026-08-15-calendar-load-watchdog.md`](../plans/2026-08-15-calendar-load-watchdog.md)
