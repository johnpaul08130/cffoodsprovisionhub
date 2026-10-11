# Seed Default Business Settings

After creating your first admin and logging in, create the default settings document.

## Option 1: Via Firebase Console (Recommended for first setup)

1. Go to **Firestore Database**
2. Click **Start collection**
3. Collection ID: `settings`
4. Document ID: `business`
5. Add these fields:

| Field               | Type      | Value                                      |
|---------------------|-----------|--------------------------------------------|
| `storeName`         | string    | `CF Food and Beverages`                    |
| `address`           | string    | `Nkwo Okija, Ihiala LGA, Anambra State`    |
| `phone`             | string    | `08062686710`                              |
| `email`             | string    | ``                                         |
| `currency`          | string    | `NGN`                                      |
| `currencySymbol`    | string    | `₦`                                        |
| `taxRate`           | number    | `0`                                        |
| `lowStockThreshold` | number    | `10`                                       |
| `allowNegativeStock`| boolean   | `false`                                    |
| `receiptFooter`     | string    | `Thank you for shopping with us!`          |
| `logoUrl`           | string    | ``                                         |
| `updatedAt`         | timestamp | *(current time)*                           |

6. Save

## Option 2: Later via Settings page (Phase later)

Once the Settings module is built, the Admin can update all these values from the UI.
