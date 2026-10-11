# ProvisionHub – Security Audit (Phase 13)

**Store:** CF Foods and Beverages  
**Date:** October 2026  
**Status:** Reviewed

---

## 1. Authentication

| Check | Status | Notes |
|-------|--------|-------|
| Firebase Authentication (Email/Password) | ✅ | No passwords stored in Firestore |
| Password reset via email | ✅ | Firebase built-in |
| Change password requires re-auth | ✅ | Implemented in auth.js |
| Inactive users blocked | ✅ | status == 'active' required |
| Session redirect if not logged in | ✅ | Auth.init() on every protected page |

**Recommendations**
- Use a strong admin password (min 12 characters, mixed).
- Enable Firebase App Check later for production if abuse appears.
- Optionally enable Multi-factor Authentication for the CEO/admin account.

---

## 2. Role-Based Access Control

| Role | Can do | Cannot do |
|------|--------|-----------|
| **Cashier** | POS, view products, customers (basic), own sales | Delete products, purchases, expenses, returns, reports, users, settings |
| **Manager** | Most operations including purchases, expenses, returns, reports | User management, critical settings, hard-delete some records |
| **Admin** | Everything | — |

Enforced in:
- Firestore Security Rules (`firebase/firestore.rules`)
- Client-side UI (`data-role` attributes + Auth.hasRole)

**Note:** Client-side checks improve UX only. Real security is in Firestore Rules.

---

## 3. Firestore Security Rules

| Collection | Read | Create | Update | Delete |
|------------|------|--------|--------|--------|
| users | Own / Admin | Admin | Own (limited) / Admin | Admin |
| settings | Cashier+ | Admin | Admin | Admin |
| categories | Cashier+ | Manager+ | Manager+ | Admin |
| products | Cashier+ | Manager+ | Manager+ | Manager+ |
| customers | Cashier+ | Cashier+ | Cashier+ | Manager+ |
| suppliers | Manager+ | Manager+ | Manager+ | Admin |
| sales | Cashier+ | Cashier+ | Manager+ | Admin |
| sale_items | Cashier+ | Cashier+ | Manager+ | Manager+ |
| purchases | Manager+ | Manager+ | Manager+ | Admin |
| inventory_movements | Cashier+ | Cashier+ | Admin | Admin |
| expenses | Manager+ | Manager+ | Manager+ | Admin |
| returns | Manager+ | Manager+ | Manager+ | Admin |
| audit_logs | Admin | Authenticated | ❌ | ❌ |

**Critical rules in place**
- No `allow read, write: if true`
- Default deny for unmatched paths
- Audit logs are append-only
- Cashiers cannot delete products or change settings

---

## 4. Firebase Storage Rules

| Path | Read | Write |
|------|------|-------|
| products/{id}/{file} | Authenticated | Authenticated, image only, max 5MB |
| settings/{file} | Authenticated | Authenticated, image only, max 2MB |
| uploads/{userId}/{file} | Authenticated | Own user only |

- Non-image files rejected by content-type check
- Size limits enforced

---

## 5. Data Protection Practices

| Practice | Status |
|----------|--------|
| Passwords never stored in Firestore | ✅ |
| Server timestamps for createdAt/updatedAt | ✅ |
| Inventory updates via transactions | ✅ |
| Sales do not delete original records on return | ✅ |
| Audit log for important actions | ✅ |
| Soft-delete preferred for products | ✅ |

---

## 6. Frontend / Config Security

| Check | Status | Action required |
|-------|--------|-----------------|
| Firebase API keys in client | ⚠️ Normal | API keys are public by design; security is in Rules |
| Placeholder config in repo | ✅ | Replace in `js/firebase-config.js` – do not commit real secrets to public repos if possible |
| HTTPS required | ✅ | Firebase Hosting serves HTTPS only |
| XSS | ⚠️ | Avoid injecting unsanitized user HTML; current UI mostly uses textContent / controlled templates |
| CSRF | ✅ | Firebase Auth tokens handle API auth |

**Important:** Even though the Firebase config object is visible in the browser, **Firestore Rules and Storage Rules** protect your data. Never set rules to public.

---

## 7. Deployment Checklist (Security)

1. [ ] Create Firebase project
2. [ ] Enable Email/Password authentication only (disable unused providers)
3. [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules`
4. [ ] Deploy Storage rules: `firebase deploy --only storage`
5. [ ] Deploy indexes: `firebase deploy --only firestore:indexes`
6. [ ] Create first admin via Console (see CREATE_FIRST_ADMIN.md)
7. [ ] Seed settings document (see SEED_SETTINGS.md)
8. [ ] Test that a Cashier account cannot open Users or Settings
9. [ ] Test that unauthenticated users cannot read any collection
10. [ ] Restrict Firebase Console access to trusted people only

---

## 8. Known Limitations (Client-Side App)

1. **Creating users from the client** signs in as the new user (Firebase limitation). Prefer creating users in Firebase Console, or use Cloud Functions + Admin SDK for production.
2. **Offline writes** queue until online; conflict resolution is last-write-wins for most fields.
3. **No field-level encryption** – sensitive data relies on Firebase security and HTTPS.
4. For maximum security later: add Cloud Functions for privileged operations (user creation, bulk deletes).

---

## 9. Audit Log Coverage

Recorded actions include:
- login / logout
- product create / update / delete
- sale / purchase / return / exchange
- expense create
- user create / status change
- inventory movements
- settings changes (when settings page is used)

Only **Admin** can read audit logs.

---

## 10. Sign-off

Rules and architecture are appropriate for a small-to-medium provisions store (CF Foods and Beverages) using Firebase.

Before go-live:
1. Deploy the security rules
2. Create the admin account
3. Test each role once
4. Keep the Firebase Console locked to the owner

**Phase 13 complete.**
