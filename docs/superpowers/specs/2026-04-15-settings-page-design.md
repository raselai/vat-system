# Settings Page — Design Spec

**Date:** 2026-04-15  
**Status:** Approved

---

## Overview

Add a `/settings` page to replace the dead-end nav item. Two tabs: **Profile** (all roles) and **Company** (admin only). Team Members tab deferred pending email service implementation.

---

## Architecture

### Server

One new endpoint:

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `PUT` | `/api/v1/auth/me` | `authenticate` | Update logged-in user's `fullName` and `email` |

- Validates email format and uniqueness against other users.
- No company scope — user profile is global.
- `PUT /api/v1/companies/:id` already exists; no server changes needed for Company tab.

### Client — New Files

| File | Purpose |
|------|---------|
| `client/src/pages/settings/SettingsPage.tsx` | Tabbed container; renders Profile tab always, Company tab only if `isAdmin` |
| `client/src/pages/settings/ProfileTab.tsx` | Name + email form |
| `client/src/pages/settings/CompanyTab.tsx` | Company edit form with BIN locked |

### Client — Modified Files

| File | Change |
|------|--------|
| `client/src/App.tsx` | Add `<Route path="settings" element={<SettingsPage />} />` |
| `client/src/contexts/AuthContext.tsx` | Add `updateUser(patch: Partial<User>)` method to sync state after profile save |

---

## Profile Tab

- **Visible to:** all roles (admin and operator)
- **Fields:**
  - Full Name — required, min 2 characters, pre-filled from `useAuth().user.fullName`
  - Email — required, valid email format, pre-filled from `useAuth().user.email`
- **Submit:** `PUT /api/v1/auth/me` with `{ fullName, email }`
- **On success:** call `updateUser({ fullName, email })` in `AuthContext` so the header reflects the change without a page reload. Show Ant Design `message.success`.
- **On error:** show `message.error` with the server's error string.
- **Button:** "Save Changes", disabled while loading.

---

## Company Tab

- **Visible to:** admin only. Tab is not rendered at all for operator role.
- **Data source:** `GET /api/v1/companies/:activeCompanyId` on mount
- **Fields:**

| Field | Type | Editable | Validation |
|-------|------|----------|------------|
| Company Name | text input | yes | required, min 2 |
| BIN | read-only text | no | displayed only |
| Address | textarea | yes | required, min 5 |
| Challan Prefix | text input | yes | optional |
| Fiscal Year Start Month | number input | yes | 1–12 |

- **Submit:** `PUT /api/v1/companies/:activeCompanyId`
- **On success:** call `setActiveCompany()` in `CompanyContext` with the updated values so the header company name updates immediately. Show `message.success`.
- **On error:** show `message.error`.
- **Button:** "Save Changes", disabled while loading.

---

## Routing

Add inside the authenticated `AppLayout` route in `App.tsx`:

```tsx
<Route path="settings" element={<SettingsPage />} />
```

No sub-routes needed. Tab selection is local state in `SettingsPage`.

---

## Out of Scope (this iteration)

- Password change — deferred pending email service
- Team Members tab — deferred pending email invitation system
- User status management
