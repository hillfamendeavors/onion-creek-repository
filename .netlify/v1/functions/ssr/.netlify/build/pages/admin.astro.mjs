import { c as createAstro, d as createComponent, i as renderHead, r as renderTemplate, k as renderScript } from '../chunks/astro/server_CS2ok9BF.mjs';
import 'piccolore';
import 'clsx';
import { createClient } from '@supabase/supabase-js';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro("https://trustedneighbors.net");
const prerender = false;
const $$Admin = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Admin;
  const SUPABASE_URL = "https://dktjutawxktwhuhuwbit.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_mlELgE-THem4tud6GIQaZA_NjT9D2ZM";
  const accessToken = Astro2.cookies.get("sb-access-token")?.value;
  let isAdminSession = false;
  if (accessToken) {
    const authSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false }
    });
    const { data: { user }, error: userError } = await authSupabase.auth.getUser(accessToken);
    if (user && !userError) {
      const { data: isAdmin } = await authSupabase.rpc("is_admin");
      if (isAdmin) {
        isAdminSession = true;
      }
    }
  }
  return renderTemplate`<html lang="en" data-astro-cid-2zp6q64z> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="robots" content="noindex, nofollow"><title>Service Requests — Admin</title><link rel="icon" type="image/svg+xml" href="/favicon.svg">${renderHead()}</head> <body data-astro-cid-2zp6q64z> ${!isAdminSession ? renderTemplate`<div id="loginView" data-astro-cid-2zp6q64z> <h1 data-astro-cid-2zp6q64z>Admin Login</h1> <input type="email" class="input" id="loginEmail" placeholder="Email Address" autocomplete="username" data-astro-cid-2zp6q64z> <input type="password" class="input" id="loginPassword" placeholder="Password" autocomplete="current-password" data-astro-cid-2zp6q64z> <button id="loginBtn" class="btn-primary" data-astro-cid-2zp6q64z>Authenticate</button> <p id="loginError" data-astro-cid-2zp6q64z></p> </div>` : renderTemplate`<div id="appView" data-astro-cid-2zp6q64z> <div class="topbar" data-astro-cid-2zp6q64z> <h1 data-astro-cid-2zp6q64z>Trusted Neighbors <span style="color:var(--color-accent)" data-astro-cid-2zp6q64z>Operations</span></h1> <div class="topbar-right" data-astro-cid-2zp6q64z> <button id="logoutBtn" class="btn-secondary" data-astro-cid-2zp6q64z>Log Out</button> </div> </div> <div class="container" data-astro-cid-2zp6q64z> <div class="tabs-container" data-astro-cid-2zp6q64z> <div class="tabs" data-astro-cid-2zp6q64z> <button class="tab-btn active" id="tabRequestsBtn" data-astro-cid-2zp6q64z>Service Requests</button> <button class="tab-btn" id="tabReferralsBtn" data-astro-cid-2zp6q64z>Referral Suggestions</button> <button class="tab-btn" id="tabDirectoryBtn" data-astro-cid-2zp6q64z>Directory Config</button> </div> </div> <div id="tab-requests" data-astro-cid-2zp6q64z> <div class="filters" data-astro-cid-2zp6q64z> <select id="filterNeighborhood" class="select-input" data-astro-cid-2zp6q64z><option value="" data-astro-cid-2zp6q64z>All Neighborhoods</option></select> <select id="filterCategory" class="select-input" data-astro-cid-2zp6q64z><option value="" data-astro-cid-2zp6q64z>All Categories</option></select> <select id="filterStatus" class="select-input" data-astro-cid-2zp6q64z> <option value="" data-astro-cid-2zp6q64z>All Statuses</option> <option value="new" data-astro-cid-2zp6q64z>New</option> <option value="contacted" data-astro-cid-2zp6q64z>Contacted</option> <option value="closed" data-astro-cid-2zp6q64z>Closed</option> </select> </div> <div class="card" data-astro-cid-2zp6q64z> <div class="table-scroll" data-astro-cid-2zp6q64z> <table data-astro-cid-2zp6q64z> <thead data-astro-cid-2zp6q64z> <tr data-astro-cid-2zp6q64z> <th class="sortable" data-sort="created_at" data-astro-cid-2zp6q64z>Submitted <span class="arrow" data-astro-cid-2zp6q64z></span></th> <th data-astro-cid-2zp6q64z>Neighborhood</th> <th data-astro-cid-2zp6q64z>Category</th> <th class="sortable" data-sort="date_needed" data-astro-cid-2zp6q64z>Date Needed <span class="arrow" data-astro-cid-2zp6q64z></span></th> <th data-astro-cid-2zp6q64z>Name</th> <th data-astro-cid-2zp6q64z>Phone</th> <th data-astro-cid-2zp6q64z>Email</th> <th data-astro-cid-2zp6q64z>Notes</th> <th data-astro-cid-2zp6q64z>Status</th> <th data-astro-cid-2zp6q64z>Actions</th> </tr> </thead> <tbody id="requestsBody" data-astro-cid-2zp6q64z></tbody> </table> </div> </div> </div> <div id="tab-referrals" style="display:none;" data-astro-cid-2zp6q64z> <div class="filters" data-astro-cid-2zp6q64z> <select id="filterRefNeighborhood" class="select-input" data-astro-cid-2zp6q64z><option value="" data-astro-cid-2zp6q64z>All Neighborhoods</option></select> <select id="filterRefStatus" class="select-input" data-astro-cid-2zp6q64z> <option value="" data-astro-cid-2zp6q64z>All Statuses</option> <option value="new" data-astro-cid-2zp6q64z>New</option> <option value="approved" data-astro-cid-2zp6q64z>Approved</option> <option value="rejected" data-astro-cid-2zp6q64z>Rejected</option> </select> </div> <div class="card" data-astro-cid-2zp6q64z> <div class="table-scroll" data-astro-cid-2zp6q64z> <table data-astro-cid-2zp6q64z> <thead data-astro-cid-2zp6q64z> <tr data-astro-cid-2zp6q64z> <th data-astro-cid-2zp6q64z>Submitted</th> <th data-astro-cid-2zp6q64z>Neighborhood</th> <th data-astro-cid-2zp6q64z>Business / Person</th> <th data-astro-cid-2zp6q64z>Category</th> <th data-astro-cid-2zp6q64z>Phone</th> <th data-astro-cid-2zp6q64z>Referrer</th> <th data-astro-cid-2zp6q64z>Referrer Email</th> <th data-astro-cid-2zp6q64z>Note</th> <th data-astro-cid-2zp6q64z>Status</th> <th data-astro-cid-2zp6q64z>Actions</th> </tr> </thead> <tbody id="referralsBody" data-astro-cid-2zp6q64z></tbody> </table> </div> </div> </div> <div id="tab-directory" style="display:none;" data-astro-cid-2zp6q64z> <div class="dir-subtabs" style="margin-bottom: var(--space-lg);" data-astro-cid-2zp6q64z> <button class="btn-secondary active" id="subTabCategoriesBtn" style="background:var(--color-border); border-color:var(--color-border)" data-astro-cid-2zp6q64z>Categories</button> <button class="btn-secondary" id="subTabListingsBtn" data-astro-cid-2zp6q64z>Listings</button> </div> <div id="dir-categories" data-astro-cid-2zp6q64z> <div style="margin-bottom: var(--space-md); text-align: right;" data-astro-cid-2zp6q64z> <button class="btn-primary" id="addGroupBtn" style="width: auto;" data-astro-cid-2zp6q64z>+ Add Group</button> </div> <div id="groupsList" data-astro-cid-2zp6q64z></div> </div> <div id="dir-listings" style="display:none;" data-astro-cid-2zp6q64z> <select id="dirNeighborhood" class="select-input" style="margin-bottom: var(--space-md);" data-astro-cid-2zp6q64z></select> <div id="listingsBySubcat" data-astro-cid-2zp6q64z></div> </div> </div> </div> </div>`} ${renderScript($$result, "C:/Users/marco/Documents/projects/onion-creek-repository/src/pages/admin.astro?astro&type=script&index=0&lang.ts")} ${renderScript($$result, "C:/Users/marco/Documents/projects/onion-creek-repository/src/pages/admin.astro?astro&type=script&index=1&lang.ts")} </body> </html>`;
}, "C:/Users/marco/Documents/projects/onion-creek-repository/src/pages/admin.astro", void 0);

const $$file = "C:/Users/marco/Documents/projects/onion-creek-repository/src/pages/admin.astro";
const $$url = "/admin/";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Admin,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
