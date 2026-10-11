// ============================================================
// ProvisionHub - Purchases Module
// ============================================================

const Purchases = {
  all: [],
  suppliers: [],
  products: [],
  cart: [],

  async loadSuppliers() {
    const snap = await db.collection('suppliers').orderBy('businessName', 'asc').get();
    this.suppliers = [];
    snap.forEach(doc => this.suppliers.push({ id: doc.id, ...doc.data() }));
    return this.suppliers;
  },

  async loadProducts() {
    const snap = await db.collection('products').where('status', '==', 'active').orderBy('name', 'asc').get();
    this.products = [];
    snap.forEach(doc => this.products.push({ id: doc.id, ...doc.data() }));
    return this.products;
  },

  async loadPurchases(limit = 100) {
    const snap = await db.collection('purchases').orderBy('createdAt', 'desc').limit(limit).get();
    this.all = [];
    snap.forEach(doc => this.all.push({ id: doc.id, ...doc.data() }));
    return this.all;
  },

  addToCart(product, qty, unitCost) {
    const existing = this.cart.find(i => i.productId === product.id);
    if (existing) {
      existing.quantity += qty;
      existing.lineTotal = existing.quantity * existing.unitCost;
    } else {
      this.cart.push({
        productId: product.id,
        productName: product.name,
        unit: product.unit || 'pcs',
        quantity: qty,
        unitCost: unitCost,
        lineTotal: qty * unitCost
      });
    }
  },

  updateCartItem(productId, qty, unitCost) {
    const item = this.cart.find(i => i.productId === productId);
    if (!item) return;
    item.quantity = qty;
    item.unitCost = unitCost;
    item.lineTotal = qty * unitCost;
  },

  removeFromCart(productId) {
    this.cart = this.cart.filter(i => i.productId !== productId);
  },

  clearCart() {
    this.cart = [];
  },

  getTotal() {
    return this.cart.reduce((sum, i) => sum + i.lineTotal, 0);
  },

  async generatePurchaseNumber() {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const snap = await db.collection('purchases')
      .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
      .get();
    return `PUR-${datePart}-${String(snap.size + 1).padStart(4, '0')}`;
  },

  /**
   * Complete purchase: increase stock, record purchase, update supplier balance
   */
  async completePurchase({ supplierId, supplierName, amountPaid, paymentMethod, notes }) {
    if (this.cart.length === 0) {
      return { success: false, message: 'Add at least one product.' };
    }
    if (!supplierId) {
      return { success: false, message: 'Please select a supplier.' };
    }

    const totalAmount = this.getTotal();
    const paid = parseFloat(amountPaid) || 0;
    const balance = Math.max(0, totalAmount - paid);

    try {
      const purchaseNumber = await this.generatePurchaseNumber();
      const purchaseRef = db.collection('purchases').doc();

      // Use transaction for inventory consistency
      await db.runTransaction(async (transaction) => {
        // Update each product quantity
        for (const item of this.cart) {
          const productRef = db.collection('products').doc(item.productId);
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists) {
            throw new Error(`Product ${item.productName} not found.`);
          }
          const prevQty = productDoc.data().quantity || 0;
          const newQty = prevQty + item.quantity;

          transaction.update(productRef, {
            quantity: newQty,
            costPrice: item.unitCost, // update last cost price
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });

          // Inventory movement
          const movRef = db.collection('inventory_movements').doc();
          transaction.set(movRef, {
            productId: item.productId,
            productName: item.productName,
            previousQuantity: prevQty,
            quantityChanged: item.quantity,
            newQuantity: newQty,
            movementType: 'purchase',
            reason: `Purchase ${purchaseNumber}`,
            referenceId: purchaseRef.id,
            referenceType: 'purchase',
            userId: Auth.currentUser.uid,
            userName: Auth.currentUserData?.displayName || '',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
        }

        // Purchase document
        transaction.set(purchaseRef, {
          purchaseNumber,
          supplierId,
          supplierName,
          items: this.cart.map(i => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            unitCost: i.unitCost,
            lineTotal: i.lineTotal,
            unit: i.unit
          })),
          totalAmount,
          amountPaid: paid,
          balance,
          paymentMethod: paymentMethod || 'cash',
          notes: notes || '',
          status: balance > 0 ? 'partial' : 'completed',
          createdBy: Auth.currentUser.uid,
          createdByName: Auth.currentUserData?.displayName || '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update supplier balance (amount we still owe)
        if (balance > 0) {
          const suppRef = db.collection('suppliers').doc(supplierId);
          transaction.update(suppRef, {
            balance: firebase.firestore.FieldValue.increment(balance),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      });

      // Also write purchase_items for reporting
      const batch = db.batch();
      this.cart.forEach(item => {
        const ref = db.collection('purchase_items').doc();
        batch.set(ref, {
          purchaseId: purchaseRef.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitCost: item.unitCost,
          lineTotal: item.lineTotal,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();

      await Auth.logAction('purchase', `Completed purchase ${purchaseNumber} – ₦${totalAmount.toLocaleString()} from ${supplierName}`);

      this.clearCart();
      return {
        success: true,
        message: 'Purchase recorded successfully. Stock updated.',
        purchaseNumber,
        totalAmount,
        balance
      };
    } catch (error) {
      console.error('Purchase error:', error);
      return { success: false, message: error.message || 'Failed to complete purchase.' };
    }
  },

  /**
   * Settle outstanding balance on a purchase
   */
  async settleBalance(purchaseId, amount) {
    try {
      const purchaseRef = db.collection('purchases').doc(purchaseId);
      const doc = await purchaseRef.get();
      if (!doc.exists) return { success: false, message: 'Purchase not found.' };

      const data = doc.data();
      const currentBalance = data.balance || 0;
      const payNow = parseFloat(amount) || 0;

      if (payNow <= 0 || payNow > currentBalance) {
        return { success: false, message: 'Invalid amount.' };
      }

      const newPaid = (data.amountPaid || 0) + payNow;
      const newBalance = currentBalance - payNow;

      await purchaseRef.update({
        amountPaid: newPaid,
        balance: newBalance,
        status: newBalance <= 0 ? 'completed' : 'partial',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Reduce supplier balance
      if (data.supplierId) {
        await db.collection('suppliers').doc(data.supplierId).update({
          balance: firebase.firestore.FieldValue.increment(-payNow),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      await Auth.logAction('purchase_settle', `Settled ₦${payNow} on ${data.purchaseNumber}`);
      return { success: true, message: newBalance <= 0 ? 'Fully paid.' : `Remaining: ₦${newBalance.toLocaleString()}` };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Failed to record payment.' };
    }
  },

  formatCurrency(n) {
    return '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en-NG');
  }
};