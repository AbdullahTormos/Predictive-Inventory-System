import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  Save, 
  X, 
  Edit2, 
  RefreshCw,
  Lock
} from 'lucide-react';
import '../styles/SafetyStockManager.css';

export default function SafetyStockManager({ user }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Form State for Inline Editing
  const [editForm, setEditForm] = useState({
    safety_stock: 0,
    current_stock: 0,
  });

  // Strict check: strictly allow ONLY 'ADMIN'
  const userRole = (user?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN';

  const getToken = () => sessionStorage.getItem('token') || localStorage.getItem('token');

  // Fetch Products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/products', {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError(err.message || 'Failed to load inventory safety parameters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchProducts();
    }
  }, [isAdmin]);

  // Handle Edit Mode Toggle
  const handleEditClick = (product) => {
    setEditingId(product.id);
    setEditForm({
      safety_stock: product.safety_stock ?? 0,
      current_stock: product.current_stock ?? 0,
    });
  };

  // Submit Updated Values to Backend
  const handleSave = async (id) => {
    try {
      const token = getToken();

      if (!token) {
        throw new Error('No authentication token found. Please sign in again.');
      }

      const payload = {
        safety_stock: Math.max(0, parseInt(editForm.safety_stock, 10) || 0),
        current_stock: Math.max(0, parseInt(editForm.current_stock, 10) || 0),
      };

      const res = await fetch(`/api/admin/products/${id}/safety-stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update safety parameters.');

      // Update UI state locally upon success
      setProducts((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                safety_stock: payload.safety_stock,
                current_stock: payload.current_stock,
              }
            : item
        )
      );
      setEditingId(null);
    } catch (err) {
      alert(`Update Error: ${err.message}`);
    }
  };

  // Guard Clause: Block access if user is not strictly an Admin
  if (!isAdmin) {
    return (
      <div className="ss-restricted-card">
        <div className="ss-restricted-icon">
          <Lock size={36} />
        </div>
        <div>
          <h2 className="ss-restricted-title">Access Restricted</h2>
          <p className="ss-restricted-desc">
            You do not have system administrative privileges to view or manage safety stock policies.
          </p>
        </div>
      </div>
    );
  }

  // Search Filtering
  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.sku?.toLowerCase().includes(term) ||
      p.name?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="ss-container">
      {/* Admin Header Section */}
      <header className="ss-header">
        <div>
          <div className="ss-header-title-wrapper">
            <div className="ss-header-icon">
              <Sliders size={22} />
            </div>
            <h1 className="ss-header-title">Safety Stock Policy Manager</h1>
          </div>
          <p className="ss-header-subtitle">
            Configure minimum safety buffers and current stock counts across all catalog items.
          </p>
        </div>

        {/* Search Bar */}
        <div className="ss-search-wrapper">
          <Search className="ss-search-icon" size={16} />
          <input
            type="text"
            placeholder="Search SKU, Name, or Category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ss-search-input"
          />
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="ss-alert-error">
          <span>{error}</span>
          <button onClick={fetchProducts} className="ss-retry-btn">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Products Inventory Table */}
      <section className="ss-table-card">
        {loading ? (
          <div className="ss-state-box">
            <RefreshCw className="ss-spin" size={24} />
            <span>Syncing database stock parameters...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="ss-state-box">
            <span>No matching inventory records found.</span>
          </div>
        ) : (
          <div className="ss-table-responsive">
            <table className="ss-table">
              <thead>
                <tr>
                  <th>SKU / Product</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Current Stock</th>
                  <th style={{ textAlign: 'center' }}>Safety Stock Buffer</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const isEditing = editingId === p.id;
                  const current = isEditing ? (parseInt(editForm.current_stock, 10) || 0) : p.current_stock;
                  const safety = isEditing ? (parseInt(editForm.safety_stock, 10) || 0) : p.safety_stock;

                  const isCritical = current <= safety;

                  return (
                    <tr key={p.id} className={isCritical ? 'ss-row-critical' : ''}>
                      {/* Product Name & SKU */}
                      <td>
                        <div className="ss-product-name">{p.name || p.sku}</div>
                        <div className="ss-product-sku">#{p.sku || p.id}</div>
                      </td>

                      {/* Category */}
                      <td>
                        <span className="ss-category-tag">
                          {p.category || 'General'}
                        </span>
                      </td>

                      {/* Current Stock */}
                      <td style={{ textAlign: 'center' }}>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editForm.current_stock}
                            onChange={(e) => setEditForm({ ...editForm, current_stock: e.target.value })}
                            className="ss-input-edit"
                          />
                        ) : (
                          <span className={`ss-stock-val ${isCritical ? 'ss-stock-critical' : 'ss-stock-normal'}`}>
                            {p.current_stock ?? 0}
                          </span>
                        )}
                      </td>

                      {/* Safety Stock Buffer */}
                      <td style={{ textAlign: 'center' }}>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editForm.safety_stock}
                            onChange={(e) => setEditForm({ ...editForm, safety_stock: e.target.value })}
                            className="ss-input-edit"
                          />
                        ) : (
                          <span className="ss-buffer-badge">
                            {p.safety_stock ?? 0}
                          </span>
                        )}
                      </td>

                      {/* Status Tag */}
                      <td style={{ textAlign: 'center' }}>
                        {isCritical ? (
                          <span className="ss-status-badge ss-status-critical">
                            <ShieldAlert size={12} /> Below Safety
                          </span>
                        ) : (
                          <span className="ss-status-badge ss-status-optimal">
                            <CheckCircle2 size={12} /> Optimal
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        {isEditing ? (
                          <div className="ss-action-group">
                            <button
                              onClick={() => handleSave(p.id)}
                              className="ss-btn-save"
                              title="Save Changes"
                            >
                              <Save size={14} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="ss-btn-cancel"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditClick(p)}
                            className="ss-btn-adjust"
                          >
                            <Edit2 size={13} /> Adjust
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}