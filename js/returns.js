// ============================================================
// ProvisionHub - Returns, Refunds & Exchange Module
// ============================================================

const Returns = {
  all: [],

  async load(limit = 100) {
    const snap = await db.collection('returns')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    this.all = [];
    snap.forEach(doc => this.all.push({ id: doc.id, ...doc.data() }));
    return this.all;
  },

  async findSaleByTransactionNumber(txnNumber) {
    const snap = await db.collection('sales')
      .where('transactionNumber', '==', txnNumber.trim())
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  async loadProducts() {
    const snap = await db.collection('products')
      .where('status', '==', 'active')
      .orderBy('name', 'asc')
      .get();
    const products = [];
    snap.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
    return products;
  },

  async generateReturnNumber() {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const snap = await db.collection('returns')
      .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
      .get();
    return 'RET-' + datePart + '-' + String(snap.size + 1).padStart(4, '0');
  },

  async processReturn({
    saleId, transactionNumber, customerId, customerName, items, reason, refundMethod
  }) {
    try {
      if (!Auth.hasAnyRole(['admin', 'manager'])) {
        return { success: false, message: 'Permission denied.' };
      }
      if (!items || items.length === 0) {
        return { success: false, message: 'Select at least one product to return.' };
      }
      const returnItems = items.filter(i => i.returnQty > 0);
      if (returnItems.length === 0) {
        return { success: false, message: 'Enter return quantity for at least one item.' };
      }
      for (const item of returnItems) {
        if (item.returnQty > item.maxQty) {
          return { success: false, message: 'Cannot return more than sold for ' + item.productName };
        }
      }
      const totalRefund = returnItems.reduce((sum, i) => sum + (i.returnQty * i.unitPrice), 0);
      const returnNumber = await this.generateReturnNumber();
      const returnRef = db.collection('returns').doc();

      await db.runTransaction(async (transaction) => {
        for (const item of returnItems) {
          const productRef = db.collection('products').doc(item.productId);
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists) throw new Error('Product ' + item.productName + ' not found.');
          const prevQty = productDoc.data().quantity || 0;
          const newQty = prevQty + item.returnQty;
          transaction.update(productRef, { quantity: newQty, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
          const movRef = db.collection('inventory_movements').doc();
          transaction.set(movRef, {
            productId: item.productId, productName: item.productName,
            previousQuantity: prevQty, quantityChanged: item.returnQty, newQuantity: newQty,
            movementType: 'return', reason: 'Return ' + returnNumber + ' – ' + (reason || 'Customer return'),
            referenceId: returnRef.id, referenceType: 'return',
            userId: Auth.currentUser.uid, userName: Auth.currentUserData?.displayName || '',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
        transaction.set(returnRef, {
          returnNumber, type: 'refund', saleId, transactionNumber,
          customerId: customerId || null, customerName: customerName || 'Walk-in Customer',
          items: returnItems.map(i => ({
            productId: i.productId, productName: i.productName,
            quantity: i.returnQty, unitPrice: i.unitPrice, refundAmount: i.returnQty * i.unitPrice
          })),
          totalRefund, reason: reason || '', refundMethod: refundMethod || 'cash',
          processedBy: Auth.currentUser.uid, processedByName: Auth.currentUserData?.displayName || '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        const saleRef = db.collection('sales').doc(saleId);
        const saleDoc = await transaction.get(saleRef);
        if (saleDoc.exists) {
          transaction.update(saleRef, { status: 'partial_refund', updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        }
      });
      await Auth.logAction('return', 'Processed return ' + returnNumber + ' for sale ' + transactionNumber);
      return { success: true, message: 'Return processed successfully. Stock updated.', returnNumber, totalRefund };
    } catch (error) {
      console.error('Return error:', error);
      return { success: false, message: error.message || 'Failed to process return.' };
    }
  },

  async processExchange({
    saleId, transactionNumber, customerId, customerName,
    returnItems, exchangeItems, reason, paymentMethod
  }) {
    try {
      if (!Auth.hasAnyRole(['admin', 'manager'])) {
        return { success: false, message: 'Permission denied.' };
      }
      const returns = (returnItems || []).filter(i => i.returnQty > 0);
      const exchanges = (exchangeItems || []).filter(i => i.quantity > 0);
      if (returns.length === 0) return { success: false, message: 'Select at least one product to return.' };
      if (exchanges.length === 0) return { success: false, message: 'Select at least one product to give in exchange.' };
      for (const item of returns) {
        if (item.returnQty > item.maxQty) {
          return { success: false, message: 'Cannot return more than sold for ' + item.productName };
        }
      }
      const returnValue = returns.reduce((s, i) => s + (i.returnQty * i.unitPrice), 0);
      const exchangeValue = exchanges.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
      const difference = exchangeValue - returnValue;
      const returnNumber = await this.generateReturnNumber();
      const returnRef = db.collection('returns').doc();

      await db.runTransaction(async (transaction) => {
        for (const item of returns) {
          const productRef = db.collection('products').doc(item.productId);
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists) throw new Error('Product ' + item.productName + ' not found.');
          const prevQty = productDoc.data().quantity || 0;
          const newQty = prevQty + item.returnQty;
          transaction.update(productRef, { quantity: newQty, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
          const movRef = db.collection('inventory_movements').doc();
          transaction.set(movRef, {
            productId: item.productId, productName: item.productName,
            previousQuantity: prevQty, quantityChanged: item.returnQty, newQuantity: newQty,
            movementType: 'return', reason: 'Exchange ' + returnNumber + ' – returned',
            referenceId: returnRef.id, referenceType: 'exchange',
            userId: Auth.currentUser.uid, userName: Auth.currentUserData?.displayName || '',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
        for (const item of exchanges) {
          const productRef = db.collection('products').doc(item.productId);
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists) throw new Error('Product ' + item.productName + ' not found.');
          const prevQty = productDoc.data().quantity || 0;
          if (prevQty < item.quantity) throw new Error('Insufficient stock for ' + item.productName + '. Available: ' + prevQty);
          const newQty = prevQty - item.quantity;
          transaction.update(productRef, { quantity: newQty, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
          const movRef = db.collection('inventory_movements').doc();
          transaction.set(movRef, {
            productId: item.productId, productName: item.productName,
            previousQuantity: prevQty, quantityChanged: -item.quantity, newQuantity: newQty,
            movementType: 'sale', reason: 'Exchange ' + returnNumber + ' – given',
            referenceId: returnRef.id, referenceType: 'exchange',
            userId: Auth.currentUser.uid, userName: Auth.currentUserData?.displayName || '',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
        transaction.set(returnRef, {
          returnNumber, type: 'exchange', saleId, transactionNumber,
          customerId: customerId || null, customerName: customerName || 'Walk-in Customer',
          items: returns.map(i => ({
            productId: i.productId, productName: i.productName,
            quantity: i.returnQty, unitPrice: i.unitPrice, refundAmount: i.returnQty * i.unitPrice
          })),
          exchangeItems: exchanges.map(i => ({
            productId: i.productId, productName: i.productName,
            quantity: i.quantity, unitPrice: i.unitPrice, amount: i.quantity * i.unitPrice
          })),
          returnValue, exchangeValue, difference,
          totalRefund: difference < 0 ? Math.abs(difference) : 0,
          amountPaidByCustomer: difference > 0 ? difference : 0,
          reason: reason || 'Product exchange', refundMethod: paymentMethod || 'cash',
          processedBy: Auth.currentUser.uid, processedByName: Auth.currentUserData?.displayName || '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        const saleRef = db.collection('sales').doc(saleId);
        const saleDoc = await transaction.get(saleRef);
        if (saleDoc.exists) {
          transaction.update(saleRef, { status: 'exchanged', updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        }
      });
      await Auth.logAction('exchange', 'Exchange ' + returnNumber + ' for sale ' + transactionNumber);
      let message;
      if (difference > 0) message = 'Exchange completed. Customer pays ₦' + difference.toLocaleString();
      else if (difference < 0) message = 'Exchange completed. Refund customer ₦' + Math.abs(difference).toLocaleString();
      else message = 'Exchange completed. Even swap – no money due.';
      return { success: true, message, returnNumber, difference, returnValue, exchangeValue };
    } catch (error) {
      console.error('Exchange error:', error);
      return { success: false, message: error.message || 'Failed to process exchange.' };
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
