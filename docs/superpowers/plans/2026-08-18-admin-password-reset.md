# Admin Password Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a secure password reset capability for administrators on the login screen and in the dashboard sidebar, enforcing that passwords can only be reset after clicking the confirmation link sent to their email.

**Architecture:** Extend `AdminLayout.astro` with an inline view-toggle for "Forgot Password?" on the unauthenticated login card and a "Reset Password via Email" button with confirmation modal on the authenticated sidebar. Utilize Supabase's `requestPasswordReset()` and `/reset-password/` recovery session gate, updating `/reset-password/` with an immediate CTA returning to `/admin/`.

**Tech Stack:** Astro 5, Vanilla JS, Supabase JS client v2, CSS custom properties.

## Global Constraints
- Passwords must be at least 6 characters.
- Resetting a password can ONLY happen through a valid email recovery session (gated by Supabase recovery tokens).
- Maintain existing vanilla JS and scoped DOM conventions in `AdminLayout.astro` and `reset-password.js`.

---

### Task 1: Add "Forgot Password?" Toggle and Email Request on Admin Login Card

**Files:**
- Modify: `src/layouts/AdminLayout.astro`

**Interfaces:**
- Consumes: `requestPasswordReset(email)` from `src/lib/auth.js`
- Produces: `#adminForgotView`, `#adminForgotBtn`, `#adminBackToLoginBtn`, `#adminForgotPasswordToggle`

- [ ] **Step 1: Update the Admin Login Overlay HTML in `src/layouts/AdminLayout.astro`**
  Add the "Forgot Password?" link button under the password input in `#adminLoginForm`, and add the `#adminForgotView` container with `#adminForgotEmail`, `#adminForgotBtn`, `#adminForgotSuccess`, `#adminForgotError`, and `#adminBackToLoginBtn`.

- [ ] **Step 2: Add CSS styles for the toggle transitions and helper text in `src/layouts/AdminLayout.astro`**
  Ensure styling matches the clean design system tokens (`--color-primary`, `--color-border`, etc.).

- [ ] **Step 3: Update `wireAuthListeners()` in `src/layouts/AdminLayout.astro` to handle view switching and reset submission**
  Add event listeners for:
  - Clicking `#adminForgotPasswordToggle`: Hides `#adminLoginForm`, shows `#adminForgotView`, transfers email value from `#adminLoginEmail` to `#adminForgotEmail`.
  - Clicking `#adminBackToLoginBtn`: Reverses the toggle back to `#adminLoginForm`.
  - Submitting `#adminForgotForm`: Validates email, calls `requestPasswordReset(email)`, disables `#adminForgotBtn` with `"Sending…"`, displays success or error notice.

- [ ] **Step 4: Verify compilation**
  Run: `npm run build`
  Expected: Build succeeds without template syntax errors.

- [ ] **Step 5: Commit**
  ```bash
  git add src/layouts/AdminLayout.astro
  git commit -m "feat(admin): add forgot password flow to admin login overlay"
  ```

---

### Task 2: Add "Reset Password via Email" Button to Logged-in Admin Sidebar

**Files:**
- Modify: `src/layouts/AdminLayout.astro`

**Interfaces:**
- Consumes: `requestPasswordReset(email)` from `src/lib/auth.js`, `showToast(msg, isError)` and `confirmDialog(msg)` from `src/scripts/ui-feedback.js` (or inline helpers)
- Produces: `#adminResetPasswordBtn` inside `.admin-user-card`

- [ ] **Step 1: Add the Reset Password button to `.admin-user-card` in `src/layouts/AdminLayout.astro`**
  Place `#adminResetPasswordBtn` directly above `#adminLogoutBtn` with icon and styling consistent with secondary action buttons.

- [ ] **Step 2: Add event handling in `src/layouts/AdminLayout.astro` for the sidebar reset button**
  When `#adminResetPasswordBtn` is clicked:
  - Retrieve the active admin email from the session / DOM (`#adminUserEmail.textContent`).
  - Open a confirmation prompt using `confirmDialog("Send a password reset link to your email (" + email + ")?")`.
  - On confirm: Call `requestPasswordReset(email)`, show toast `"Password reset link sent to your email"`, and disable button temporarily for 5 seconds to prevent spamming.

- [ ] **Step 3: Verify compilation**
  Run: `npm run build`
  Expected: Build succeeds.

- [ ] **Step 4: Commit**
  ```bash
  git add src/layouts/AdminLayout.astro
  git commit -m "feat(admin): add reset password action to admin sidebar profile card"
  ```

---

### Task 3: Enhance Password Reset Landing Page with Admin Navigation

**Files:**
- Modify: `src/pages/reset-password.astro`
- Modify: `src/scripts/reset-password.js`

**Interfaces:**
- Consumes: `supabase.auth.getSession()`, `updatePassword(newPassword)`
- Produces: `#successView` with dual CTAs ("Go to Admin Portal" and "Return to Site")

- [ ] **Step 1: Update `#successView` in `src/pages/reset-password.astro`**
  Update the buttons in `#successView` to include:
  - A primary button link to `/admin/` ("Go to Admin Portal →")
  - A secondary link to `/` ("Return to Community Site")

- [ ] **Step 2: Verify `src/scripts/reset-password.js` session security gate**
  Ensure that when a user arrives at `/reset-password/` without clicking the email recovery link, `supabase.auth.getSession()` cleanly hides `#resetView` and shows `#invalidView`.

- [ ] **Step 3: Verify compilation**
  Run: `npm run build`
  Expected: Clean build.

- [ ] **Step 4: Commit**
  ```bash
  git add src/pages/reset-password.astro src/scripts/reset-password.js
  git commit -m "feat(auth): enhance reset password success view with admin portal shortcut"
  ```

---

### Task 4: Full Verification & Walkthrough

- [ ] **Step 1: Execute production build**
  Run: `npm run build`
  Expected: Zero build errors across all Astro pages and endpoints.

- [ ] **Step 2: Manual End-to-End Verification**
  - Verify toggling from Admin Login to Forgot Password and back.
  - Verify email validation on Forgot Password form.
  - Verify sidebar Reset Password confirmation and notification.
  - Verify `/reset-password/` gate and success screen.
