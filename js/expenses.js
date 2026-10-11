// ============================================================
// ProvisionHub - Expenses Module
// ============================================================

const Expenses = {
  all: [],

  CATEGORIES: [
    'Electricity',
    'Transport',
    'Rent',
    'Salary',
    'Internet',
    'Repairs',
    'Packaging',
    'Miscellaneous'
  ],

  async load(limit = 200) {
    const snap = await db.collection('expenses')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    this.all = [];
    snap.forEach(doc => this.all.push({ id: doc.id, ...doc.data() }));
    return this.all;
  },

  async create(data) {
    try {
      if (!Auth.hasAnyRole(['admin', 'manager'])) {
        return { success: false, message: 'Permission denied.' };
      }
      const amount = parseFloat(data.amount);
      if (!amount || amount <= 0) {
        return { success: false, message: 'Enter a valid amount.' };
      }
      if (!data.category) {
        return { success: false, message: 'Select a category.' };
      }

      await db.collection('expenses').add({
        category: data.category,
        description: (data.description || '').trim(),
        amount,
        paymentMethod: data.paymentMethod || 'cash',
        createdBy: Auth.currentUser.uid,
        createdByName: Auth.currentUserData?.displayName || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      await Auth.logAction('expense', `Recorded expense: ${data.category} – ₦${amount.toLocaleString()}`);
      return { success: true, message: 'Expense recorded successfully.' };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Failed to record expense.' };
    }
  },

  async update(id, data) {
    try {
      if (!Auth.hasAnyRole(['admin', 'manager'])) {
        return { success: false, message: 'Permission denied.' };
      }
      const amount = parseFloat(data.amount);
      if (!amount || amount <= 0) {
        return { success: false, message: 'Enter a valid amount.' };
      }

      await db.collection('expenses').doc(id).update({
        category: data.category,
        description: (data.description || '').trim(),
        amount,
        paymentMethod: data.paymentMethod || 'cash',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      await Auth.logAction('expense_update', `Updated expense: ${data.category}`);
      return { success: true, message: 'Expense updated.' };
    } catch (e) {
      return { success: false, message: 'Failed to update expense.' };
    }
  },

  async delete(id) {
    try {
      if (!Auth.hasRole('admin')) {
        return { success: false, message: 'Only admins can delete expenses.' };
      }
      await db.collection('expenses').doc(id).delete();
      await Auth.logAction('expense_delete', `Deleted expense ${id}`);
      return { success: true, message: 'Expense deleted.' };
    } catch (e) {
      return { success: false, message: 'Failed to delete expense.' };
    }
  },

  formatCurrency(n) {
    return '₦' + Number(n || 0).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en-NG');
  }
};