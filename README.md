# ProvisionHub

**Status: ALL PHASES COMPLETE (1–14)** · CF Foods and Beverages
 – CF Food and Beverages

**Cloud-based Provisions Sales, POS & Inventory Management System**

**Store Details:**
- **Business Name:** CF Food and Beverages
- **Address:** Nkwo Okija, Ihiala LGA, Anambra State
- **Phone:** 08062686710

Built entirely with Firebase (Authentication, Firestore, Storage, Hosting).  
No local servers, no MySQL, no PHP, no XAMPP required.

---

## Features

- Secure role-based authentication (Admin, Manager, Cashier)
- Complete Point of Sale (POS) system
- Product & Category management with image upload
- Real-time Inventory tracking & movements
- Purchase management from suppliers
- Customer management with credit sales
- Expense tracking
- Returns & Refunds
- Expiry date management (critical for provisions)
- Professional Dashboard with live statistics
- Comprehensive Reports with CSV export
- Receipt printing
- Audit logging
- Fully responsive (mobile, tablet, desktop)

---

## Technology Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Frontend       | HTML5, CSS3, Bootstrap 5, Vanilla JS, Font Awesome |
| Authentication | Firebase Authentication             |
| Database       | Cloud Firestore                     |
| File Storage   | Firebase Storage                    |
| Hosting        | Firebase Hosting                    |

---

## Project Structure

```
provisionhub/
├── index.html              # Landing page
├── login.html              # Login / Password reset
├── dashboard.html          # Main dashboard
├── pos.html                # Point of Sale
├── products.html           # Product management
├── inventory.html          # Inventory movements
├── sales.html              # Sales history
├── purchases.html          # Purchase orders
├── customers.html          # Customer management
├── suppliers.html          # Supplier management
├── expenses.html           # Expense tracking
├── returns.html            # Returns & refunds
├── reports.html            # All reports
├── settings.html           # Business settings
├── users.html              # User management
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   └── images/
├── js/
│   ├── firebase-config.js  # ← PASTE YOUR FIREBASE CONFIG HERE
│   ├── auth.js
│   ├── dashboard.js
│   ├── products.js
│   ├── inventory.js
│   ├── pos.js
│   ├── sales.js
│   ├── purchases.js
│   ├── customers.js
│   ├── suppliers.js
│   ├── expenses.js
│   ├── returns.js
│   ├── reports.js
│   └── settings.js
├── firebase/
│   ├── firestore.rules
│   ├── storage.rules
│   └── firestore.indexes.json
└── README.md
```

---

## Setup Instructions

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project**
3. Enter project name (e.g. `provisionhub`)
4. Disable Google Analytics (optional) or enable it
5. Click **Create project**

### 2. Enable Authentication

1. In Firebase Console → **Authentication** → **Get started**
2. Click **Sign-in method** tab
3. Enable **Email/Password**
4. Save

### 3. Create Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Start in **production mode**
3. Choose a location closest to your users (e.g. `europe-west2` or `us-central1`)
4. Enable

### 4. Create Storage

1. Go to **Storage** → **Get started**
2. Start in **production mode**
3. Use the same location as Firestore
4. Done

### 5. Register a Web App

1. Project Overview → Click the **Web** icon (`</>`)
2. Register app nickname: `ProvisionHub`
3. Copy the `firebaseConfig` object

### 6. Add Your Firebase Config

Open the file:

```
js/firebase-config.js
```

Replace the placeholder values with your real config:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 7. Deploy Security Rules

Install Firebase CLI (if not already):

```bash
npm install -g firebase-tools
firebase login
```

In the project root:

```bash
firebase init
```

Select:
- Firestore
- Storage
- Hosting

When asked for rules files, point to:
- `firebase/firestore.rules`
- `firebase/storage.rules`

Then deploy rules:

```bash
firebase deploy --only firestore:rules,storage
```

### 8. Deploy the Application

```bash
firebase deploy --only hosting
```

Your app will be available at:
`https://YOUR_PROJECT_ID.web.app`

### 9. Create the First Admin User

1. Open the deployed login page
2. You will need to create the first user manually via Firebase Console:
   - Authentication → Users → Add user
   - Enter email + password
3. Then go to Firestore → Create a document in `users` collection:

```json
{
  "uid": "<the auth uid of the user>",
  "email": "admin@yourstore.com",
  "displayName": "System Admin",
  "role": "admin",
  "phone": "",
  "status": "active",
  "createdAt": <server timestamp>,
  "updatedAt": <server timestamp>
}
```

Alternatively, after Phase 2 is complete, there will be a bootstrap script or UI to create the first admin.

### 10. Test

- Login with the admin account
- Navigate through the sidebar
- Create categories → products → test POS

---

## Development Phases

| Phase | Description                          | Status     |
|-------|--------------------------------------|------------|
| 1     | Project structure + Firebase config  | ✅ Complete |
| 2     | Authentication + users + roles       | ✅ Complete |
| 3     | Firestore structure + security rules  | ✅ Complete |
| 4     | Products + categories                | ✅ Complete |
| 5     | Inventory                            | ✅ Complete |
| 6     | POS + sales                          | ✅ Complete |
| 7     | Customers + suppliers                | ✅ Complete |
| 8     | Purchases                            | ✅ Complete |
| 9     | Expenses                             | ✅ Complete |
| 10    | Returns / refunds                    | ✅ Complete |
| 11    | Reports + dashboard                  | ✅ Complete |
| 12    | Receipt printing                     | ✅ Complete |
| 13    | Security audit                       | ✅ Complete |
| 14    | Testing and bug fixing               | ✅ Complete |

---

## Default Currency

**NGN (₦)** – Nigerian Naira

Can be changed in Settings by Admin.

---

## Roles

| Role     | Permissions                                      |
|----------|--------------------------------------------------|
| Admin    | Full access to everything                        |
| Manager  | Most operations except user management & critical settings |
| Cashier  | POS, view products, limited reports              |

---

## License

Proprietary – Built for your business use.
