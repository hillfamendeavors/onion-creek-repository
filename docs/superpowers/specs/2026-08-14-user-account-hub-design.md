# Design Spec — User Account Hub & Profile Customization

**Date**: 2026-08-14  
**Status**: Approved by User  
**Target Surface**: User Account Dashboard (`/login/` when authenticated)

---

## 1. Executive Summary

Transform the basic user account view at `/login/` into a full-featured, community-centered **User Account Hub**. This dashboard empowers registered neighbors to:
1. Custom-configure their profile with a custom avatar image upload (with default generated avatar options) and primary neighborhood affiliation.
2. Track and manage their **Service Requests** with full lifecycle status controls and a direct `+ New Request` modal.
3. Maintain a personal **Saved Recommendations** list ("My Trusted List") of bookmarked local service providers.
4. Track their submitted **Referral Suggestions** and moderation status.
5. Manage account settings and contact preferences.

---

## 2. Core Capabilities & User Experience

### 2.1 Profile & Hero Banner Section
- **Avatar Image Upload & Preview**:
  - Allows users to upload an avatar image directly from their device.
  - Generates a real-time client-side preview thumbnail (DataURL / LocalStorage / Supabase user metadata avatar_url).
  - Defaults to a high-quality neighborhood avatar illustration or initial badge if no custom image is uploaded.
- **Primary Neighborhood Selection**:
  - Dropdown options: *Avery Ranch*, *Circle C*, *Onion Creek*, *Sunfield*.
  - Displays a verified neighborhood pill badge (e.g., `Verified Onion Creek Neighbor`).
  - Sets the default neighborhood context across the directory navigation.
- **Quick Action Bar**:
  - `+ Post Service Request` button (triggers direct modal).
  - `Log Out` button.

### 2.2 Tabbed Dashboard Architecture
1. **📋 My Service Requests**:
   - Lists user's submitted requests.
   - Status indicators (`New`, `Contacted`, `Completed`).
   - Actions: `✓ Mark Completed`, `↺ Reopen`, `+ Post New Request`.
2. **🔖 Saved Recommendations ("My Trusted List")**:
   - Displays bookmarked directory listings saved from public neighborhood pages.
   - Cards display Business Name, Category, Neighborhood, Phone, and quick actions (`Call`, `Visit Website`, `Remove`).
3. **✍️ My Referral Suggestions**:
   - Lists business recommendations submitted by the neighbor.
   - Moderation status (`Under Review`, `Approved & Published`, `Rejected`).
4. **⚙️ Account Settings**:
   - Edit Full Name, Phone Number, Primary Neighborhood, and Avatar Upload.

---

## 3. Data Models & State Persistence

### Profile Metadata Schema (`profiles` / `auth.users` metadata):
- `full_name`: string
- `phone`: string
- `neighborhood_slug`: string (`avery-ranch` | `circle-c` | `onion-creek` | `sunfield`)
- `avatar_url`: string (Base64 DataURL or URL)
- `saved_listings`: array of listing IDs or objects

---

## 4. UI/UX & Design Standards (Impeccable Operate Mode)
- **Typography**: `EB Garamond` for headers, `Source Sans 3` for body/data.
- **Color Palette**: Forest Green (`#064E3B`), Gold (`#D97706`), Off-White background (`#F8FAFC`), Slate borders (`#E2E8F0`).
- **Responsive**: 2-column grid layout on desktop, single-column responsive stack on mobile.
