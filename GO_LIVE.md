# CF Foods and Beverages – Go Live Guide

## Quick start (order of steps)

### 1. Firebase project
1. Go to https://console.firebase.google.com  
2. Create a project (e.g. `cf-foods-provisionhub`)  
3. Enable **Authentication → Email/Password**  
4. Create **Firestore** (start in production mode)  
5. Enable **Storage**

### 2. App configuration
1. Project Settings → Your apps → Add Web app  
2. Copy the `firebaseConfig` object  
3. Paste into `js/firebase-config.js` (replace placeholders)

### 3. Deploy security
```bash
npm install -g firebase-tools
firebase login
cd provisionhub
firebase use --add          # select your project
firebase deploy --only firestore:rules,storage,firestore:indexes
```

### 4. First admin
Follow **CREATE_FIRST_ADMIN.md**:
1. Create user in Authentication  
2. Create matching document in Firestore `users/{uid}` with `role: "admin"` and `status: "active"`

### 5. Business settings
Follow **SEED_SETTINGS.md** – create `settings/business` with store name, address, phone.

### 6. Host the app
```bash
firebase deploy --only hosting
```
You will get a URL like:  
`https://your-project.web.app`

Or for local testing:
```bash
npx serve .
```

### 7. Use the system
1. Login as admin  
2. Create categories and products  
3. Create cashier accounts for sales staff  
4. Start selling on POS  
5. CEO monitors from Dashboard on her phone  

---

## Store details (already in the app)

| Field | Value |
|-------|--------|
| Name | CF Foods and Beverages |
| Address | Nkwo Okija, Ihiala LGA, Anambra State |
| Phone | 08062686710 |

---

## Support files in this package

| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `CREATE_FIRST_ADMIN.md` | How to create the first admin |
| `SEED_SETTINGS.md` | Business settings document |
| `DATABASE_STRUCTURE.md` | Firestore collections |
| `SECURITY_AUDIT.md` | Security review |
| `TESTING_CHECKLIST.md` | Full test list |
| `OFFLINE_SUPPORT.md` | Offline behaviour |
| `firebase.json` | Deploy config |

---

## Modules delivered

| Phase | Module | Status |
|-------|--------|--------|
| 1 | Project structure + Firebase config | ✅ |
| 2 | Authentication + roles | ✅ |
| 3 | Firestore rules + indexes | ✅ |
| 4 | Products + categories | ✅ |
| 5 | Inventory | ✅ |
| 6 | POS + sales (part payments) | ✅ |
| 7 | Customers + suppliers | ✅ |
| 8 | Purchases | ✅ |
| 9 | Expenses | ✅ |
| 10 | Returns + Exchange | ✅ |
| 11 | Reports | ✅ |
| 12 | Receipt printing | ✅ |
| 13 | Security audit | ✅ |
| 14 | Testing & go-live | ✅ |

**ProvisionHub is complete and ready for your Firebase connection.**
