// ============================================================
// ProvisionHub - Professional Receipt Generator
// ============================================================

const Receipt = {
  store: {
    name: 'CF Foods and Beverages',
    address: 'Nkwo Okija, Ihiala LGA, Anambra State',
    phone: '08062686710',
    footer: 'Thank you for shopping with us!'
  },

  formatCurrency(n) {
    return '₦' + Number(n || 0).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  /**
   * Build receipt HTML for display or print
   * @param {Object} r - receipt data from POS.completeSale
   * @param {boolean} forPrint - simpler styles for thermal/print
   */
  buildHTML(r, forPrint = false) {
    const dateStr = r.date
      ? (r.date instanceof Date ? r.date.toLocaleString('en-NG') : r.date)
      : new Date().toLocaleString('en-NG');

    const itemsHTML = (r.items || []).map(i => {
      const name = i.productName || i.name || 'Item';
      const qty = i.quantity || 0;
      const total = i.lineTotal != null ? i.lineTotal : (i.unitPrice || 0) * qty;
      if (forPrint) {
        return `<tr>
          <td style="text-align:left;">${name}</td>
          <td style="text-align:center;">${qty}</td>
          <td style="text-align:right;">${this.formatCurrency(total)}</td>
        </tr>`;
      }
      return `<tr>
        <td class="small">${name}</td>
        <td class="text-center small">${qty}</td>
        <td class="text-end small">${this.formatCurrency(total)}</td>
      </tr>`;
    }).join('');

    const balance = r.balance || 0;
    const paymentStatus = r.paymentStatus || (balance > 0 ? 'partial' : 'paid');

    let paymentBlock = '';
    if (forPrint) {
      paymentBlock = `
        <div style="display:flex;justify-content:space-between;"><span>Paid (${r.paymentMethod || 'cash'})</span><span>${this.formatCurrency(r.amountPaid)}</span></div>
        <div style="display:flex;justify-content:space-between;"><span>Change</span><span>${this.formatCurrency(r.changeAmount || 0)}</span></div>
        ${balance > 0
          ? `<div style="display:flex;justify-content:space-between;font-weight:bold;"><span>BALANCE DUE</span><span>${this.formatCurrency(balance)}</span></div>
             <div style="text-align:center;margin-top:4px;">Status: ${paymentStatus.toUpperCase()}</div>`
          : `<div style="text-align:center;margin-top:4px;font-weight:bold;">*** PAID IN FULL ***</div>`
        }`;
    } else {
      paymentBlock = `
        <div class="d-flex justify-content-between mt-1"><span>Paid (${r.paymentMethod || 'cash'})</span><span>${this.formatCurrency(r.amountPaid)}</span></div>
        <div class="d-flex justify-content-between"><span>Change</span><span>${this.formatCurrency(r.changeAmount || 0)}</span></div>
        ${balance > 0
          ? `<div class="d-flex justify-content-between text-danger fw-bold"><span>BALANCE DUE</span><span>${this.formatCurrency(balance)}</span></div>
             <div class="text-center small text-danger mt-1">Payment Status: ${paymentStatus.toUpperCase()}</div>`
          : `<div class="text-center small text-success mt-1 fw-semibold">PAID IN FULL</div>`
        }`;
    }

    if (forPrint) {
      return `
        <div style="text-align:center;margin-bottom:8px;">
          <div style="font-size:16px;font-weight:bold;">${this.store.name}</div>
          <div style="font-size:11px;">${this.store.address}</div>
          <div style="font-size:11px;">Tel: ${this.store.phone}</div>
        </div>
        <div style="border-top:1px dashed #000;margin:6px 0;"></div>
        <div style="display:flex;justify-content:space-between;font-size:11px;"><span>Receipt #</span><strong>${r.transactionNumber || ''}</strong></div>
        <div style="display:flex;justify-content:space-between;font-size:11px;"><span>Date</span><span>${dateStr}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:11px;"><span>Cashier</span><span>${r.cashierName || ''}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:11px;"><span>Customer</span><span>${r.customerName || 'Walk-in'}</span></div>
        <div style="border-top:1px dashed #000;margin:6px 0;"></div>
        <table style="width:100%;font-size:11px;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left;">Item</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>
        <div style="border-top:1px dashed #000;margin:6px 0;"></div>
        <div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>${this.formatCurrency(r.subtotal)}</span></div>
        ${(r.discountAmount > 0) ? `<div style="display:flex;justify-content:space-between;"><span>Discount</span><span>-${this.formatCurrency(r.discountAmount)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold;margin-top:4px;">
          <span>TOTAL</span><span>${this.formatCurrency(r.totalAmount)}</span>
        </div>
        ${paymentBlock}
        <div style="border-top:1px dashed #000;margin:8px 0;"></div>
        <div style="text-align:center;font-size:11px;">${this.store.footer}</div>
        <div style="text-align:center;font-size:10px;margin-top:4px;">Powered by ProvisionHub</div>
      `;
    }

    // Screen / modal version
    return `
      <div class="text-center mb-3">
        <img src="assets/images/logo.png" alt="Logo" style="width:64px;height:64px;object-fit:contain;border-radius:50%;margin-bottom:6px;"
             onerror="this.style.display='none'">
        <h5 class="mb-0 fw-bold">${this.store.name}</h5>
        <div class="small text-muted">${this.store.address}</div>
        <div class="small text-muted">Tel: ${this.store.phone}</div>
      </div>
      <hr>
      <div class="d-flex justify-content-between small mb-1">
        <span>Receipt #</span><strong>${r.transactionNumber || ''}</strong>
      </div>
      <div class="d-flex justify-content-between small mb-1">
        <span>Date</span><span>${dateStr}</span>
      </div>
      <div class="d-flex justify-content-between small mb-1">
        <span>Cashier</span><span>${r.cashierName || ''}</span>
      </div>
      <div class="d-flex justify-content-between small mb-2">
        <span>Customer</span><span>${r.customerName || 'Walk-in'}</span>
      </div>
      <hr>
      <table class="table table-sm mb-2">
        <thead>
          <tr><th>Item</th><th class="text-center">Qty</th><th class="text-end">Amount</th></tr>
        </thead>
        <tbody>${itemsHTML}</tbody>
      </table>
      <hr>
      <div class="d-flex justify-content-between"><span>Subtotal</span><span>${this.formatCurrency(r.subtotal)}</span></div>
      ${(r.discountAmount > 0) ? `<div class="d-flex justify-content-between text-danger"><span>Discount</span><span>-${this.formatCurrency(r.discountAmount)}</span></div>` : ''}
      <div class="d-flex justify-content-between fw-bold fs-5 mt-1">
        <span>Total</span><span>${this.formatCurrency(r.totalAmount)}</span>
      </div>
      ${paymentBlock}
      <hr>
      <p class="text-center small text-muted mb-0">${this.store.footer}</p>
    `;
  },

  /**
   * Open print window with thermal-friendly receipt
   */
  print(r) {
    const html = this.buildHTML(r, true);
    const win = window.open('', '_blank', 'width=320,height=600');
    if (!win) {
      alert('Please allow pop-ups to print the receipt.');
      return;
    }
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Receipt - ${r.transactionNumber || ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      width: 280px;
      margin: 0 auto;
      padding: 10px;
      color: #000;
      background: #fff;
    }
    table { width: 100%; border-collapse: collapse; }
    th { border-bottom: 1px solid #000; padding-bottom: 2px; }
    td { padding: 2px 0; }
    @media print {
      body { width: 80mm; }
      @page { margin: 0; size: 80mm auto; }
    }
  </style>
</head>
<body>
  ${html}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  <\/script>
</body>
</html>`);
    win.document.close();
  }
};
