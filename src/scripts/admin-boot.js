// Shared bootstrap contract for admin CMS pages.
//
// Astro's ClientRouter (view transitions) only ever executes a page's
// `<script src>` once per navigation into it — after that, state changes are
// driven by re-dispatching events (`astro:page-load` on every navigation,
// `admin-auth-verified` once login is confirmed), not by re-running the
// module. Every admin script used to call its own `init*()` once at module
// scope *and* wire it to both of those events — so a page landed on
// directly at load time ran init three times, and any event listener
// attached inside init multiplied right along with it. That's what turned
// one Add Listing click into 4 inserted rows in the Directory CMS.
//
// bootAdminPage() separates the two things init() used to conflate:
//   - `wire`: attaches DOM event listeners. Must run exactly once per DOM
//     node, or listeners stack up. Guarded with a marker on the node itself
//     (not a module-level flag) because a fresh navigation back to a
//     non-persisted page produces a brand-new node with no marker — while a
//     module-level flag would stay set forever after the first run and
//     silently skip wiring the new node's real elements.
//   - `load`: fetches data and renders. Safe, and sometimes necessary, to
//     repeat (e.g. after auth resolves) — but concurrent calls (module init
//     and the near-simultaneous initial `astro:page-load` firing before the
//     first fetch resolves) are coalesced into one in-flight promise so the
//     same page load doesn't fire the same query twice.
export function bootAdminPage(rootId, { wire, load } = {}) {
  function run() {
    const root = document.getElementById(rootId);
    if (!root) return;

    if (wire && !root.dataset.tnWired) {
      root.dataset.tnWired = '1';
      wire(root);
    }

    if (load) {
      if (root._tnLoadPromise) return root._tnLoadPromise;
      const p = Promise.resolve(load(root)).finally(() => {
        if (root._tnLoadPromise === p) root._tnLoadPromise = null;
      });
      root._tnLoadPromise = p;
      return p;
    }
  }

  document.addEventListener('astro:page-load', run);
  window.addEventListener('admin-auth-verified', run);
  run();
}

// Binds `handler` for `type` on `el` at most once for that element's
// lifetime. Needed for anything marked `transition:persist` (the admin
// sidebar): a persisted node survives client-side navigation, so re-wiring
// it on every `astro:page-load` — the way every admin page's own content
// already had to, since ITS nodes are recreated per navigation — stacks up
// duplicate listeners on the *same* node instead. That's how the sidebar's
// Reset Password button ended up sending duplicate reset emails after a
// couple of tab switches.
export function bindOnce(el, type, handler) {
  if (!el) return;
  const key = `tnBound_${type}`;
  if (el[key]) return;
  el[key] = true;
  el.addEventListener(type, handler);
}
