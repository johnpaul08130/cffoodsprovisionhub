# ProvisionHub – Testing Checklist (Phase 14)

**Store:** CF Foods and Beverages  
**App:** ProvisionHub (Firebase cloud)

Use this list after you connect Firebase and create the first admin.

Mark each item as you test it.

---

## A. Setup (one-time)

- [ ] Create Firebase project
- [ ] Enable **Authentication → Email/Password**
- [ ] Create Firestore database (production mode)
- [ ] Enable Firebase Storage
- [ ] Copy config into `js/firebase-config.js`
- [ ] Install Firebase CLI: `npm install -g firebase-tools`
- [ ] Login: `firebase login`
- [ ] Link project: `firebase use --add`
- [ ] Deploy rules:  
      `firebase deploy --only firestore:rules,storage,firestore:indexes`
- [ ] Create first **Admin** user (see `CREATE_FIRST_ADMIN.md`)
- [ ] Seed `settings/business` document (see `SEED_SETTINGS.md`)
- [ ] Deploy hosting: `firebase deploy --only hosting`  
      **OR** open the files locally via a simple static server for testing

---

## B. Authentication

| # | Test | Expected | Pass |
|---|------|----------|------|
| 1 | Open `login.html` | Login screen with logo and store details | ☐ |
| 2 | Login with wrong password | Clear error message | ☐ |
| 3 | Login with correct admin | Redirects to Dashboard | ☐ |
| 4 | Refresh page while logged in | Stays logged in | ☐ |
| 5 | Logout | Returns to login | ☐ |
| 6 | Forgot password | Reset email sent (check inbox) | ☐ |
| 7 | Inactive user tries login | Blocked with message | ☐ |

---

## C. Products & Categories

| # | Test | Expected | Pass |
|---|------|----------|------|
| 1 | Add category | Appears in list | ☐ |
| 2 | Add product (name, price, unit, stock) | Saved to Firestore | ☐ |
| 3 | Units: Carton, 1/2, Pieces | Can select each | ☐ |
| 4 | Edit product price | Price updates | ☐ |
| 5 | Upload product image | Image shows | ☐ |
| 6 | Set minimum stock | Low-stock alert works later | ☐ |
| 7 | Set expiry date | Expiry badge/report works | ☐ |
| 8 | Search products | Filters correctly | ☐ |

---

## D. Inventory

| # | Test | Expected | Pass |
|---|------|----------|------|
| 1 | Adjust stock (add) | Quantity increases + movement logged | ☐ |
| 2 | Adjust stock (remove) | Quantity decreases + movement logged | ☐ |
| 3 | View movements | History shows | ☐ |
| 4 | Low stock list | Shows products at/below minimum | ☐ |

---

## E. POS & Sales

| # | Test | Expected | Pass |
|---|------|----------|------|
| 1 | Open POS | Products load | ☐ |
| 2 | Add items to cart | Cart updates, totals correct | ☐ |
| 3 | Change quantity | Line total updates | ☐ |
| 4 | Pay **full** (Cash) | Sale saved, stock reduced, receipt shows PAID IN FULL | ☐ |
| 5 | Pay **part** amount | Balance due shown, customer balance updated | ☐ |
| 6 | Payment methods: Cash, Transfer, POS | All work | ☐ |
| 7 | Select customer for credit sale | Works | ☐ |
| 8 | Print receipt | Print dialog opens with correct layout | ☐ |
| 9 | View sale in Sales History | Appears with correct data | ☐ |
| 10 | Collect outstanding balance | Balance reduces / clears | ☐ |

---

## F. Customers & Suppliers

| # | Test | Expected | Pass |
|---|------|----------|------|
| 1 | Add customer | Saved | ☐ |
| 2 | Edit customer | Updates | ☐ |
| 3 | View customer purchase history | Shows sales | ☐ |
| 4 | Add supplier | Saved | ☐ |
| 5 | Edit supplier | Updates | ☐ |

---

## G. Purchases

| # | Test | Expected | Pass |
|---|------|----------|------|
| 1 | New purchase from supplier | Stock increases | ☐ |
| 2 | Partial payment to supplier | Balance recorded | ☐ |
| 3 | Settle purchase balance later | Balance reduces | ☐ |
| 4 | Inventory movement created | Type = purchase | ☐ |

---

## H. Expenses

| # | Test | Expected | Pass |
|---|------|----------|------|
| 1 | Add expense | Saved with category | ☐ |
| 2 | Filter by date / category | Works | ☐ |
| 3 | Edit / delete (admin) | Works | ☐ |

---

## I. Returns & Exchange

| # | Test | Expected | Pass |
|---|------|----------|------|
| 1 | Return (refund only) | Stock increases, money refunded, sale not deleted | ☐ |
| 2 | Exchange product A → product B | Stock of A up, B down | ☐ |
| 3 | Exchange with price difference (customer pays) | Difference shown | ☐ |
| 4 | Exchange with refund | Refund amount correct | ☐ |
| 5 | Even swap | No money due | ☐ |

---

## J. Dashboard & Reports (CEO)

| # | Test | Expected | Pass |
|---|------|----------|------|
| 1 | Dashboard loads | Today’s sales, profit, cashier breakdown | ☐ |
| 2 | Outstanding balances visible | Correct amounts | ☐ |
| 3 | Run Sales Report | Data matches | ☐ |
| 4 | Run Profit Report | Revenue − expenses = net | ☐ |
| 5 | Product / Cashier performance | Correct | ☐ |
| 6 | Low stock / Expiry reports | Correct | ☐ |
| 7 | Export CSV | File downloads | ☐ |
| 8 | Print report | Print preview works | ☐ |

---

## K. Roles

| # | Test | Expected | Pass |
|---|------|----------|------|
| 1 | Cashier cannot open Users | Blocked / hidden | ☐ |
| 2 | Cashier cannot open Purchases / Expenses / Reports | Blocked / hidden | ☐ |
| 3 | Manager can open Reports | Allowed | ☐ |
| 4 | Manager cannot manage Users | Blocked | ☐ |
| 5 | Admin can do everything | Allowed | ☐ |

---

## L. Offline / Multi-device

| # | Test | Expected | Pass |
|---|------|----------|------|
| 1 | Login on CEO phone | Sees same dashboard data | ☐ |
| 2 | Make sale on shop device | Appears on CEO device after refresh | ☐ |
| 3 | Short internet cut | App still opens cached pages | ☐ |
| 4 | Sale while briefly offline | Queues and syncs when online | ☐ |

---

## M. Common issues & fixes

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| Permission denied | Rules not deployed | `firebase deploy --only firestore:rules` |
| Index error in console | Missing composite index | Click the link in the error or deploy indexes |
| Login loops | User doc missing / inactive | Create/activate user in Firestore `users` collection |
| Images fail | Storage rules | Deploy storage rules; check file is image & under 5MB |
| Receipt print blocked | Pop-up blocked | Allow pop-ups for your site |
| Config error | Wrong Firebase keys | Re-copy from Project Settings → Your apps |

---

## N. Go-live checklist

1. [ ] All critical tests above passed  
2. [ ] Admin account only known to CEO  
3. [ ] Cashier accounts created for staff  
4. [ ] Real products and opening stock entered  
5. [ ] Suppliers and main customers entered  
6. [ ] Staff trained on POS + part payments  
7. [ ] Hosting URL shared with CEO only as needed  
8. [ ] Backup plan: Firebase has automatic backups; export important reports weekly as CSV  

---

**Phase 14 complete.**  
The application is ready for configuration and live testing with your Firebase project.
