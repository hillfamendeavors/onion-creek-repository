# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are residents of specific Austin-area neighborhoods (Avery Ranch, Circle C, Onion Creek, Sunfield) looking for trustworthy local service providers (plumbers, electricians, landscapers, etc.) via recommendations from their actual neighbors, not algorithmic or paid listings.

A second workflow is emerging: any neighbor (not specifically local businesses) can post that they need a given service on a specific date, and any other registered neighbor can browse open requests and reach out directly — whether they run the business themselves or just want to refer someone they trust.

## Product Purpose

A neighbor-sourced local business directory: authentic, community-recommended businesses per neighborhood, with no sponsored ads and no fake reviews. It's expanding from a static directory of recommendations into a light two-way marketplace, where neighbors can also post "I need X service on this date" and be found by people able to help.

## Positioning

100% neighbor-sourced — every listing and review traces back to a real neighbor's recommendation, unlike Yelp/Google/Nextdoor's algorithmic rankings or paid placements. The service-request feature extends this: it's neighbors helping neighbors find help, not a lead-gen marketplace open to the general public.

## Operating Context

- Statically generated (Astro) site deployed on Netlify, one production domain (trustedneighbors.net) plus three sibling neighborhood sub-experiences on the same domain.
- Supabase (Postgres + Auth) backs the service-request feature: request data, admin auth, and (in progress) public user accounts for posting/viewing requests.
- Resend sends transactional email notifications (admin alerts on new requests today; likely referral-form notifications next).
- A single admin (Seth Hill, hillfamendeavors@gmail.com) currently manages Netlify, the domain, and moderates/triages requests via a dedicated `/admin/` page distinct from public accounts.
- Existing "Suggest a Referral" submissions go through Formspree today; migrating that to Resend is planned as a separate, smaller piece of work.

## Capabilities and Constraints

- No JS framework beyond Astro's static templating; interactivity is hand-written vanilla JS, not React/Vue/etc. — keep new UI consistent with that (no new framework dependency).
- No general backend/API layer — Supabase is accessed directly from the browser via its public anon key, gated by Postgres Row Level Security, not custom server endpoints (aside from the one Netlify Function used for email notifications).
- Public user registration/login is a new capability being introduced now (previously the only account was the single admin's). Regular registered users must NOT get admin privileges (edit/delete any request, access `/admin/`) — only the one admin email does.
- Anonymous (logged-out) visitors must never see requester-identifying data (name, phone, email) for service requests — only aggregate counts. This is an explicit, confirmed constraint, not a default to relax later without asking.
- Terminology: a "neighborhood" is one of the four served communities, each with its own themed page/URL slug; a "listing" is a recommended business; a "request" is a neighbor's post asking for a given service category on a given date.

## Brand Commitments

- Name: "Trusted Neighbors" (site-wide), with each neighborhood page branded as "<Neighborhood> Directory" / "<Neighborhood> YP".
- Tagline: "hyper-local · 100% neighbor-sourced referrals."
- Each neighborhood has its own accent color theme (defined in `src/data/neighborhoods.js`) layered on a shared forest-green/gold "Trusted Neighbors" identity (seen on the home page) — preserve per-neighborhood theming, don't flatten it to one global palette.
- Logo: a rounded gold square badge with a dark green "T," used as the favicon (`public/favicon.svg`) and in the home page nav.

## Evidence on Hand

- Real business listings and neighbor testimonials already live in `src/data/*.json` per neighborhood — do not fabricate additional listings, reviews, or businesses.
- No user research, personas, or analytics beyond Google Analytics wiring — audience understanding above is inferred from the product's existing structure and the site owner's direct input, not formal research.

## Product Principles

1. Every piece of content traces back to a real neighbor — never synthesize listings, reviews, or requests.
2. Static-first: prefer plain HTML/CSS/JS and Supabase's client-side capabilities (RLS, Auth) over adding a server/API layer, unless a task genuinely requires server-side secrecy (e.g. the Resend email key).
3. Privacy is deliberate, not accidental: anonymous visitors see aggregates only; identifying data requires a real, registered account.
4. One human admin, not a role hierarchy — keep admin-gating simple (email match) rather than building general-purpose roles/permissions infrastructure until there's a second admin.
5. Each neighborhood keeps its own visual identity within one shared brand — don't collapse per-neighborhood theming for convenience.

## Accessibility & Inclusion

No formal accessibility standard has been established for this project; no specific user needs have been confirmed beyond ordinary web usability.
