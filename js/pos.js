// ============================================================
// ProvisionHub - Point of Sale (POS) Module
// ============================================================

const POS = {
  cart: [],
  products: [],
  customers: [],
  discountPercent: 0,
  discountAmount: 0,
  paymentMethod: 'cash',
  selectedCustomer: null,
  amountPaid: 0,

  async loadProducts() {
    const snapshot = await db.collection('products')
      .where('status', '==', 'active')
      .orderBy('name', 'asc')
      .get();
    this.products = [];
    snapshot.forEach(doc => {
      this.products.push({ id: doc.id, ...doc.data() });
    });
    return this.products;
  },

  async loadCustomers() {
    const snapshot = await db.collection('customers')
      .orderBy('name', 'asc')
      .limit(200)
      .get();
    this.customers = [];
    snapshot.forEach(doc => {
      this.customers.push({ id: doc.id, ...doc.data() });
    });
    return this.customers;
  },

  searchProducts(query) {
    if (!query) return this.products.slice(0, 40);
    const q = query.toLowerCase().trim();
    return this.products.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase() === q ||
      (p.barcode || '').toLowerCase().includes(q)
    ).slice(0, 40);
  },

  findByBarcode(barcode) {
    const code = (barcode || '').trim();
    return this.products.find(p => (p.barcode || '') === code);
  },

  addToCart(product, qty = 1) {
    if ((product.quantity || 0) <= 0) {
      return { success: false, message: `"${product.name}" is out of stock.` };
    }

    const existing = this.cart.find(i => i.productId === product.id);
    if (existing) {
      const newQty = existing.quantity + qty;
      if (newQty > product.quantity) {
        return { success: false, message: `Only ${product.quantity} available in stock.` };
      }
      existing.quantity = newQty;
      existing.lineTotal = existing.quantity * existing.unitPrice;
    } else {
      if (qty > product.quantity) {
        return { success: false, message: `Only ${product.quantity} available in stock.` };
      }
      this.cart.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku || '',
        unit: product.unit || 'pcs',
        unitPrice: product.sellingPrice || 0,
        costPrice: product.costPrice || 0,
        quantity: qty,
        discount: 0,
        lineTotal: (product.sellingPrice || 0) * qty,
        maxQty: product.quantity || 0
      });
    }
    return { success: true };
  },

  updateCartQty(productId, quantity) {
    const item = this.cart.find(i => i.productId === productId);
    if (!item) return;
    const qty = parseInt(quantity) || 1;
    if (qty < 1) {
      this.removeFromCart(productId);
      return;
    }
    if (qty > item.maxQty) {
      item.quantity = item.maxQty;
    } else {
      item.quantity = qty;
    }
    item.lineTotal = item.quantity * item.unitPrice - (item.discount || 0);
  },

  removeFromCart(productId) {
    this.cart = this.cart.filter(i => i.productId !== productId);
  },

  clearCart() {
    this.cart = [];
    this.discountPercent = 0;
    this.discountAmount = 0;
    this.amountPaid = 0;
    this.selectedCustomer = null;
    this.paymentMethod = 'cash';
  },

  getSubtotal() {
    return this.cart.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
  },

  getDiscountTotal() {
    if (this.discountPercent > 0) {
      return (this.getSubtotal() * this.discountPercent) / 100;
    }
    return this.discountAmount || 0;
  },

  getTotal() {
    return Math.max(0, this.getSubtotal() - this.getDiscountTotal());
  },

  getChange() {
    return Math.max(0, (this.amountPaid || 0) - this.getTotal());
  },

  getProfit() {
    const costTotal = this.cart.reduce((sum, i) => sum + (i.costPrice * i.quantity), 0);
    return this.getTotal() - costTotal;
  },

  async generateTransactionNumber() {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    // Simple sequential: count today's sales + 1
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const snapshot = await db.collection('sales')
      .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
      .get();
    const count = snapshot.size + 1;
    return `SALE-${datePart}-${String(count).padStart(4, '0')}`;
  },

  /**
   * Complete the sale using a batch/transaction
   */
  async completeSale() {
    if (this.cart.length === 0) {
      return { success: false, message: 'Cart is empty.' };
    }

    const total = this.getTotal();
    const paid = parseFloat(this.amountPaid) || 0;

    // Allow partial payment / credit
    if (paid < 0) {
      return { success: false, message: 'Amount paid cannot be negative.' };
    }
    if (paid === 0 && !this.selectedCustomer) {
      return { success: false, message: 'Select a customer for credit / unpaid sales, or enter amount paid.' };
    }

    try {
      const transactionNumber = await this.generateTransactionNumber();
      const subtotal = this.getSubtotal();
      const discountTotal = this.getDiscountTotal();
      const profit = this.getProfit();
      const change = paid > total ? paid - total : 0;
      const balance = Math.max(0, total - paid);
      const paymentStatus = balance <= 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid');

      const saleRef = db.collection('sales').doc();
      const batch = db.batch();

      // Prepare items
      const items = this.cart.map(i => ({
        productId: i.productId,
        productName: i.productName,
        sku: i.sku,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        costPrice: i.costPrice,
        discount: i.discount || 0,
        total: i.lineTotal,
        unit: i.unit
      }));

      // Sale document
      batch.set(saleRef, {
        transactionNumber,
        customerId: this.selectedCustomer?.id || null,
        customerName: this.selectedCustomer?.name || 'Walk-in Customer',
        items,
        subtotal,
        discountAmount: discountTotal,
        taxAmount: 0,
        totalAmount: total,
        amountPaid: paid,
        balance: balance,
        changeAmount: change,
        paymentMethod: this.paymentMethod,
        paymentStatus: paymentStatus,   // paid | partial | unpaid
        profit,
        cashierId: Auth.currentUser.uid,
        cashierName: Auth.currentUserData?.displayName || '',
        notes: '',
        status: 'completed',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Update customer balance if there is outstanding amount
      if (balance > 0 && this.selectedCustomer?.id) {
        const custRef = db.collection('customers').doc(this.selectedCustomer.id);
        batch.update(custRef, {
          balance: firebase.firestore.FieldValue.increment(balance),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      // Sale items + inventory updates
      for (const item of this.cart) {
        // Sale item record
        const itemRef = db.collection('sale_items').doc();
        batch.set(itemRef, {
          saleId: saleRef.id,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          discount: item.discount || 0,
          lineTotal: item.lineTotal,
          profit: (item.unitPrice - item.costPrice) * item.quantity,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Inventory movement
        const movRef = db.collection('inventory_movements').doc();
        // We need current qty - we'll do a safer approach with transaction below
      }

      // Because we need to read current quantities, use a transaction for inventory
      await db.runTransaction(async (transaction) => {
        // Re-read products and update quantities
        for (const item of this.cart) {
          const productRef = db.collection('products').doc(item.productId);
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists) {
            throw new Error(`Product ${item.productName} not found.`);
          }
          const product = productDoc.data();
          const prevQty = product.quantity || 0;
          if (prevQty < item.quantity) {
            throw new Error(`Insufficient stock for ${item.productName}. Available: ${prevQty}`);
          }
          const newQty = prevQty - item.quantity;

          transaction.update(productRef, {
            quantity: newQty,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });

          const movRef = db.collection('inventory_movements').doc();
          transaction.set(movRef, {
            productId: item.productId,
            productName: item.productName,
            previousQuantity: prevQty,
            quantityChanged: -item.quantity,
            newQuantity: newQty,
            movementType: 'sale',
            reason: `Sale ${transactionNumber}`,
            referenceId: saleRef.id,
            referenceType: 'sale',
            userId: Auth.currentUser.uid,
            userName: Auth.currentUserData?.displayName || '',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      });

      // Commit the sale + sale_items batch
      await batch.commit();

      await Auth.logAction('sale', `Completed sale ${transactionNumber} – ₦${total.toLocaleString()}`);

      const receiptData = {
        transactionNumber,
        saleId: saleRef.id,
        customerName: this.selectedCustomer?.name || 'Walk-in Customer',
        items: [...this.cart],
        subtotal,
        discountAmount: discountTotal,
        totalAmount: total,
        amountPaid: paid,
        balance: balance,
        changeAmount: change,
        paymentMethod: this.paymentMethod,
        paymentStatus: paymentStatus,
        cashierName: Auth.currentUserData?.displayName || '',
        date: new Date()
      };

      this.clearCart();

      return { success: true, message: 'Sale completed successfully!', receipt: receiptData };
    } catch (error) {
      console.error('Sale error:', error);
      return { success: false, message: error.message || 'Failed to complete sale.' };
    }
  },

  formatCurrency(amount) {
    return '₦' + Number(amount || 0).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
};