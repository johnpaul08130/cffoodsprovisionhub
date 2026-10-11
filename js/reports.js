// ============================================================
// ProvisionHub - Reports Module
// ============================================================

const Reports = {
  formatCurrency(n) {
    return '₦' + Number(n || 0).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-NG');
  },

  formatDateTime(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en-NG');
  },

  parseDate(str) {
    if (!str) return null;
    const d = new Date(str);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  inDateRange(timestamp, fromDate, toDate) {
    if (!timestamp) return false;
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (fromDate && d < fromDate) return false;
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  },

  async loadSales(fromDate, toDate) {
    let query = db.collection('sales').orderBy('createdAt', 'desc').limit(500);
    const snap = await query.get();
    const list = [];
    snap.forEach(doc => {
      const data = { id: doc.id, ...doc.data() };
      if (this.inDateRange(data.createdAt, fromDate, toDate)) list.push(data);
    });
    return list;
  },

  async loadPurchases(fromDate, toDate) {
    const snap = await db.collection('purchases').orderBy('createdAt', 'desc').limit(300).get();
    const list = [];
    snap.forEach(doc => {
      const data = { id: doc.id, ...doc.data() };
      if (this.inDateRange(data.createdAt, fromDate, toDate)) list.push(data);
    });
    return list;
  },

  async loadExpenses(fromDate, toDate) {
    const snap = await db.collection('expenses').orderBy('createdAt', 'desc').limit(300).get();
    const list = [];
    snap.forEach(doc => {
      const data = { id: doc.id, ...doc.data() };
      if (this.inDateRange(data.createdAt, fromDate, toDate)) list.push(data);
    });
    return list;
  },

  async loadProducts() {
    const snap = await db.collection('products').where('status', '==', 'active').get();
    const list = [];
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    return list;
  },

  async loadCustomers() {
    const snap = await db.collection('customers').orderBy('name').get();
    const list = [];
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    return list;
  },

  async loadSuppliers() {
    const snap = await db.collection('suppliers').orderBy('businessName').get();
    const list = [];
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    return list;
  },

  // ---- Report builders ----

  salesReport(sales) {
    const totalRevenue = sales.reduce((s, x) => s + (x.totalAmount || 0), 0);
    const totalProfit = sales.reduce((s, x) => s + (x.profit || 0), 0);
    const totalPaid = sales.reduce((s, x) => s + (x.amountPaid || 0), 0);
    const totalBalance = sales.reduce((s, x) => s + (x.balance || 0), 0);
    return {
      rows: sales,
      summary: {
        count: sales.length,
        revenue: totalRevenue,
        profit: totalProfit,
        paid: totalPaid,
        balance: totalBalance
      }
    };
  },

  profitReport(sales, expenses) {
    const revenue = sales.reduce((s, x) => s + (x.totalAmount || 0), 0);
    const profit = sales.reduce((s, x) => s + (x.profit || 0), 0);
    const expenseTotal = expenses.reduce((s, x) => s + (x.amount || 0), 0);
    const netProfit = profit - expenseTotal;
    return {
      revenue,
      grossProfit: profit,
      expenses: expenseTotal,
      netProfit,
      salesCount: sales.length,
      expenseCount: expenses.length
    };
  },

  productPerformance(sales) {
    const map = {};
    sales.forEach(sale => {
      (sale.items || []).forEach(item => {
        if (!map[item.productId]) {
          map[item.productId] = {
            productId: item.productId,
            productName: item.productName,
            qtySold: 0,
            revenue: 0,
            profit: 0
          };
        }
        map[item.productId].qtySold += item.quantity || 0;
        map[item.productId].revenue += item.total || (item.unitPrice * item.quantity) || 0;
        const cost = (item.costPrice || 0) * (item.quantity || 0);
        map[item.productId].profit += ((item.total || item.unitPrice * item.quantity) || 0) - cost;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  },

  cashierPerformance(sales) {
    const map = {};
    sales.forEach(s => {
      const name = s.cashierName || 'Unknown';
      if (!map[name]) map[name] = { name, count: 0, revenue: 0, profit: 0 };
      map[name].count++;
      map[name].revenue += s.totalAmount || 0;
      map[name].profit += s.profit || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  },

  paymentMethodReport(sales) {
    const map = {};
    sales.forEach(s => {
      const m = s.paymentMethod || 'other';
      if (!map[m]) map[m] = { method: m, count: 0, total: 0 };
      map[m].count++;
      map[m].total += s.totalAmount || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  },

  lowStockReport(products) {
    return products
      .filter(p => {
        const qty = p.quantity || 0;
        const min = p.minimumStock || 10;
        return qty <= min;
      })
      .sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
  },

  expiryReport(products) {
    const now = new Date();
    const in60 = new Date();
    in60.setDate(in60.getDate() + 60);
    return products
      .filter(p => {
        if (!p.expiryDate) return false;
        const exp = p.expiryDate.toDate ? p.expiryDate.toDate() : new Date(p.expiryDate);
        return exp <= in60;
      })
      .map(p => {
        const exp = p.expiryDate.toDate ? p.expiryDate.toDate() : new Date(p.expiryDate);
        const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
        return { ...p, daysLeft: days, expired: days < 0 };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  },

  inventoryValue(products) {
    let costValue = 0;
    let sellValue = 0;
    products.forEach(p => {
      const qty = p.quantity || 0;
      costValue += qty * (p.costPrice || 0);
      sellValue += qty * (p.sellingPrice || 0);
    });
    return { costValue, sellValue, productCount: products.length };
  },

  // CSV export helper
  downloadCSV(filename, headers, rows) {
    const escape = (v) => {
      const s = String(v ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const lines = [headers.map(escape).join(',')];
    rows.forEach(row => lines.push(row.map(escape).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  printReport(title, contentHtml) {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 13px; }
        h2 { margin-bottom: 5px; }
        .meta { color: #666; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f5f5f5; }
        .summary { margin-top: 15px; font-weight: bold; }
        @media print { button { display: none; } }
      </style></head><body>
      <h2>${title}</h2>
      <div class="meta">CF Foods and Beverages · Nkwo Okija, Ihiala LGA · ${new Date().toLocaleString('en-NG')}</div>
      ${contentHtml}
      <br><button onclick="window.print()">Print</button>
      </body></html>
    `);
    win.document.close();
  }
};
