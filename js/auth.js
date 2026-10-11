// ============================================================
// ProvisionHub - Authentication & Authorization Module
// ============================================================

const Auth = {
  currentUser: null,
  currentUserData: null,

  /**
   * Initialize auth state listener
   * Call this on every protected page
   */
  init(requiredRoles = null) {
    return new Promise((resolve, reject) => {
      auth.onAuthStateChanged(async (user) => {
        if (!user) {
          // Not logged in → redirect to login
          if (!window.location.pathname.endsWith('login.html') && 
              !window.location.pathname.endsWith('index.html')) {
            window.location.href = 'login.html';
          }
          resolve(null);
          return;
        }

        try {
          // Fetch user profile from Firestore
          const userDoc = await db.collection('users').doc(user.uid).get();
          
          if (!userDoc.exists) {
            console.error('User document not found in Firestore');
            await auth.signOut();
            window.location.href = 'login.html?error=no_profile';
            resolve(null);
            return;
          }

          const userData = userDoc.data();

          // Check if account is active
          if (userData.status !== 'active') {
            await auth.signOut();
            window.location.href = 'login.html?error=inactive';
            resolve(null);
            return;
          }

          this.currentUser = user;
          this.currentUserData = { uid: user.uid, ...userData };

          // Role-based access control
          if (requiredRoles && Array.isArray(requiredRoles)) {
            if (!requiredRoles.includes(userData.role)) {
              alert('Access denied. You do not have permission to view this page.');
              window.location.href = 'dashboard.html';
              resolve(null);
              return;
            }
          }

          // Update UI with user info
          this.updateUI();

          // Log login (only once per session roughly)
          if (!sessionStorage.getItem('loginLogged')) {
            this.logAction('login', `User logged in: ${userData.email}`);
            sessionStorage.setItem('loginLogged', 'true');
          }

          resolve(this.currentUserData);
        } catch (error) {
          console.error('Auth init error:', error);
          reject(error);
        }
      });
    });
  },

  /**
   * Login with email and password
   */
  async login(email, password) {
    try {
      const result = await auth.signInWithEmailAndPassword(email, password);
      return { success: true, user: result.user };
    } catch (error) {
      let message = 'Login failed. Please try again.';
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = 'Invalid email or password.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled.';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address.';
          break;
      }
      return { success: false, message };
    }
  },

  /**
   * Logout
   */
  async logout() {
    try {
      sessionStorage.removeItem('loginLogged');
      await this.logAction('logout', 'User logged out');
      await auth.signOut();
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = 'login.html';
    }
  },

  /**
   * Send password reset email
   */
  async resetPassword(email) {
    try {
      await auth.sendPasswordResetEmail(email);
      return { success: true, message: 'Password reset email sent. Check your inbox.' };
    } catch (error) {
      let message = 'Failed to send reset email.';
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      }
      return { success: false, message };
    }
  },

  /**
   * Change password (requires recent login)
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      // Re-authenticate
      const credential = firebase.auth.EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await user.reauthenticateWithCredential(credential);

      // Update password
      await user.updatePassword(newPassword);
      await this.logAction('password_change', 'User changed password');
      return { success: true, message: 'Password changed successfully.' };
    } catch (error) {
      let message = 'Failed to change password.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Current password is incorrect.';
      } else if (error.code === 'auth/weak-password') {
        message = 'New password is too weak (min 6 characters).';
      } else if (error.code === 'auth/requires-recent-login') {
        message = 'Please log out and log in again before changing password.';
      }
      return { success: false, message };
    }
  },

  /**
   * Create a new user (Admin only)
   * Creates Auth account + Firestore profile
   */
  async createUser({ email, password, displayName, role, phone = '' }) {
    try {
      // Only admin can create users
      if (!this.hasRole('admin')) {
        return { success: false, message: 'Only administrators can create users.' };
      }

      // Create auth user using secondary app to avoid logging out current user
      // For simplicity in client-side: we use createUserWithEmailAndPassword
      // Note: This will sign in as the new user. We will sign back to admin.
      
      const currentAdmin = auth.currentUser;
      
      // Create the user
      const result = await auth.createUserWithEmailAndPassword(email, password);
      const newUser = result.user;

      // Create Firestore profile
      await db.collection('users').doc(newUser.uid).set({
        uid: newUser.uid,
        email: email,
        displayName: displayName,
        role: role, // admin | manager | cashier
        phone: phone,
        status: 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentAdmin ? currentAdmin.uid : null
      });

      await this.logAction('user_create', `Created user: ${email} (${role})`);

      // Sign out the newly created user and sign admin back in is complex client-side.
      // Better approach: Ask admin to use Firebase Console for first users
      // OR use Cloud Functions (not available here).
      // For now we return success and note that admin may need to re-login.

      return { 
        success: true, 
        message: 'User created successfully. You may need to log in again.',
        uid: newUser.uid 
      };
    } catch (error) {
      let message = 'Failed to create user.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already registered.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password is too weak (minimum 6 characters).';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      }
      return { success: false, message };
    }
  },

  /**
   * Update user profile in Firestore
   */
  async updateProfile(data) {
    try {
      const uid = this.currentUser.uid;
      await db.collection('users').doc(uid).update({
        ...data,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      this.currentUserData = { ...this.currentUserData, ...data };
      this.updateUI();
      await this.logAction('profile_update', 'User updated own profile');
      return { success: true, message: 'Profile updated successfully.' };
    } catch (error) {
      return { success: false, message: 'Failed to update profile.' };
    }
  },

  /**
   * Check if current user has a specific role
   */
  hasRole(role) {
    if (!this.currentUserData) return false;
    return this.currentUserData.role === role;
  },

  /**
   * Check if user has any of the given roles
   */
  hasAnyRole(roles) {
    if (!this.currentUserData) return false;
    return roles.includes(this.currentUserData.role);
  },

  /**
   * Check permission helpers
   */
  canManageUsers() {
    return this.hasRole('admin');
  },

  canManageSettings() {
    return this.hasRole('admin');
  },

  canDeleteProducts() {
    return this.hasAnyRole(['admin', 'manager']);
  },

  canAccessReports() {
    return this.hasAnyRole(['admin', 'manager']);
  },

  canManagePurchases() {
    return this.hasAnyRole(['admin', 'manager']);
  },

  canProcessReturns() {
    return this.hasAnyRole(['admin', 'manager']);
  },

  /**
   * Write to audit log
   */
  async logAction(action, description) {
    try {
      if (!this.currentUser) return;
      await db.collection('audit_logs').add({
        userId: this.currentUser.uid,
        userEmail: this.currentUserData?.email || this.currentUser.email,
        userName: this.currentUserData?.displayName || '',
        action: action,
        description: description,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        userAgent: navigator.userAgent
      });
    } catch (error) {
      console.warn('Failed to write audit log:', error);
    }
  },

  /**
   * Update UI elements with current user info
   */
  updateUI() {
    const nameEls = document.querySelectorAll('[data-user-name]');
    const roleEls = document.querySelectorAll('[data-user-role]');
    const emailEls = document.querySelectorAll('[data-user-email]');

    nameEls.forEach(el => {
      el.textContent = this.currentUserData?.displayName || 'User';
    });
    roleEls.forEach(el => {
      el.textContent = (this.currentUserData?.role || '').toUpperCase();
    });
    emailEls.forEach(el => {
      el.textContent = this.currentUserData?.email || '';
    });

    // Show/hide elements based on role
    document.querySelectorAll('[data-role]').forEach(el => {
      const allowed = el.getAttribute('data-role').split(',');
      if (!this.hasAnyRole(allowed)) {
        el.style.display = 'none';
      }
    });
  },

  /**
   * Get role badge HTML
   */
  getRoleBadge(role) {
    const colors = {
      admin: 'danger',
      manager: 'primary',
      cashier: 'success'
    };
    return `<span class="badge bg-${colors[role] || 'secondary'}">${role}</span>`;
  }
};

// Make logout available globally for onclick handlers
function logout() {
  Auth.logout();
}