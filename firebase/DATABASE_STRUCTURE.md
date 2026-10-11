# ProvisionHub – Firestore Database Structure

**Store:** CF Food and Beverages  
**Address:** Nkwo Okija, Ihiala LGA, Anambra State  
**Phone:** 08062686710

---

## Collections Overview

| Collection            | Description                              |
|-----------------------|------------------------------------------|
| `users`               | Staff accounts & roles                   |
| `settings`            | Business settings (single doc)           |
| `categories`          | Product categories                       |
| `products`            | Products / inventory items               |
| `customers`           | Customers                                |
| `suppliers`           | Suppliers                                |
| `sales`               | Completed sales transactions             |
| `sale_items`          | Line items of each sale                  |
| `purchases`           | Supplier purchases                       |
| `purchase_items`      | Line items of each purchase              |
| `inventory_movements` | Stock in / out / adjustments             |
| `expenses`            | Business expenses                        |
| `returns`             | Product returns & refunds                |
| `audit_logs`          | Security & activity logs                 |

---

## 1. users

**Document ID:** Firebase Auth UID

```js
{
  uid: "string",                 // same as document ID
  email: "string",
  displayName: "string",
  role: "admin" | "manager" | "cashier",
  phone: "string",
  status: "active" | "inactive",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: "uid" | null
}
```

---

## 2. settings

**Document ID:** `business` (single document)

```js
{
  storeName: "CF Food and Beverages",
  address: "Nkwo Okija, Ihiala LGA, Anambra State",
  phone: "08062686710",
  email: "",
  currency: "NGN",
  currencySymbol: "₦",
  taxRate: 0,                    // percentage
  lowStockThreshold: 10,         // default
  allowNegativeStock: false,
  receiptFooter: "Thank you for shopping with us!",
  logoUrl: "",
  updatedAt: Timestamp,
  updatedBy: "uid"
}
```

---

## 3. categories

**Document ID:** Auto-generated

```js
{
  name: "string",
  description: "string",
  status: "active" | "inactive",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: "uid"
}
```

---

## 4. products

**Document ID:** Auto-generated (or use SKU if preferred)

```js
{
  name: "string",
  sku: "string",
  barcode: "string",
  categoryId: "string",          // reference to categories
  categoryName: "string",        // denormalized for speed
  brand: "string",
  description: "string",
  costPrice: number,
  sellingPrice: number,
  wholesalePrice: number,
  quantity: number,
  minimumStock: number,
  unit: "string",                // pcs, kg, litre, pack, carton...
  expiryDate: Timestamp | null,
  supplierId: "string" | null,
  supplierName: "string",
  imageUrl: "string",
  status: "active" | "inactive",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: "uid"
}
```

---

## 5. customers

**Document ID:** Auto-generated

```js
{
  name: "string",
  phone: "string",
  email: "string",
  address: "string",
  customerType: "retail" | "wholesale" | "credit",
  creditLimit: number,
  balance: number,               // outstanding balance
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: "uid"
}
```

---

## 6. suppliers

**Document ID:** Auto-generated

```js
{
  businessName: "string",
  contactPerson: "string",
  phone: "string",
  email: "string",
  address: "string",
  balance: number,               // amount we owe supplier
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: "uid"
}
```

---

## 7. sales

**Document ID:** Auto-generated (or custom transaction number)

```js
{
  transactionNumber: "string",   // e.g. SALE-20261004-0001
  customerId: "string" | null,
  customerName: "string",
  items: [                       // embedded summary (optional)
    {
      productId: "string",
      productName: "string",
      quantity: number,
      unitPrice: number,
      costPrice: number,
      discount: number,
      total: number
    }
  ],
  subtotal: number,
  discountAmount: number,
  taxAmount: number,
  totalAmount: number,
  amountPaid: number,
  changeAmount: number,
  paymentMethod: "cash" | "bank_transfer" | "pos" | "card" | "other",
  profit: number,                // calculated
  cashierId: "string",
  cashierName: "string",
  notes: "string",
  status: "completed" | "refunded" | "partial_refund",
  createdAt: Timestamp
}
```

---

## 8. sale_items

**Document ID:** Auto-generated

```js
{
  saleId: "string",
  productId: "string",
  productName: "string",
  sku: "string",
  quantity: number,
  unitPrice: number,
  costPrice: number,
  discount: number,
  lineTotal: number,
  profit: number,
  createdAt: Timestamp
}
```

---

## 9. purchases

**Document ID:** Auto-generated

```js
{
  purchaseNumber: "string",      // e.g. PUR-20261004-0001
  supplierId: "string",
  supplierName: "string",
  items: [...],
  totalAmount: number,
  amountPaid: number,
  balance: number,
  paymentMethod: "cash" | "bank_transfer" | "pos" | "card" | "credit",
  notes: "string",
  status: "completed" | "pending",
  createdBy: "uid",
  createdByName: "string",
  createdAt: Timestamp
}
```

---

## 10. purchase_items

```js
{
  purchaseId: "string",
  productId: "string",
  productName: "string",
  quantity: number,
  unitCost: number,
  lineTotal: number,
  createdAt: Timestamp
}
```

---

## 11. inventory_movements

**Document ID:** Auto-generated

```js
{
  productId: "string",
  productName: "string",
  previousQuantity: number,
  quantityChanged: number,       // positive or negative
  newQuantity: number,
  movementType: "stock_in" | "stock_out" | "sale" | "purchase" | 
                "adjustment" | "damage" | "expiry" | "return" | "transfer",
  reason: "string",
  referenceId: "string" | null,  // saleId, purchaseId, returnId...
  referenceType: "string" | null,
  userId: "string",
  userName: "string",
  timestamp: Timestamp
}
```

---

## 12. expenses

**Document ID:** Auto-generated

```js
{
  category: "Electricity" | "Transport" | "Rent" | "Salary" | 
            "Internet" | "Repairs" | "Packaging" | "Miscellaneous" | string,
  description: "string",
  amount: number,
  paymentMethod: "cash" | "bank_transfer" | "pos" | "card" | "other",
  createdBy: "uid",
  createdByName: "string",
  createdAt: Timestamp
}
```

---

## 13. returns

**Document ID:** Auto-generated

```js
{
  returnNumber: "string",
  saleId: "string",
  transactionNumber: "string",
  customerId: "string" | null,
  customerName: "string",
  items: [
    {
      productId: "string",
      productName: "string",
      quantity: number,
      unitPrice: number,
      refundAmount: number
    }
  ],
  totalRefund: number,
  reason: "string",
  refundMethod: "cash" | "bank_transfer" | "pos" | "card" | "store_credit",
  processedBy: "uid",
  processedByName: "string",
  createdAt: Timestamp
}
```

---

## 14. audit_logs

**Document ID:** Auto-generated

```js
{
  userId: "string",
  userEmail: "string",
  userName: "string",
  action: "login" | "logout" | "product_create" | "product_update" | 
          "product_delete" | "sale" | "purchase" | "return" | 
          "expense" | "user_create" | "settings_update" | string,
  description: "string",
  timestamp: Timestamp,
  userAgent: "string"
}
```

---

## Relationships Summary

- `products.categoryId` → `categories`
- `products.supplierId` → `suppliers`
- `sales.customerId` → `customers`
- `sales.cashierId` → `users`
- `sale_items.saleId` → `sales`
- `sale_items.productId` → `products`
- `purchases.supplierId` → `suppliers`
- `inventory_movements.productId` → `products`
- `returns.saleId` → `sales`

---

## Important Design Decisions

1. **Denormalization** – Product name, category name, cashier name etc. are stored on sales/purchases for historical accuracy and faster reads.
2. **Server timestamps** – Always use `firebase.firestore.FieldValue.serverTimestamp()`.
3. **No negative stock by default** – Controlled by `settings.allowNegativeStock`.
4. **Transactions** – Sales and inventory updates must use Firestore transactions or batched writes.
5. **Soft deletes preferred** – Prefer `status: 'inactive'` over hard deletes where possible.
