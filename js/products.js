// ============================================================
// ProvisionHub - Products & Categories Module
// ============================================================

const Products = {
  allProducts: [],
  allCategories: [],
  currentFilter: {
    search: '',
    categoryId: '',
    status: 'active',
    stock: '' // '', 'low', 'out'
  },

  // ============================================================
  // CATEGORIES
  // ============================================================

  async loadCategories() {
    try {
      const snapshot = await db.collection('categories')
        .orderBy('name', 'asc')
        .get();
      this.allCategories = [];
      snapshot.forEach(doc => {
        this.allCategories.push({ id: doc.id, ...doc.data() });
      });
      return this.allCategories;
    } catch (error) {
      console.error('Load categories error:', error);
      throw error;
    }
  },

  async createCategory({ name, description = '' }) {
    try {
      if (!Auth.hasAnyRole(['admin', 'manager'])) {
        return { success: false, message: 'Permission denied.' };
      }
      const data = {
        name: name.trim(),
        description: description.trim(),
        status: 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: Auth.currentUser.uid
      };
      const ref = await db.collection('categories').add(data);
      await Auth.logAction('category_create', `Created category: ${name}`);
      return { success: true, id: ref.id, message: 'Category created successfully.' };
    } catch (error) {
      console.error(error);
      return { success: false, message: 'Failed to create category.' };
    }
  },

  async updateCategory(id, { name, description, status }) {
    try {
      if (!Auth.hasAnyRole(['admin', 'manager'])) {
        return { success: false, message: 'Permission denied.' };
      }
      await db.collection('categories').doc(id).update({
        name: name.trim(),
        description: (description || '').trim(),
        status: status || 'active',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await Auth.logAction('category_update', `Updated category: ${name}`);
      return { success: true, message: 'Category updated successfully.' };
    } catch (error) {
      return { success: false, message: 'Failed to update category.' };
    }
  },

  async deleteCategory(id, name) {
    try {
      if (!Auth.hasRole('admin')) {
        return { success: false, message: 'Only admins can delete categories.' };
      }
      // Check if any products use this category
      const productsSnap = await db.collection('products')
        .where('categoryId', '==', id)
        .limit(1)
        .get();
      if (!productsSnap.empty) {
        return { success: false, message: 'Cannot delete category that has products. Reassign products first.' };
      }
      await db.collection('categories').doc(id).delete();
      await Auth.logAction('category_delete', `Deleted category: ${name}`);
      return { success: true, message: 'Category deleted.' };
    } catch (error) {
      return { success: false, message: 'Failed to delete category.' };
    }
  },

  // ============================================================
  // PRODUCTS
  // ============================================================

  async loadProducts() {
    try {
      let query = db.collection('products').orderBy('name', 'asc');
      const snapshot = await query.get();
      this.allProducts = [];
      snapshot.forEach(doc => {
        this.allProducts.push({ id: doc.id, ...doc.data() });
      });
      return this.allProducts;
    } catch (error) {
      console.error('Load products error:', error);
      throw error;
    }
  },

  getFilteredProducts() {
    let list = [...this.allProducts];
    const f = this.currentFilter;

    if (f.status) {
      list = list.filter(p => p.status === f.status);
    }
    if (f.categoryId) {
      list = list.filter(p => p.categoryId === f.categoryId);
    }
    if (f.stock === 'low') {
      list = list.filter(p => p.quantity > 0 && p.quantity <= (p.minimumStock || 10));
    } else if (f.stock === 'out') {
      list = list.filter(p => p.quantity <= 0);
    }
    if (f.search) {
      const q = f.search.toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q)
      );
    }
    return list;
  },

  async createProduct(data, imageFile = null) {
    try {
      if (!Auth.hasAnyRole(['admin', 'manager'])) {
        return { success: false, message: 'Permission denied.' };
      }

      let imageUrl = '';
      if (imageFile) {
        const uploadResult = await this.uploadProductImage(imageFile);
        if (!uploadResult.success) return uploadResult;
        imageUrl = uploadResult.url;
      }

      const category = this.allCategories.find(c => c.id === data.categoryId);

      const product = {
        name: data.name.trim(),
        sku: (data.sku || '').trim(),
        barcode: (data.barcode || '').trim(),
        categoryId: data.categoryId || '',
        categoryName: category ? category.name : '',
        brand: (data.brand || '').trim(),
        description: (data.description || '').trim(),
        costPrice: parseFloat(data.costPrice) || 0,
        sellingPrice: parseFloat(data.sellingPrice) || 0,
        wholesalePrice: parseFloat(data.wholesalePrice) || 0,
        quantity: parseInt(data.quantity) || 0,
        minimumStock: parseInt(data.minimumStock) || 10,
        unit: data.unit || 'pcs',
        expiryDate: data.expiryDate ? firebase.firestore.Timestamp.fromDate(new Date(data.expiryDate)) : null,
        supplierId: data.supplierId || null,
        supplierName: data.supplierName || '',
        imageUrl: imageUrl,
        status: data.status || 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: Auth.currentUser.uid
      };

      const ref = await db.collection('products').add(product);

      // Record initial stock movement if quantity > 0
      if (product.quantity > 0) {
        await db.collection('inventory_movements').add({
          productId: ref.id,
          productName: product.name,
          previousQuantity: 0,
          quantityChanged: product.quantity,
          newQuantity: product.quantity,
          movementType: 'stock_in',
          reason: 'Initial stock on product creation',
          referenceId: ref.id,
          referenceType: 'product_create',
          userId: Auth.currentUser.uid,
          userName: Auth.currentUserData.displayName || '',
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      await Auth.logAction('product_create', `Created product: ${product.name}`);
      return { success: true, id: ref.id, message: 'Product created successfully.' };
    } catch (error) {
      console.error(error);
      return { success: false, message: 'Failed to create product.' };
    }
  },

  async updateProduct(id, data, imageFile = null) {
    try {
      if (!Auth.hasAnyRole(['admin', 'manager'])) {
        return { success: false, message: 'Permission denied.' };
      }

      const updates = {
        name: data.name.trim(),
        sku: (data.sku || '').trim(),
        barcode: (data.barcode || '').trim(),
        categoryId: data.categoryId || '',
        brand: (data.brand || '').trim(),
        description: (data.description || '').trim(),
        costPrice: parseFloat(data.costPrice) || 0,
        sellingPrice: parseFloat(data.sellingPrice) || 0,
        wholesalePrice: parseFloat(data.wholesalePrice) || 0,
        minimumStock: parseInt(data.minimumStock) || 10,
        unit: data.unit || 'pcs',
        expiryDate: data.expiryDate ? firebase.firestore.Timestamp.fromDate(new Date(data.expiryDate)) : null,
        supplierId: data.supplierId || null,
        supplierName: data.supplierName || '',
        status: data.status || 'active',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      // Update category name
      const category = this.allCategories.find(c => c.id === updates.categoryId);
      updates.categoryName = category ? category.name : '';

      // Handle image
      if (imageFile) {
        const uploadResult = await this.uploadProductImage(imageFile, id);
        if (!uploadResult.success) return uploadResult;
        updates.imageUrl = uploadResult.url;
      }

      // Note: quantity is NOT updated here — use inventory module for stock changes
      await db.collection('products').doc(id).update(updates);
      await Auth.logAction('product_update', `Updated product: ${updates.name}`);
      return { success: true, message: 'Product updated successfully.' };
    } catch (error) {
      console.error(error);
      return { success: false, message: 'Failed to update product.' };
    }
  },

  async deleteProduct(id, name) {
    try {
      if (!Auth.hasAnyRole(['admin', 'manager'])) {
        return { success: false, message: 'Permission denied.' };
      }
      // Soft delete preferred
      await db.collection('products').doc(id).update({
        status: 'inactive',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await Auth.logAction('product_delete', `Deactivated product: ${name}`);
      return { success: true, message: 'Product deactivated.' };
    } catch (error) {
      return { success: false, message: 'Failed to delete product.' };
    }
  },

  async uploadProductImage(file, productId = null) {
    try {
      // Validate
      if (!file.type.startsWith('image/')) {
        return { success: false, message: 'Only image files are allowed.' };
      }
      if (file.size > 5 * 1024 * 1024) {
        return { success: false, message: 'Image must be less than 5MB.' };
      }

      const ext = file.name.split('.').pop();
      const fileName = `${productId || Date.now()}_${Math.random().toString(36).substr(2, 8)}.${ext}`;
      const path = `products/${productId || 'temp'}/${fileName}`;
      const ref = storage.ref(path);

      await ref.put(file);
      const url = await ref.getDownloadURL();
      return { success: true, url };
    } catch (error) {
      console.error('Upload error:', error);
      return { success: false, message: 'Failed to upload image.' };
    }
  },

  // Helpers
  formatCurrency(amount) {
    return '₦' + Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  getStockBadge(product) {
    const qty = product.quantity || 0;
    const min = product.minimumStock || 10;
    if (qty <= 0) {
      return '<span class="badge bg-danger">Out of Stock</span>';
    } else if (qty <= min) {
      return '<span class="badge bg-warning text-dark">Low Stock</span>';
    }
    return '<span class="badge bg-success">In Stock</span>';
  },

  getExpiryBadge(product) {
    if (!product.expiryDate) return '';
    const expiry = product.expiryDate.toDate ? product.expiryDate.toDate() : new Date(product.expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return '<span class="badge bg-danger ms-1">Expired</span>';
    } else if (diffDays <= 7) {
      return `<span class="badge bg-danger ms-1">Expires in ${diffDays}d</span>`;
    } else if (diffDays <= 30) {
      return `<span class="badge bg-warning text-dark ms-1">Expires in ${diffDays}d</span>`;
    } else if (diffDays <= 60) {
      return `<span class="badge bg-info ms-1">Expires in ${diffDays}d</span>`;
    }
    return '';
  },

  formatDate(timestamp) {
    if (!timestamp) return '—';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleDateString('en-NG');
  }
};