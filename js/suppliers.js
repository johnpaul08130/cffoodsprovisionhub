// ============================================================
// ProvisionHub - Suppliers Module
// ============================================================

const Suppliers = {
  all: [],

  async load() {
    const snapshot = await db.collection('suppliers').orderBy('businessName', 'asc').get();
    this.all = [];
    snapshot.forEach(doc => this.all.push({ id: doc.id, ...doc.data() }));
    return this.all;
  },

  async create(data) {
    try {
      if (!Auth.hasAnyRole(['admin', 'manager'])) {
        return { success: false, message: 'Permission denied.' };
      }
      const doc = {
        businessName: data.businessName.trim(),
        contactPerson: (data.contactPerson || '').trim(),
        phone: (data.phone || '').trim(),
        email: (data.email || '').trim(),
        address: (data.address || '').trim(),
        balance: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: Auth.currentUser.uid
      };
      const ref = await db.collection('suppliers').add(doc);
      await Auth.logAction('supplier_create', `Created supplier: ${doc.businessName}`);
      return { success: true, id: ref.id, message: 'Supplier created successfully.' };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Failed to create supplier.' };
    }
  },

  async update(id, data) {
    try {
      if (!Auth.hasAnyRole(['admin', 'manager'])) {
        return { success: false, message: 'Permission denied.' };
      }
      await db.collection('suppliers').doc(id).update({
        businessName: data.businessName.trim(),
        contactPerson: (data.contactPerson || '').trim(),
        phone: (data.phone || '').trim(),
        email: (data.email || '').trim(),
        address: (data.address || '').trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await Auth.logAction('supplier_update', `Updated supplier: ${data.businessName}`);
      return { success: true, message: 'Supplier updated successfully.' };
    } catch (e) {
      return { success: false, message: 'Failed to update supplier.' };
    }
  },

  async delete(id, name) {
    try {
      if (!Auth.hasRole('admin')) {
        return { success: false, message: 'Only admins can delete suppliers.' };
      }
      await db.collection('suppliers').doc(id).delete();
      await Auth.logAction('supplier_delete', `Deleted supplier: ${name}`);
      return { success: true, message: 'Supplier deleted.' };
    } catch (e) {
      return { success: false, message: 'Failed to delete supplier.' };
    }
  },

  async getPurchaseHistory(supplierId, limit = 50) {
    const snapshot = await db.collection('purchases')
      .where('supplierId', '==', supplierId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    const list = [];
    snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    return list;
  },

  formatCurrency(n) {
    return '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
};