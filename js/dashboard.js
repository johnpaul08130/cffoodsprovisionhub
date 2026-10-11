// ============================================================
// ProvisionHub - Dashboard Module (CEO / Manager view)
// ============================================================

const Dashboard = {
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
  },

  startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  },

  startOfWeek() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  startOfMonth() {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  async load() {
    const todayStart = firebase.firestore.Timestamp.fromDate(this.startOfToday());
    const weekStart = firebase.firestore.Timestamp.fromDate(this.startOfWeek());
    const monthStart = firebase.firestore.Timestamp.fromDate(this.startOfMonth());

    // Load recent sales (last 100 for stats)
    const salesSnap = await db.collection('sales')
      .orderBy('createdAt', 'desc')
      .limit(300)
      .get();

    const allSales = [];
    salesSnap.forEach(doc => allSales.push({ id: doc.id, ...doc.data() }));

    // Products count + low/out stock
    const productsSnap = await db.collection('products').where('status', '==', 'active').get();
    let totalProducts = 0;
    let lowStock = 0;
    let outStock = 0;
    productsSnap.forEach(doc => {
      totalProducts++;
      const p = doc.data();
      const qty = p.quantity || 0;
      const min = p.minimumStock || 10;
      if (qty <= 0) outStock++;
      else if (qty <= min) lowStock++;
    });

    // Customers & suppliers count
    const [custSnap, suppSnap] = await Promise.all([
      db.collection('customers').get(),
      db.collection('suppliers').get()
    ]);

    // Outstanding balances (sales with balance > 0)
    const outstanding = allSales.filter(s => (s.balance || 0) > 0);
    const outstandingTotal = outstanding.reduce((sum, s) => sum + (s.balance || 0), 0);

    // Filter helpers
    const inRange = (sale, startTs) => {
      if (!sale.createdAt) return false;
      const t = sale.createdAt.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
      return t >= startTs.toDate();
    };

    const todaySales = allSales.filter(s => inRange(s, todayStart));
    const weekSales = allSales.filter(s => inRange(s, weekStart));
    const monthSales = allSales.filter(s => inRange(s, monthStart));

    const sum = (arr, field) => arr.reduce((s, x) => s + (x[field] || 0), 0);

    // Sales by cashier (today)
    const byCashier = {};
    todaySales.forEach(s => {
      const name = s.cashierName || 'Unknown';
      if (!byCashier[name]) {
        byCashier[name] = { name, count: 0, total: 0, profit: 0 };
      }
      byCashier[name].count++;
      byCashier[name].total += s.totalAmount || 0;
      byCashier[name].profit += s.profit || 0;
    });
    const cashierStats = Object.values(byCashier).sort((a, b) => b.total - a.total);

    // Payment method breakdown (today)
    const byPayment = {};
    todaySales.forEach(s => {
      const m = s.paymentMethod || 'other';
      byPayment[m] = (byPayment[m] || 0) + (s.totalAmount || 0);
    });

    return {
      today: {
        count: todaySales.length,
        revenue: sum(todaySales, 'totalAmount'),
        profit: sum(todaySales, 'profit'),
        paid: sum(todaySales, 'amountPaid')
      },
      week: {
        count: weekSales.length,
        revenue: sum(weekSales, 'totalAmount'),
        profit: sum(weekSales, 'profit')
      },
      month: {
        count: monthSales.length,
        revenue: sum(monthSales, 'totalAmount'),
        profit: sum(monthSales, 'profit')
      },
      products: { total: totalProducts, lowStock, outStock },
      customers: custSnap.size,
      suppliers: suppSnap.size,
      outstanding: {
        count: outstanding.length,
        total: outstandingTotal,
        list: outstanding.slice(0, 10)
      },
      cashierStats,
      byPayment,
      recentSales: allSales.slice(0, 10)
    };
  }
};