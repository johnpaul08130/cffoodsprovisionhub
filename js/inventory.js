// ============================================================
// ProvisionHub - Inventory Management Module
// ============================================================

const Inventory = {
  allMovements: [],
  products: [],

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

  async loadMovements(limit = 100) {
    const snapshot = await db.collection('inventory_movements')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    this.allMovements = [];
    snapshot.forEach(doc => {
      this.allMovements.push({ id: doc.id, ...doc.data() });
    });
    return this.allMovements;
  },

  /**
   * Perform a stock movement using a Firestore transaction
   * movementType: stock_in | stock_out | adjustment | damage | expiry | return
   */
  async performMovement({
    productId,
    quantityChanged,   // positive number
    movementType,
    reason = '',
    allowNegative = false
  }) {
    try {
      if (!Auth.hasAnyRole(['admin', 'manager', 'cashier'])) {
        return { success: false, message: 'Permission denied.' };
      }

      // Cashiers can only do limited movements
      if (Auth.hasRole('cashier') && !['stock_out', 'return'].includes(movementType)) {
        // Actually for inventory page we restrict cashiers more
      }

      const qty = Math.abs(parseInt(quantityChanged) || 0);
      if (qty <= 0) {
        return { success: false, message: 'Quantity must be greater than zero.' };
      }

      // Determine sign
      let change = qty;
      if (['stock_out', 'damage', 'expiry', 'sale'].includes(movementType)) {
        change = -qty;
      } else if (movementType === 'adjustment') {
        // For adjustment, quantityChanged can be the new absolute quantity
        // We'll handle differently below
      }

      const productRef = db.collection('products').doc(productId);

      await db.runTransaction(async (transaction) => {
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists) {
          throw new Error('Product not found.');
        }

        const product = productDoc.data();
        const previousQty = product.quantity || 0;
        let newQty;

        if (movementType === 'adjustment') {
          // quantityChanged is the NEW absolute quantity
          newQty = parseInt(quantityChanged) || 0;
          change = newQty - previousQty;
        } else {
          newQty = previousQty + change;
        }

        // Prevent negative stock unless allowed
        if (newQty < 0 && !allowNegative) {
          throw new Error(`Insufficient stock. Current quantity: ${previousQty}`);
        }

        // Update product quantity
        transaction.update(productRef, {
          quantity: newQty,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Create movement record
        const movementRef = db.collection('inventory_movements').doc();
        transaction.set(movementRef, {
          productId: productId,
          productName: product.name,
          previousQuantity: previousQty,
          quantityChanged: change,
          newQuantity: newQty,
          movementType: movementType,
          reason: reason || this.getDefaultReason(movementType),
          referenceId: null,
          referenceType: null,
          userId: Auth.currentUser.uid,
          userName: Auth.currentUserData?.displayName || '',
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      });

      await Auth.logAction('inventory_movement', 
        `${movementType}: ${qty} on product ${productId} – ${reason}`);

      return { success: true, message: 'Inventory updated successfully.' };
    } catch (error) {
      console.error('Inventory movement error:', error);
      return { success: false, message: error.message || 'Failed to update inventory.' };
    }
  },

  getDefaultReason(type) {
    const map = {
      stock_in: 'Stock received',
      stock_out: 'Stock issued',
      adjustment: 'Stock adjustment',
      damage: 'Damaged goods',
      expiry: 'Expired goods',
      return: 'Customer return',
      sale: 'Sold',
      purchase: 'Purchased from supplier'
    };
    return map[type] || 'Inventory movement';
  },

  getMovementBadge(type) {
    const map = {
      stock_in: 'success',
      purchase: 'success',
      return: 'info',
      stock_out: 'warning',
      sale: 'primary',
      adjustment: 'secondary',
      damage: 'danger',
      expiry: 'danger'
    };
    return map[type] || 'secondary';
  },

  formatCurrency(amount) {
    return '₦' + Number(amount || 0).toLocaleString('en-NG', { 
      minimumFractionDigits: 2, maximumFractionDigits: 2 
    });
  },

  formatDateTime(timestamp) {
    if (!timestamp) return '—';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleString('en-NG');
  },

  // Summary helpers
  getLowStockProducts() {
    return this.products.filter(p => {
      const qty = p.quantity || 0;
      const min = p.minimumStock || 10;
      return qty > 0 && qty <= min;
    });
  },

  getOutOfStockProducts() {
    return this.products.filter(p => (p.quantity || 0) <= 0);
  },

  getExpiringProducts(days = 30) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return this.products.filter(p => {
      if (!p.expiryDate) return false;
      const exp = p.expiryDate.toDate ? p.expiryDate.toDate() : new Date(p.expiryDate);
      return exp >= now && exp <= future;
    });
  },

  getExpiredProducts() {
    const now = new Date();
    return this.products.filter(p => {
      if (!p.expiryDate) return false;
      const exp = p.expiryDate.toDate ? p.expiryDate.toDate() : new Date(p.expiryDate);
      return exp < now;
    });
  }
};