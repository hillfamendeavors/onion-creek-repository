# Calendar Load Watchdog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the requests page's client script fails to execute, replace the permanent `Loading calendar…` placeholder with a visible explanation and a reload button, instead of hanging forever.

**Architecture:** A single `is:inline` script in `requests.astro` that imports nothing and starts an 8-second timer. If `#calendarGrid` still contains the `.request-loading` placeholder when it fires, the module never ran, and the watchdog swaps in an error block. Because it has no imports, the failure that kills `requests-page.js` cannot kill it. It never runs on a healthy page: `renderCalendar()` clears the placeholder in the first milliseconds of `init()`.

**Tech Stack:** Astro 5 static templating, hand-written vanilla JS, plain CSS in `src/styles/directory.css`. No new dependencies.

**Background:** [`../specs/2026-08-15-calendar-blank-module-failure-design.md`](../specs/2026-08-15-calendar-blank-module-failure-design.md)

## Global Constraints

- **No JS framework and no new dependencies.** This project has exactly two (`astro`, `@supabase/supabase-js`). Interactivity is hand-written vanilla JS.
- **No test framework.** None exists, and `HANDOFF.md` is explicit that adding one for a single change is worse than not adding one: *"if you add a test framework, say so explicitly and follow through project-wide rather than testing only your own change."* Verification here is `npm run build` plus a scripted browser check, exactly as this incident was diagnosed.
- **The watchdog must not import anything.** An `import` statement is the failure mode it exists to report. It must be `is:inline` so Astro emits it verbatim rather than bundling it into the module graph.
- **CSP:** `netlify.toml` sets `script-src 'self' 'unsafe-inline'`. An inline `<script>` is allowed. Inline `onclick=` attributes are also technically allowed by `'unsafe-inline'`, but use `addEventListener` anyway — it matches the codebase and survives a future CSP tightening.
- **Escaping convention:** every script file defines its own tiny `esc()` helper rather than importing a shared one. This task builds DOM nodes with `textContent` instead, so no escaping helper is needed — do not add one.
- **Timeout value: 8000ms.** Long enough that a slow-but-working Supabase round trip on a cold connection never trips it; short enough to beat a user's patience.

---

### Task 1: Inline watchdog + its styles

**Files:**
- Modify: `src/pages/[neighborhood]/requests.astro` — add the inline script at the end of the file, next to the existing `<script src="../../scripts/requests-page.js">` tag
- Modify: `src/styles/directory.css` — add the `.calendar-load-error` block
- Test: none (no test framework in this project — see Global Constraints; verification is Steps 4–7)

**Interfaces:**
- Consumes: `#calendarGrid` and its `.request-loading` child, both declared in `requests.astro`'s calendar view container. Consumes nothing from `requests-page.js` — that is the point.
- Produces: nothing other tasks depend on. This is a standalone, single-task plan.

- [ ] **Step 1: Add the watchdog script**

At the very bottom of `src/pages/[neighborhood]/requests.astro`, directly after the existing line:

```astro
<script src="../../scripts/requests-page.js"></script>
```

add:

```astro
<!--
  Watchdog for a dead page script. requests-page.js imports supabase.js,
  auth.js, calendar.js, modal-a11y.js and ui-feedback.js at the top; if any
  one of those imports fails, not a single line of the file runs and the
  static "Loading calendar…" placeholder below sits there forever, which
  reads as a hang rather than a failure. This script imports nothing, so the
  failure it reports cannot also disable it. On a healthy page renderCalendar()
  clears the placeholder within milliseconds and this never fires.
  See docs/superpowers/specs/2026-08-15-calendar-blank-module-failure-design.md
-->
<script is:inline>
  setTimeout(function () {
    var grid = document.getElementById('calendarGrid');
    if (!grid || !grid.querySelector('.request-loading')) return;

    var box = document.createElement('div');
    box.className = 'calendar-load-error';
    box.setAttribute('role', 'alert');

    var head = document.createElement('strong');
    head.textContent = "The calendar didn't load.";

    var body = document.createElement('p');
    body.textContent =
      'The page script failed to run, so no requests could be fetched. A refresh usually clears this.';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Reload page';
    btn.addEventListener('click', function () {
      location.reload();
    });

    box.appendChild(head);
    box.appendChild(body);
    box.appendChild(btn);

    grid.innerHTML = '';
    grid.appendChild(box);
  }, 8000);
</script>
```

- [ ] **Step 2: Add the styles**

Append to `src/styles/directory.css`:

```css
/* Shown only when the page script never executed — see the watchdog in
   [neighborhood]/requests.astro. Spans the whole 7-column calendar grid. */
.calendar-load-error {
  grid-column: 1 / -1;
  padding: 32px 24px;
  text-align: center;
  color: var(--text);
  background: var(--off-white);
}

.calendar-load-error strong {
  display: block;
  margin-bottom: 6px;
  font-size: 1.05rem;
  color: var(--masters-green);
}

.calendar-load-error p {
  margin: 0 auto 16px;
  max-width: 42ch;
  font-size: 0.9rem;
  color: var(--mid-gray);
}

.calendar-load-error button {
  padding: 9px 20px;
  font: inherit;
  font-weight: 600;
  color: var(--white);
  background: var(--masters-green);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease-out;
}

.calendar-load-error button:hover {
  background: var(--masters-green-mid);
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `[build] Complete!` with no errors.

- [ ] **Step 4: Verify the watchdog stays silent on a healthy page**

Start the dev server and drive it with a real browser. Save this to your scratchpad (**not** into the repo — Playwright is deliberately not a project dependency; resolve it from the npx cache):

```js
// probe.mjs — throwaway diagnostic, do not commit
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(process.argv[2], { waitUntil: 'networkidle', timeout: 30000 });
await p.waitForTimeout(10000); // outlast the 8s watchdog
console.log('monthLabel:', await p.locator('#currentMonthLabel').textContent());
console.log('cells     :', await p.locator('#calendarGrid .calendar-cell').count());
console.log('errorBox  :', await p.locator('.calendar-load-error').count());
await b.close();
```

Run:
```bash
npm run dev &
node probe.mjs "http://localhost:4321/onion-creek/requests/"
```

Expected — the watchdog must **not** have fired:
```
monthLabel: August 2026     (the real current month, never "May 2026")
cells     : 42
errorBox  : 0
```

- [ ] **Step 5: Verify the watchdog fires when the script is dead**

Simulate the failure by blocking the page script, then reload:

```js
await p.route('**/requests-page.js', (r) => r.abort());
```

Insert that line immediately before the `p.goto(...)` call in `probe.mjs` and re-run.

Expected — the failure is now visible instead of a permanent placeholder:
```
monthLabel: May 2026        (static placeholder — correct, no JS ran)
cells     : 0
errorBox  : 1
```

- [ ] **Step 6: Verify it renders correctly by eye**

Open `http://localhost:4321/onion-creek/requests/` in a real browser with DevTools → Network → check "Block request URL" on `requests-page.js`, and reload. Confirm the error block is centered across the full grid width, the heading uses the neighborhood's green, and "Reload page" actually reloads.

- [ ] **Step 7: Commit**

```bash
git add src/pages/\[neighborhood\]/requests.astro src/styles/directory.css docs/superpowers/plans/2026-08-15-calendar-load-watchdog.md docs/superpowers/specs/2026-08-15-calendar-blank-module-failure-design.md
git commit -m "fix: surface a dead requests-page script instead of hanging on 'Loading calendar…'"
```

---

## Self-review

**Spec coverage.** The findings doc asks for exactly one behavioural change — make a dead module legible rather than silent — and Task 1 delivers it, with both the healthy path (Step 4) and the failure path (Step 5) verified. The findings doc's other two outputs are documentation, already written, and a `HANDOFF.md` landmine cross-reference, folded into Step 7's commit.

**Placeholders.** None. Every step carries the literal code or command to run, with exact expected output.

**Type consistency.** The only shared identifiers are DOM contracts: `#calendarGrid`, `.request-loading` and `#currentMonthLabel` are used here exactly as `requests.astro` declares them and as `requests-page.js` reads them. `.calendar-load-error` is introduced in Step 1 and styled under the same name in Step 2.

**Known limitation, accepted deliberately.** The watchdog detects "the placeholder is still there", not "the module failed". If `requests-page.js` runs but throws *after* `renderCalendar()` clears the placeholder, the watchdog stays quiet. That is correct: at that point the calendar is on screen and the failure is a different bug with different symptoms. Widening this into a general error reporter is out of scope and would need a real client-side error channel.
