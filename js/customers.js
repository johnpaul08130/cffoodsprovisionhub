// ============================================================
// ProvisionHub - Customers Module
// ============================================================

const Customers = {
  all: [],

  async load() {
    const snapshot = await db.collection('customers').orderBy('name', 'asc').get();
    this.all = [];
    snapshot.forEach(doc => this.all.push({ id: doc.id, ...doc.data() }));
    return this.all;
  },

  async create(data) {
    try {
      if (!Auth.hasAnyRole(['admin', 'manager', 'cashier'])) {
        return { success: false, message: 'Permission denied.' };
      }
      const doc = {
        name: data.name.trim(),
        phone: (data.phone || '').trim(),
        email: (data.email || '').trim(),
        address: (data.address || '').trim(),
        customerType: data.customerType || 'retail',
        creditLimit: parseFloat(data.creditLimit) || 0,
        balance: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: Auth.currentUser.uid
      };
      const ref = await db.collection('customers').add(doc);
      await Auth.logAction('customer_create', `Created customer: ${doc.name}`);
      return { success: true, id: ref.id, message: 'Customer created successfully.' };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Failed to create customer.' };
    }
  },

  async update(id, data) {
    try {
      if (!Auth.hasAnyRole(['admin', 'manager', 'cashier'])) {
        return { success: false, message: 'Permission denied.' };
      }
      await db.collection('customers').doc(id).update({
        name: data.name.trim(),
        phone: (data.phone || '').trim(),
        email: (data.email || '').trim(),
        address: (data.address || '').trim(),
        customerType: data.customerType || 'retail',
        creditLimit: parseFloat(data.creditLimit) || 0,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await Auth.logAction('customer_update', `Updated customer: ${data.name}`);
      return { success: true, message: 'Customer updated successfully.' };
    } catch (e) {
      return { success: false, message: 'Failed to update customer.' };
    }
  },

  async delete(id, name) {
    try {
      if (!Auth.hasAnyRole(['admin', 'manager'])) {
        return { success: false, message: 'Permission denied.' };
      }
      await db.collection('customers').doc(id).delete();
      await Auth.logAction('customer_delete', `Deleted customer: ${name}`);
      return { success: true, message: 'Customer deleted.' };
    } catch (e) {
      return { success: false, message: 'Failed to delete customer.' };
    }
  },

  async getPurchaseHistory(customerId, limit = 50) {
    const snapshot = await db.collection('sales')
      .where('customerId', '==', customerId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    const sales = [];
    snapshot.forEach(doc => sales.push({ id: doc.id, ...doc.data() }));
    return sales;
  },

  formatCurrency(n) {
    return '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
};