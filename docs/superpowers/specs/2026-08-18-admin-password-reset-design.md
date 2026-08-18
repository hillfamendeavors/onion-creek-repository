# Admin Password Reset Flow — Design Spec

## Context & Goal

Provide a secure, seamless password reset capability for administrators on the Trusted Neighbors platform. In accordance with security requirements, admins cannot arbitrarily reset their password without first requesting and clicking a verification link sent to their registered email address.

## User Experience & Architecture

### 1. Admin Login Screen (`src/layouts/AdminLayout.astro`)
- **Forgot Password Trigger**: In the unauthenticated admin login overlay (`#adminLoginOverlay`), add a "Forgot Password?" button below the password input.
- **View Toggle**: Clicking "Forgot Password?" hides the login form fields and reveals the `#adminForgotView` container within the same card.
  - Contains an email input (`#adminForgotEmail`, pre-populated with any email already typed in `#adminLoginEmail`).
  - Contains a "Send Reset Link" submit button (`#adminForgotBtn`).
  - Includes a "← Back to Log In" button (`#adminBackToLoginBtn`) to switch back without losing state.
- **Submission & Feedback**:
  - Submitting calls `requestPasswordReset(email)` from `src/lib/auth.js`.
  - Displays a clear inline success notification: *"Password reset email sent! Check your inbox to continue."*
  - Shows clear inline error messages for invalid/empty emails or network issues.

### 2. Logged-in Admin Sidebar Profile Card (`src/layouts/AdminLayout.astro`)
- **Reset Password Action**: In `.admin-user-card` (positioned between the displayed email address and the "Log Out" button), add a "Reset Password via Email" button (`#adminResetPasswordBtn`).
- **Confirmation Flow**: Clicking prompts a styled confirmation dialog (`confirmDialog('Send a password reset link to <email>?')`).
- **Execution & Feedback**: Upon confirmation, calls `requestPasswordReset(currentAdminEmail)` and triggers a toast notification via `showToast('Password reset link sent to your email')`.

### 3. Password Reset Landing & Success (`src/pages/reset-password.astro` & `src/scripts/reset-password.js`)
- **Verification Gate**: Access to the password reset form strictly requires an active Supabase recovery session (provided by clicking the one-time link in the email). Direct unauthenticated visits immediately fall back to `#invalidView` ("Link Invalid or Expired").
- **Password Form**: Validates that the new password is at least 6 characters and matches the confirmation input before calling `updatePassword(newPassword)`.
- **Success View**:
  - Displays confirmation: *"Password Updated — You can now log in with your new password."*
  - Provides dual actionable destination buttons:
    1. **"Go to Admin Portal →"** (`/admin/`)
    2. **"Return to Community Site"** (`/`)

## Error Handling & Edge Cases
- **Missing or Invalid Email**: Client-side validation prevents submission and provides immediate feedback.
- **Expired/Tampered Email Links**: Handled automatically by Supabase auth token verification; user sees `#invalidView` with a link to request a new reset.
- **Multiple Submissions**: Buttons are disabled and display a loading state (`"Sending…"`) to prevent race conditions and duplicate emails.

## Files Touched
- `src/layouts/AdminLayout.astro` — Login overlay toggle, sidebar reset button, auth handler scripts.
- `src/pages/reset-password.astro` — Success view CTAs with Admin Portal direct link.
- `src/scripts/reset-password.js` — Reset password handler logic (ensuring clean redirects and session handling).

## Verification Strategy
- Run `npm run build` to verify clean Astro compilation.
- Manual test in browser:
  1. Test toggle between Login and Forgot Password views on `/admin/`.
  2. Test sending reset email from login view with valid and invalid email inputs.
  3. Test logged-in admin "Reset Password" button in sidebar and verify confirmation prompt & toast.
  4. Verify `/reset-password/` access gate (blocked without token, active with token).
  5. Verify updated `#successView` links directing back to `/admin/` and `/`.
