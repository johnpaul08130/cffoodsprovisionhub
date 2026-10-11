// ============================================================
// ProvisionHub - Shared Layout (Sidebar + Topbar)
// ============================================================

const Layout = {
  /**
   * Render the sidebar and topbar into the page
   * Call this after Auth.init() succeeds
   */
  render(activePage = '') {
    const user = Auth.currentUserData || {};
    const role = user.role || 'cashier';

    // Sidebar HTML
    const sidebarHTML = `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <i class="fas fa-store"></i>
          <span>CF Food & Bev</span>
        </div>
        <nav class="sidebar-nav">
          <a href="dashboard.html" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">
            <i class="fas fa-tachometer-alt"></i> Dashboard
          </a>
          <a href="pos.html" class="nav-link ${activePage === 'pos' ? 'active' : ''}">
            <i class="fas fa-cash-register"></i> Point of Sale
          </a>
          <a href="products.html" class="nav-link ${activePage === 'products' ? 'active' : ''}">
            <i class="fas fa-box"></i> Products
          </a>
          <a href="inventory.html" class="nav-link ${activePage === 'inventory' ? 'active' : ''}">
            <i class="fas fa-warehouse"></i> Inventory
          </a>
          <a href="sales.html" class="nav-link ${activePage === 'sales' ? 'active' : ''}">
            <i class="fas fa-shopping-cart"></i> Sales
          </a>
          <a href="purchases.html" class="nav-link ${activePage === 'purchases' ? 'active' : ''}" data-role="admin,manager">
            <i class="fas fa-truck"></i> Purchases
          </a>
          <a href="customers.html" class="nav-link ${activePage === 'customers' ? 'active' : ''}">
            <i class="fas fa-users"></i> Customers
          </a>
          <a href="suppliers.html" class="nav-link ${activePage === 'suppliers' ? 'active' : ''}" data-role="admin,manager">
            <i class="fas fa-industry"></i> Suppliers
          </a>
          <a href="expenses.html" class="nav-link ${activePage === 'expenses' ? 'active' : ''}" data-role="admin,manager">
            <i class="fas fa-money-bill-wave"></i> Expenses
          </a>
          <a href="returns.html" class="nav-link ${activePage === 'returns' ? 'active' : ''}" data-role="admin,manager">
            <i class="fas fa-undo"></i> Returns
          </a>
          <a href="reports.html" class="nav-link ${activePage === 'reports' ? 'active' : ''}" data-role="admin,manager">
            <i class="fas fa-chart-bar"></i> Reports
          </a>
          <a href="users.html" class="nav-link ${activePage === 'users' ? 'active' : ''}" data-role="admin">
            <i class="fas fa-user-shield"></i> Users
          </a>
          <a href="settings.html" class="nav-link ${activePage === 'settings' ? 'active' : ''}" data-role="admin">
            <i class="fas fa-cog"></i> Settings
          </a>
        </nav>
        <div class="sidebar-footer">
          <div class="d-flex align-items-center gap-2">
            <div class="rounded-circle bg-success d-flex align-items-center justify-content-center" 
                 style="width:36px;height:36px;font-size:0.9rem;">
              ${(user.displayName || 'U').charAt(0).toUpperCase()}
            </div>
            <div class="overflow-hidden">
              <div class="text-white small fw-semibold text-truncate" data-user-name>${user.displayName || 'User'}</div>
              <div class="text-white-50" style="font-size:0.7rem;" data-user-role>${(role || '').toUpperCase()}</div>
            </div>
          </div>
        </div>
      </aside>
      <div class="sidebar-overlay" id="sidebarOverlay"></div>
    `;

    // Topbar HTML
    const topbarHTML = `
      <header class="topbar">
        <div class="d-flex align-items-center gap-3">
          <button class="sidebar-toggle" id="sidebarToggle">
            <i class="fas fa-bars"></i>
          </button>
          <div>
            <h5 class="mb-0 fw-semibold" id="pageTitle">Dashboard</h5>
            <small class="text-muted">CF Food and Beverages</small>
          </div>
        </div>
        <div class="d-flex align-items-center gap-3">
          <div class="dropdown">
            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
              <i class="fas fa-user-circle me-1"></i>
              <span data-user-name>${user.displayName || 'User'}</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#profileModal">
                <i class="fas fa-user me-2"></i> My Profile
              </a></li>
              <li><a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#changePasswordModal">
                <i class="fas fa-key me-2"></i> Change Password
              </a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item text-danger" href="#" onclick="logout()">
                <i class="fas fa-sign-out-alt me-2"></i> Logout
              </a></li>
            </ul>
          </div>
        </div>
      </header>
    `;

    // Profile Modal
    const profileModalHTML = `
      <div class="modal fade" id="profileModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">My Profile</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="profileForm">
                <div class="mb-3">
                  <label class="form-label">Full Name</label>
                  <input type="text" class="form-control" id="profileName" value="${user.displayName || ''}" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control" value="${user.email || ''}" disabled>
                </div>
                <div class="mb-3">
                  <label class="form-label">Phone</label>
                  <input type="text" class="form-control" id="profilePhone" value="${user.phone || ''}">
                </div>
                <div class="mb-3">
                  <label class="form-label">Role</label>
                  <input type="text" class="form-control" value="${(user.role || '').toUpperCase()}" disabled>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-success" id="saveProfileBtn">Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Change Password Modal
    const passwordModalHTML = `
      <div class="modal fade" id="changePasswordModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Change Password</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div id="passwordAlert" class="alert d-none"></div>
              <form id="changePasswordForm">
                <div class="mb-3">
                  <label class="form-label">Current Password</label>
                  <input type="password" class="form-control" id="currentPassword" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">New Password</label>
                  <input type="password" class="form-control" id="newPassword" minlength="6" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Confirm New Password</label>
                  <input type="password" class="form-control" id="confirmPassword" minlength="6" required>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-success" id="savePasswordBtn">Update Password</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Insert into page
    const container = document.getElementById('app');
    if (container) {
      container.insertAdjacentHTML('afterbegin', sidebarHTML + `
        <div class="main-content">
          ${topbarHTML}
          <div class="page-content" id="pageContent">
            <!-- Page content goes here -->
          </div>
        </div>
        ${profileModalHTML}
        ${passwordModalHTML}
      `);
    }

    // Move existing page content into pageContent
    const existingContent = document.getElementById('content');
    const pageContent = document.getElementById('pageContent');
    if (existingContent && pageContent) {
      pageContent.appendChild(existingContent);
      existingContent.style.display = 'block';
    }

    // Sidebar toggle for mobile
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggle) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('show');
        overlay.classList.toggle('show');
      });
    }
    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
      });
    }

    // Profile save
    document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
      const name = document.getElementById('profileName').value.trim();
      const phone = document.getElementById('profilePhone').value.trim();
      if (!name) return alert('Name is required');

      const btn = document.getElementById('saveProfileBtn');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      const result = await Auth.updateProfile({ displayName: name, phone });
      alert(result.message);
      btn.disabled = false;
      btn.textContent = 'Save Changes';

      if (result.success) {
        bootstrap.Modal.getInstance(document.getElementById('profileModal'))?.hide();
      }
    });

    // Change password
    document.getElementById('savePasswordBtn')?.addEventListener('click', async () => {
      const current = document.getElementById('currentPassword').value;
      const newPass = document.getElementById('newPassword').value;
      const confirm = document.getElementById('confirmPassword').value;
      const alertBox = document.getElementById('passwordAlert');

      if (newPass !== confirm) {
        alertBox.className = 'alert alert-danger';
        alertBox.textContent = 'New passwords do not match.';
        alertBox.classList.remove('d-none');
        return;
      }
      if (newPass.length < 6) {
        alertBox.className = 'alert alert-danger';
        alertBox.textContent = 'Password must be at least 6 characters.';
        alertBox.classList.remove('d-none');
        return;
      }

      const btn = document.getElementById('savePasswordBtn');
      btn.disabled = true;
      btn.textContent = 'Updating...';

      const result = await Auth.changePassword(current, newPass);

      alertBox.className = `alert alert-${result.success ? 'success' : 'danger'}`;
      alertBox.textContent = result.message;
      alertBox.classList.remove('d-none');

      btn.disabled = false;
      btn.textContent = 'Update Password';

      if (result.success) {
        document.getElementById('changePasswordForm').reset();
        setTimeout(() => {
          bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'))?.hide();
        }, 1500);
      }
    });

    // Apply role-based visibility
    Auth.updateUI();
  },

  setPageTitle(title) {
    const el = document.getElementById('pageTitle');
    if (el) el.textContent = title;
  }
};